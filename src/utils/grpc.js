import grpc from 'grpc';
import logger from 'esther';

import { InternalServerError } from 'horeb';

/**
 * Encodes array to Buffer
 * For storing data in grpc.Metadata
 * @param {String} key key that maps to value
 * @param {Array} arr array to be encoded
 */
export function encodeArrayMetadata(key = 'data', arr) {
  if (!Array.isArray(arr)) {
    throw new InternalServerError('Arg supplied is not an array');
  }

  const metadata = new grpc.Metadata();
  arr.forEach((detail, i) => {
    if (i) {
      metadata.add(`${key}-bin`, Buffer.from(JSON.stringify(detail)));
    }
    else {
      metadata.set(`${key}-bin`, Buffer.from(JSON.stringify(detail)));
    }
  });

  return metadata;
}

/**
 * Decodes array to Buffer
 * For storing data in grpc.Metadata
 * @param {String} key that maps to value
 * @param {grpc.Metadata} metadata to be decoded
 */
export function decodeArrayMetadata(key = 'data', metadata) {
  if (!(metadata instanceof grpc.Metadata)) {
    throw new InternalServerError('Arg supplied is not of type grpc.Metadata');
  }

  const details = metadata.get(`${key}-bin`);
  if (!Array.isArray(details)) {
    logger.warn('key value is not an array');
    return [];
  }

  return details.map(detail => JSON.parse(detail.toString()));
}
