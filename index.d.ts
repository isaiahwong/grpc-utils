export class GrpcClient {
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
    constructor(protoPath: any, packageDef: string, options: Object);

    createRequest(id: any): any;

    resolveRequest(id: any): void;

    testConnection(cb: any): any;

}

export function decodeArrayMetadata(...args: any[]): any;

export function encodeArrayMetadata(...args: any[]): any;

export function decodeMetadata(...args: any[]): any;

export function encodeMetadata(...args: any[]): any;

export function load(filename: any, options: any): any;

export function loadSync(filename: any, options: any): any;

export namespace grpcLoader {
    /**
     * Loads proto file
     * @param {String} fileName 
     * @param {Array} filePath Dir
     * @returns {Object} proto
     */ 
    function loadProto(fileName: string, include: string[]): any;

    /**
     * Loads proto files
     * @param {Array} protos adds proto by reference
     * @param {String} filePath Dir
     * @param {Array}  options.includeDirs Paths to search for imported `.proto` files.
     */
    function loadProtos(protos: string[], filePath: string, relativeInclude: string[]): void;

}

