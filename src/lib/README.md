# GrpcClient
GrpcClient aims to reduce boilerplate code - writing method definitions for rpc methods. 

GrpcClient will generate rpc methods defined in your proto to class methods. I.E `SendAccountVerification` defined in `mail.proto` - invoke via `klass.sendAccountVerification()`. Each Rpc methods are wrapped with Promises. Refer below for full example.

## Usage
mail.proto
```
syntax = "proto3";
  
package mail;

service MailService {
  rpc SendAccountVerification(AccountVerificationRequest) returns (EmailResponse) {}
}
```

mailservice.js
```
// es6
import path from 'path';
import { GrpcClient } from 'grpc-utils';

class MailService extends GrpcClient {
  constructor(
    protoPath = path.join(__dirname, 'mail.proto'),
    serviceURL = process.env.MAIL_SERVICE || 'mailservice:50051'
  ) {
    super(protoPath, { serviceURL });
  }
}

const mailservice = new MailService();
mailservice.sendAccountVerification({ email: 'john@example.com', verificationToken: '12345' })
  .then(res => console.log(res))
  .catch(e => console.log(e));
```
```
// es5
var path = require('path');
var { GrpcClient } = require('../src/index');

var PROTO_PATH = path.join(__dirname, '/mail.proto');

function MailService(...args) {
  GrpcClient.apply(this, args);
}

MailService.prototype = Object.create(GrpcClient.prototype);
MailService.prototype.constructor = MailService;

var mailservice = new MailService(PROTO_PATH, {
  serviceURL: 'mailservice:50051'
});

```