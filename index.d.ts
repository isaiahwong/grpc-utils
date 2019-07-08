/** Declaration file generated by dts-gen */

export class GrpcClient {
  /**
   * @constructor
   * @param {*} protoPath
   * @param {*} options
   * @param {Number} options.retryDuration ms
   * @param {String} options.serviceURL grpc server url
   * @param {String} options.rpcMaxRetries max number of rpc call retries
   * @param {String} options.rpcRetryInterval interval before rpc retries connection
   */
    constructor(protoPath: any, options: Object);

    createRequest(id: any): any;

    resolveRequest(id: any): void;

    testConnection(cb: any): any;

}

export function decodeArrayMetadata(...args: any[]): any;

export function encodeArrayMetadata(...args: any[]): any;

export function load(filename: any, options: any): any;

export function loadSync(filename: any, options: any): any;

export namespace grpcLoader {
    function loadProto(fileName: any, include: any): any;

    function loadProtos(...args: any[]): void;

}

