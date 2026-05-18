const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Query } = require('mongoose');
const userProtoPath='user.proto';
const accountProtoPath='account.proto';
const transactionProtoPath='transaction.proto';
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
const transactionProtoDefinition=protoLoader.loadSync(transactionProtoPath,{
keepCase: true,
longs: String,
enums: String,
defaults: true,
oneofs: true,
});
const userProto=grpc.loadPackageDefinition(userProtoDefinition);
const accountProto=grpc.loadPackageDefinition(accountProtoDefinition);
const transactionProto=grpc.loadPackageDefinition(transactionProtoDefinition);

const userClient = new userProto.user.UserService('localhost:50051',grpc.credentials.createInsecure());
const accountClient = new accountProto.account.AccountService('localhost:50052',grpc.credentials.createInsecure()); 
const transactionClient = new transactionProto.transaction.TransactionService('localhost:50053',grpc.credentials.createInsecure()); 


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
        getAccounts:(_,{balance})=>
            {
            return new Promise((resolve,reject)=>{
                const payload= {account_balance:balance || 0}
                accountClient.SearchAccounts(payload,(err,response)=>{
                    if (err){
                        reject(err);
                    }
                    else{
                        resolve(response.matchingAccounts || []);
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
         updateUser: (_, {user_id,id,name,CIN,account_id}) => {
            return new Promise((resolve, reject) => {
                userClient.UpdateUser({ user_id,user: {id,name,CIN,account_id} }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response.user);
                });
            });
        },
        deleteUser: (_,{userId}) => {
             return new Promise((resolve, reject) => {
                userClient.DeleteUser({ user_id:userId }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response.user);
                });
            });
        },
            addAccount: (_, args) => {
            return new Promise((resolve, reject) => {
                accountClient.AddAccount({ account: args }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response.account);
                });
            });
        },
         updateAccount: (_, {accountId, id, code, balance, user_id}) => {
            return new Promise((resolve, reject) => {
                accountClient.UpdateAccount({ account_id:accountId,account: { id, code, balance, user_id} }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response.account);
                });
            });
        },
        deleteAccount: (_, { accountId }) => {
            return new Promise((resolve, reject) => {
                accountClient.DeleteAccount({ account_id: accountId }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response.message);
                });
            });
        },
        withrawMoney: (_, { userId, accountId, amount }) => {
            return new Promise((resolve, reject) => {
                accountClient.WithdrawMoney({ user_id: userId, account_id: accountId, amount }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                });
            });
        },
        depositMoney: (_, { userId, accountId, amount }) => {
            return new Promise((resolve, reject) => {
                accountClient.depositMoney({ user_id: userId, account_id: accountId, amount }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                });
            });
        },
        transferMoney: (_,{ senderAccountId, receiverAccountId, amount }) =>{
             return new Promise((resolve, reject) => {
                transactionClient.transferMoney({ senderAccountId:senderAccountId, receiverAccountId:receiverAccountId, amount:amount }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                });
            });
        },
        revertTransaction:(_,{transaction_id})=>{
              return new Promise((resolve, reject) => {
                transactionClient.revertTransaction({ transaction_id:transaction_id }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                });
            });
        }
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
                userClient.GetUser({user_id:parent.user_id}, (err,response)=>{
                    if (err) resolve(null);
                    else resolve(response.searchedUser)
                })
            })
        }
    },
}

module.exports = resolvers;