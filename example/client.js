import logger from 'esther';
import grpc from 'grpc';
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

async function test() {
  await service.connect();
  service.testConnection(() => {
    console.log('done');
  }).catch(err => logger.error(err));

  const metadata = new grpc.Metadata();
  metadata.set('test', 'hi');
  service.signUp({}, metadata).catch(err => console.log(err));
}

// Try rpc method
// Set deadline for each call
// catch failed to connect
// testconnection
// kill connection


setTimeout(() => test(), 2000);
