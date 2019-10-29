import '@babel/polyfill';
import * as library from './lib';
import * as grpcUtils from './utils/grpc';

export default {
  ...library,
  ...grpcUtils
};
