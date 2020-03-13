# Grpc Utils
TODO:
Grpc utils provides helper functions and classes for gprc operations

# Api Reference

| Name          | Description    |  
| ------------- | -------------- |
| [`GrpcClient`](#GrpcClient)| grpc client helper | 
| `encodeMetadata`| Encodes `Any` data to be stored in grpc.Metadata | 
| `decodeMetadata`| Decodes data encoded with `encodeMetadata`| 
| `grpcLoader.loadProto`| Loads a one proto file | 
| `grpcLoader.loadProto`| Loads an array of proto files | 

# GrpcClient
GrpcClient aims to reduce boilerplate code - writing method definitions for rpc methods. 

GrpcClient will generate rpc methods defined in your proto to class methods. I.E `SendAccountVerification` defined in `mail.proto` - invoke via `klass.sendAccountVerification()`. Each Rpc methods are wrapped with Promises. Refer to [docs](./src/lib/README.md#GrpcClient) for full example. 
