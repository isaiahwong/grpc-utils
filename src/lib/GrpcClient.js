import * as grpc from '@grpc/grpc-js';
import logger from 'esther';
import { InternalServerError, ServiceUnavailable } from 'horeb';

import grpcLoader from './grpcLoader';
import { decodeMetadata } from '../utils/grpc';

/**
 * `GrpcClient` is a client helper class that connects to rpc servers.
 * GrpcClient should only process one service
 */
class GrpcClient {
  /**
   * @constructor
   * @param {*} protoPath
   * @param {String} packageDef
   * @param {*} options
   * @param {Array}  options.includeDirs Paths to search for imported `.proto` files.
   * @param {String} options.serviceURL grpc server url
   * @param {Number} options.deadline ms
   * @param {Number} options.rpcMaxRetries max number of rpc call retries
   * @param {Number} options.rpcRetryInterval ms interval before rpc retries connection
   * @param {Number} options.rpcDeadline epoch rpc deadline i.e Date.now() + 1000
   */
  constructor(protoPath, packageDef, options = {}) {
    const {
      includeDirs,
      deadline = Number.POSITIVE_INFINITY, // Seconds
      rpcMaxRetries = 5,
      rpcRetryInterval = 1500,
      rpcDeadline = 15000
    } = options;

    logger.init({
      disableStackTrace: true
    });

    let { serviceURL } = options;
    if (!protoPath) {
      throw new InternalServerError('protoPath undefined');
    }
    if (!packageDef) {
      throw new InternalServerError('packageDef undefined.');
    }

    const proto = (!includeDirs || !includeDirs.length)
      ? grpcLoader.loadProto(protoPath)
      : grpcLoader.loadProto(protoPath, includeDirs);
    if (!proto) {
      throw new InternalServerError(`Error loading ${protoPath}`);
    }

    let depth = proto;
    const packageArr = packageDef.split('.');
    // Separates grpc.loadPackageDefinition nested structure
    packageArr.forEach((p) => {
      if (depth[p]) {
        depth = depth[p];
      }
    });

    const service = Object.keys(depth)[0];
    if (!service || !depth[service] || !depth[service].service) {
      throw new InternalServerError(`No service defined in ${protoPath}. Hint: Check your package Definition`);
    }
    // Fall back to naming convention of service definition
    serviceURL = serviceURL || `${packageArr.join('-')}-${service.toLowerCase()}:50051`;

    const rpcDefs = depth[service].service;
    if (Object.keys(rpcDefs) === 0) {
      throw new InternalServerError(`rpc definitions is not defined for ${protoPath}`);
    }

    this.testConnection = this.testConnection.bind(this);

    // retrieves camelCased function identifiers
    this.rpcDefs = Object.keys(rpcDefs).map(key => rpcDefs[key].originalName);
    this.requests = {};
    this.service = service;
    this.deadline = deadline;
    this.rpcMaxRetries = rpcMaxRetries;
    this.rpcRetryInterval = rpcRetryInterval;
    this.rpcDeadline = rpcDeadline;
    this.client = GrpcClient._loadClient(depth, service, serviceURL);

    this._genFnDef();
    this._setupConnectionMiddleware();
  }

  static _loadClient(proto, service, serviceURL) {
    if (!proto || !proto[service]) {
      throw new InternalServerError(`Error loading ${service} from proto`);
    }
    const client = new proto[service](
      serviceURL,
      grpc.credentials.createInsecure()
    );

    if (!client) {
      throw new InternalServerError(`Error instantiating ${service} client`);
    }
    return client;
  }

  static recordStartTime() {
    return process.hrtime();
  }

  static getResponseTime(start) {
    if (!start) {
      return '';
    }
    const end = process.hrtime(start);
    const nanoseconds = (end[0] * 1e9) + end[1];
    return nanoseconds / 1e6;
  }

  set verbose(bool) {
    this._verbose = !!bool;
  }

  /**
   * Generates `function` definitions from rpc service defined in proto.
   * Functions will be genereted for `GrpcClient` or `inherited` classes.
   * Each function call is wrapped with a `Promise` closure.
   */
  _genFnDef(rpcDefs = this.rpcDefs) {
    rpcDefs.forEach((fnDef) => {
      GrpcClient.prototype[fnDef] = (...args) => new Promise((resolve, reject) => {
        // params
        if (!args[0]) {
          // eslint-disable-next-line no-param-reassign
          args[0] = {};
        }
        // options
        if (!args[2]) {
          // eslint-disable-next-line no-param-reassign
          args[2] = {};
        }
        if (!args[2].deadline) {
          // eslint-disable-next-line no-param-reassign
          args[2].deadline = Date.now() + this.rpcDeadline;
        }

        this.client[fnDef](...args, (err, res) => {
          if (err) {
            if (err.metadata && err.metadata.get && err.metadata.get('errors-bin').length) {
              try {
                const errors = decodeMetadata('errors', err.metadata);
                // eslint-disable-next-line no-param-reassign
                err.errors = errors;
                return reject(err);
              }
              catch (parseErr) {
                return reject(new InternalServerError(parseErr.message));
              }
            }
            return reject(err);
          }
          return resolve(res);
        });
      });
    });
  }

  /**
   * `_setupConnectionMiddleware` ensures that `testConnection` will be called before
   * each grpc call to check if client connection is up. It iterates the rpcDefs defined
   * in class and calls `testConnection` before each rpc function is called.
   */
  _setupConnectionMiddleware(rpcDefs = this.rpcDefs) {
    rpcDefs.forEach((key) => {
      const initialFn = this[key].bind(this);
      this[key] = (...args) => this.testConnection((extend) => {
        const options = args[2];
        if (extend
          && options
          && options.deadline
          && typeof options.deadline === 'number'
        ) {
          // extends grpc calld deadline
          // eslint-disable-next-line no-param-reassign
          args[2].deadline += extend;
        }
        return initialFn(...args);
      });
    });
  }

  createRequest(request) {
    let _id = request && request.id;
    if (!this.requests[_id]) {
      _id = Math.random().toString(36).substr(2, 9);
      this.requests[_id] = {
        id: _id,
        maxRetries: this.rpcMaxRetries,
        retries: 0,
        retry() {
          this.retries += 1;
        }
      };
    }
    return this.requests[_id];
  }

  resolveRequest(request) {
    delete this.requests[request && request.id];
  }

  /**
   * testConnection
   * @param {*} cb
   * @returns {Promise} resolves callback
   */
  async testConnection(cb) {
    if (!cb || typeof cb !== 'function') {
      return null;
    }
    try {
      if (!this.ready) {
        const err = new Error('Connection is not ready');
        throw err;
      }
      const res = await cb();
      return res;
    }
    catch (err) {
      if (err.code !== grpc.status.UNAVAILABLE) {
        throw err;
      }
      logger.error(err, { isHandledError: true });
      logger.warn('Will try to reconnect');
      const start = GrpcClient.recordStartTime();

      return new Promise((resolve, reject) => {
        const connect = (existingRequest) => {
          const request = this.createRequest(existingRequest);
          const channel = this.client.getChannel();
          const state = channel.getConnectivityState(true);

          if (state === grpc.connectivityState.READY) {
            this.resolveRequest(request);
            // extends grpc call deadline
            const extend = GrpcClient.getResponseTime(start);
            return (cb && resolve(cb(extend))) || undefined;
          }
          // Increments request retries
          request.retry();
          if (this._verbose) logger.info(request);
          if (request.retries >= request.maxRetries) {
            const unavailableErr = new ServiceUnavailable(`${this.service} unreachable. Max tries: ${request.maxRetries}`);
            this.resolveRequest(request);
            return reject(unavailableErr);
          }
          // calls fn recursively
          setTimeout(() => connect(request), this.rpcRetryInterval);
          return null;
        };
        connect();
      });
    }
  }

  connect() {
    return new Promise((accept, reject) => {
      this.client.waitForReady(Date.now() + this.deadline, (err) => {
        if (err) {
          reject(err);
          return;
        }
        logger.info(`Connected to ${this.service}`);
        this.ready = true;
        accept();
      });
    });
  }

  /**
  * Setup a fns to be called before each grpc call
  * @param {*} proto
  * @param {Object} options
  * @param {String} options._package Proto package name
  * @param {String} options.service Proto service name
  * @param {Array} options.middlewares Middleware fns
  * @param {Array} options.fnAddOns Additional fns that you want to include to middleware
  */
  // _setupMiddleware(proto, options) {
  //   let { fnAddOns, middlewares } = options;

  //   fnAddOns = fnAddOns || [];
  //   middlewares = middlewares || [];
  //   // Only apply middleware to grpc fns call
  //   const fns = [
  //     intersection(GrpcClient.getAllPropertyNames(this), this.fnsDef),
  //     ...fnAddOns
  //   ];

  //   middlewares = middlewares
  //     .filter(fn => typeof fn === 'function')
  //     .map(fn => fn.bind(this));

  //   fns.forEach((key) => {
  //     const initialFn = this[key].bind(this);
  //     this[key] = function mixin() {
  //       middlewares.forEach(fn => fn());
  //       // eslint-disable-next-line prefer-rest-params
  //       return initialFn.apply(this, arguments);
  //     };
  //   });
  // }
}

export default GrpcClient;
