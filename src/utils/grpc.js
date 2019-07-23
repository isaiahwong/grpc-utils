import grpc from 'grpc';
import logger from 'esther';

import { InternalServerError } from 'horeb';

/**
 * Encodes array to Buffer
 * For storing data in grpc.Metadata
 * @param {String} key key that maps to value
 * @param {Any} data data to be encoded
 */
export function encodeMetadata(key = 'data', obj) {
  if (!Buffer.isBuffer(obj)) {
    throw new InternalServerError('Object is of type buffer | byte');
  }

  const metadata = new grpc.Metadata();
  metadata.set(`${key}-bin`, Buffer.from(JSON.stringify(obj)));

  return metadata;
}

/**
 * Decodes array to Buffer
 * For storing data in grpc.Metadata
 * @param {String} key that maps to value
 * @param {grpc.Metadata} metadata to be decoded
 */
export function decodeMetadata(key = '', metadata) {
  if (!(metadata instanceof grpc.Metadata)) {
    throw new InternalServerError('Arg supplied is not of type grpc.Metadata');
  }
  const data = metadata.get(`${key}-bin`);
  return JSON.parse(data.toString());
}

/**
 * Encodes array to Buffer
 * For storing data in grpc.Metadata
 * @param {String} key key that maps to value
 * @param {Array} arr array to be encoded
 */
export function encodeArrayMetadata(key = 'data', arr) {
  logger.warn('encodeArrayMetadata is deprecated. Use encodeMetadata Instead');
  return encodeMetadata(key, arr);
}

/**
 * Decodes array to Buffer
 * For storing data in grpc.Metadata
 * @param {String} key that maps to value
 * @param {grpc.Metadata} metadata to be decoded
 */
export function decodeArrayMetadata(key = 'data', metadata) {
  logger.warn('decodeArrayMetadata is deprecated. Use decodeMetadata Instead');
  return decodeMetadata(key, metadata);
}
