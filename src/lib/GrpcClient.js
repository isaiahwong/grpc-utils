import grpc from 'grpc';
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
   * @param {*} options
   * @param {String} options.serviceURL grpc server url
   * @param {Number} options.deadline ms
   * @param {Number} options.rpcMaxRetries max number of rpc call retries
   * @param {Number} options.rpcRetryInterval ms interval before rpc retries connection
   */
  constructor(protoPath, options = {}) {
    const {
      deadline = Number.POSITIVE_INFINITY, // Seconds
      rpcMaxRetries = 5,
      rpcRetryInterval = 1500
    } = options;

    let { serviceURL } = options;

    if (!protoPath) {
      throw new InternalServerError('Proto path undefined');
    }

    const proto = grpcLoader.loadProto(protoPath);

    if (!proto) {
      throw new InternalServerError(`Error loading ${protoPath}`);
    }

    const pkg = Object.keys(proto)[0];
    if (!pkg) {
      throw new InternalServerError(`No package defined in ${protoPath}`);
    }

    const service = Object.keys(proto[pkg])[0];
    if (!service) {
      throw new InternalServerError(`No service defined in ${protoPath}`);
    }
    serviceURL = serviceURL || `${service.toLowerCase()}:50051`;

    const rpcDefs = proto[pkg][service].service;
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
    this.client = GrpcClient._loadClient(proto, pkg, service, serviceURL);

    this._genFnDef();
    this._setupConnectionMiddleware();

    this._waitForReady();
    this.counter = 0;
  }

  static _loadClient(proto, _package, service, serviceURL) {
    if (!proto || !proto[_package] || !proto[_package][service]) {
      throw new InternalServerError(`Error loading ${service} from proto`);
    }
    const client = new proto[_package][service](
      serviceURL,
      grpc.credentials.createInsecure()
    );

    if (!client) {
      throw new InternalServerError(`Error instantiating ${service} client`);
    }
    return client;
  }

  /**
   * Generates `function` definitions from rpc service defined in proto.
   * Functions will be genereted for `GrpcClient` or `inherited` classes.
   * Each function call is wrapped with a `Promise` closure.
   */
  _genFnDef(rpcDefs = this.rpcDefs) {
    rpcDefs.forEach((fnDef) => {
      GrpcClient.prototype[fnDef] = (...args) => new Promise((resolve, reject) => {
        if (!args[0]) {
          // eslint-disable-next-line no-param-reassign
          args[0] = {};
        }
        this.client[fnDef](...args, (err, res) => {
          if (err) {
            if (err.metadata && err.metadata.get && err.metadata.get('errors').length) {
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

  /**
   * `_setupConnectionMiddleware` ensures that `testConnection` will be called before
   * each grpc call to check if client connection is up. It iterates the rpcDefs defined
   * in class and calls `testConnection` before each rpc function is called.
   */
  _setupConnectionMiddleware(rpcDefs = this.rpcDefs) {
    rpcDefs.forEach((key) => {
      const initialFn = this[key].bind(this);
      this[key] = (...args) => this.testConnection(() => initialFn(...args));
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
  testConnection(cb) {
    return new Promise((resolve, reject) => {
      const fn = (existingRequest) => {
        const request = this.createRequest(existingRequest);
        const channel = this.client.getChannel();
        const state = channel.getConnectivityState(true);
        request.retry();

        if (state === grpc.connectivityState.READY) {
          this.resolveRequest(request);
          return (cb && resolve(cb())) || undefined;
        }
        if (request.retries >= request.maxRetries) {
          const err = new ServiceUnavailable(`${this.service} unreachable. Max tries: ${request.maxRetries}`);
          this.resolveRequest(request);
          return reject(err);
        }
        setTimeout(() => fn(request), this.rpcRetryInterval);
        return null;
      };
      fn();
    });
  }

  _waitForReady() {
    this.client.waitForReady(this.deadline, (err) => {
      if (err) {
        throw new InternalServerError(err);
      }
      logger.info(`Connected to ${this.service}`);
      this.ready = true;
    });
  }
}

export default GrpcClient;
