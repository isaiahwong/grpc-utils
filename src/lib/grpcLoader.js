import fs from 'fs';
import grpc from 'grpc';
import { InternalServerError } from 'horeb';

import * as protoLoader from './protoLoader';

function loadProto(filePath, include) {
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

  if (Array.isArray(include) && include.length) {
    options.includeDirs = [...include];
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
 * @param {Array} relativeInclude Directory has to be relative to where it is being loaded from
 */
function loadProtos(protos = [], filePath, relativeInclude) {
  fs
    .readdirSync(filePath)
    .forEach((fileName) => {
      if (!fs.statSync(filePath + fileName).isFile()) { // Folder
        loadProtos(protos, `${filePath}${fileName}/`, relativeInclude);
      }
      else if (fileName.match(/\.proto$/) && !filePath.match(/third_party/)) { // exclude third party
        const proto = (!relativeInclude || !relativeInclude.length)
          ? loadProto(filePath + fileName)
          : loadProto(filePath + fileName, relativeInclude);
        protos.push(proto);
      }
    });
}

const grpcInterface = {
  loadProtos,
  loadProto
};

export default grpcInterface;
