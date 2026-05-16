const grpc= require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose=require('mongoose');
const Account=require('./models/Account');
mongoose.connect('mongodb://localhost:27017/project_accounts').then(()=>console.log('Account microservice connected to project_accounts database.')).catch(err=>console.error("Failed to conneect",err));
const accountProtoPath='account.proto';
const accountProtoDefinition=protoLoader.loadSync(accountProtoPath,{
keepCase: true,
longs: String,
enums: String,
defaults: true,
oneofs: true,
});
const accountProto=grpc.loadPackageDefinition(accountProtoDefinition).account;
const accountService={
    AddAccount: async (call, callback)=>{
        try{
            const {id,code, balance,user_id} = call.request.account || {};
            const newAccount= new Account({id,code, balance,user_id});
            await newAccount.save();
            callback(null,{account: newAccount.toJSON()});
        }
        catch(err){callback({code:grpc.status.INTERNAL,details:err.message});}
    },
    SearchAccounts: async (call,callback)=>{
        try{
        const targetBalance = call.request.account_balance || 0;
        const accounts= await Account.find({balance: {$gte: targetBalance}});
        callback(null,{matchingAccounts:accounts.map(m=>m.toJSON())});
        }
        catch(err){
            callback({code:grpc.status.INTERNAL,details:err.message});
        }

    },
    UpdateAccount: async (call,callback)=>{
        try{
            const account_id = call.request.account_id || "";
            const {id,code, balance,user_id} = call.request.account;
            const updatedAccount= await Account.findOneAndUpdate({id:account_id},{id,code, balance,user_id},{new:true});
            if (!updatedAccount) return callback({ code: grpc.status.NOT_FOUND, details: "Account not found" });
            callback(null, { account: updatedAccount.toJSON() });
        }  catch(err){
            callback({code:grpc.status.INTERNAL,details:err.message});
        }
    },
    GetAccount: async (call,callback)=>{
        try{
            const account_id = call.request.account_id || "";
            const foundAccount= await Account.findOne({id:account_id});
            if (!foundAccount) return callback({ code: grpc.status.NOT_FOUND, details: "Account not found" });
            callback(null, { searchedAccount: foundAccount.toJSON() });
        }  catch(err){
            callback({code:grpc.status.INTERNAL,details:err.message});
        }
    },


    DeleteAccount: async (call,callback)=>{
        try{
            const account_id = call.request.account_id || "";
            const result= await Account.findOneAndDelete({id:account_id});
            if (!result) 
                {return callback(null,
                { success: false, message: "Account not found" });
                }
                callback(null,
                { success: true, message: "Account deleted successfuly" });

        }
         catch(err){
            callback({code:grpc.status.INTERNAL,details:err.message});
        }
    },
}

const server=new grpc.Server();
server.addService(accountProto.AccountService.service,accountService);
const port=50052;
server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(),
(err, port) => {
if (err) {
console.error('Error conneecting:', err);
return;
}
console.log(`Server is running on port: ${port}`);
});
console.log(`Account microservice is listening on port:  ${port}`);
