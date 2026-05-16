const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Query } = require('mongoose');
const userProtoPath='user.proto';
const accountProtoPath='account.proto';

const userProtoDefinition=protoLoader.loadSync(userProtoPath,{
keepCase: true,
longs: String,
enums: String,
defaults: true,
oneofs: true,
});
const accountProtoDefinition=protoLoader.loadSync(accountProtoPath,{
keepCase: true,
longs: String,
enums: String,
defaults: true,
oneofs: true,
});
const userProto=grpc.loadPackageDefinition(userProtoDefinition);
const accountProto=grpc.loadPackageDefinition(accountProtoDefinition);
const userClient = new userProto.user.UserService('localhost:50051',grpc.credentials.createInsecure());
const accountClient = new accountProto.account.AccountService('localhost:50052',grpc.credentials.createInsecure()); 


const resolvers= {
    Query:{
        getUser:(_,{id})=>
            {
            return new Promise((resolve,reject)=>{
                userClient.GetUser({user_id:id},(err,response)=>{
                    if (err){
                        reject(err);
                    }
                    else{
                        resolve(response.searchedUser);
                    }
                });
            });
        },
         getAccount:(_,{id})=>
            {
            return new Promise((resolve,reject)=>{
                accountClient.GetAccount({account_id:id},(err,response)=>{
                    if (err){
                        reject(err);
                    }
                    else{
                        resolve(response.searchedAccount);
                    }
                });
            });
        },
        
    },
    Mutation: {
            addUser: (_, args) => {
            return new Promise((resolve, reject) => {
                userClient.AddUser({ user: args }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response.user);
                });
            });
        },
    },
    User :{
        account:(parent)=>{
            return new Promise((resolve,reject)=>{
                accountClient.GetAccount({account_id:parent.account_id}, (err,response)=>{
                    if (err) resolve(null);
                    else resolve(response.searchedAccount)
                })
            })
        }
    },
     Account :{
        user:(parent)=>{
            return new Promise((resolve,reject)=>{
                userClient.getUser({user_id:parent.user_id}, (err,response)=>{
                    if (err) resolve(null);
                    else resolve(response.searchedUser)
                })
            })
        }
    },
}

module.exports = resolvers;