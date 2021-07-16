import fs from 'fs';
import * as grpc from '@grpc/grpc-js';
import { InternalServerError } from 'horeb';

import * as protoLoader from './protoLoader';

function appendTrailingSlash(str = '') {
  let _str = str;
  if (str.charAt(str.length - 1) !== '/') {
    _str = `${str}/`;
  }
  return _str;
}

function loadProto(filePath, includeDirs) {
  const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  };

  if (!fs.statSync(filePath).isFile()) {
    throw new InternalServerError('proto file not found');
  }

  if (Array.isArray(includeDirs) && includeDirs.length) {
    options.includeDirs = [...includeDirs];
  }

  const packageDefinition = protoLoader.loadSync(
    filePath,
    options
  );
  return grpc.loadPackageDefinition(packageDefinition);
}

/**
 * Loads proto files
 * @param {Array} protos adds proto by reference
 * @param {String} filePath Dir
 * @param {Array} includeDirs Paths to search for imported `.proto` files.
 */
function loadProtos(protos = [], filePath, includeDirs) {
  fs
    .readdirSync(filePath)
    .forEach((fileName) => {
      const fullPath = appendTrailingSlash(filePath) + fileName;
      if (!fs.statSync(fullPath).isFile()) { // Folder
        loadProtos(protos, fullPath, includeDirs);
      }
      else if (fileName.match(/\.proto$/) && !filePath.match(/third_party/)) { // exclude third party
        const proto = (!includeDirs || !includeDirs.length)
          ? loadProto(fullPath)
          : loadProto(fullPath, includeDirs);
        protos.push(proto);
      }
    });
}

const grpcInterface = {
  loadProtos,
  loadProto
};

export default grpcInterface;
