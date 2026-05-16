const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Query } = require('mongoose');
const userProtoPath='user.proto';
const userProtoDefinition=protoLoader.loadSync(userProtoPath,{
keepCase: true,
longs: String,
enums: String,
defaults: true,
oneofs: true,
});
const userProto=grpc.loadPackageDefinition(userProtoDefinition).user;

const resolvers= {
    Query:{
        user:(_,{id})=>
            {
            const client= new userProto.UserService('localhost:50051',grpc.credentials.createInsecure());
            return new Promise((resolve,reject)=>{
                client.getUser({user_id:id},(err,response)=>{
                    if (err){
                        reject(err);
                    }
                    else{
                        resolve(response.user);
                    }
                });
            });
        },
        
    }
}

module.exports = resolvers;