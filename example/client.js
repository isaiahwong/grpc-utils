import logger from 'esther';
import path from 'path';
import GrpcClient from '../src/lib/GrpcClient';

class Service extends GrpcClient {
  constructor() {
    super(
      path.join(__dirname, 'mail.proto'),
      { serviceURL: '127.0.0.1:50051' }
    );
  }
}

const service = new Service();

function test() {
  service.testConnection().catch(err => logger.error(err));
}

// Try rpc method
// Set deadline for each call
// catch failed to connect
// testconnection
// kill connection


setTimeout(() => test(), 2000);
