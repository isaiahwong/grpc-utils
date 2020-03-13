import logger from 'esther';
import GrpcClient from '../src/lib/GrpcClient';

const PROTO = `${__dirname}/../proto/api`;
const INCLUDES = [
  PROTO,
  `${__dirname}/../proto/third_party/googleapis`,
];
class Service extends GrpcClient {
  constructor() {
    super(
      `${PROTO}/accounts/v1/accounts.proto`,
      'api.accounts.v1',
      {
        serviceURL: '127.0.0.1:50051',
        includeDirs: INCLUDES,
        deadline: 2000
      }
    );
  }
}


const service = new Service();

function test() {
  service.testConnection(() => {
    console.log('done');
  }).catch(err => logger.error(err));
}

// Try rpc method
// Set deadline for each call
// catch failed to connect
// testconnection
// kill connection


setTimeout(() => test(), 2000);
