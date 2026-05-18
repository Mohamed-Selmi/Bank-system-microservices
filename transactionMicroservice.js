const grpc= require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose=require('mongoose');
//const Transaction=require('./models/Transaction');
//const Account = require('./models/Account');
/*const mongoOptions = {
    directConnection: true, 
};
const transactionConnection = mongoose.createConnection('mongodb://localhost:27017/project_transactions',mongoOptions);
const accountConnection = mongoose.createConnection('mongodb://localhost:27017/project_accounts',mongoOptions);*/

const mongoURI = 'mongodb://localhost:27017/?directConnection=true';
mongoose.connect(mongoURI)
    .then(() => console.log('Unified MongoDB Client connected successfully.'))
    .catch(err => console.error("Failed to connect to MongoDB:", err));

const dbTransactions = mongoose.connection.useDb('project_transactions', { useCache: true });
const dbAccounts = mongoose.connection.useDb('project_accounts', { useCache: true });


const TransactionSchema = require('./models/Transaction').schema; 
const AccountSchema = require('./models/Account').schema;
const Transaction = dbTransactions.model('Transaction', TransactionSchema);
const Account = dbAccounts.model('Account', AccountSchema);
const transactionProtoPath='transaction.proto';
const transactionProtoDefinition=protoLoader.loadSync(transactionProtoPath,{
keepCase: true,
longs: String,
enums: String,
defaults: true,
oneofs: true,
});
const transactionProto=grpc.loadPackageDefinition(transactionProtoDefinition).transaction;
const transactionService={
    TransferMoney: async (call,callback)=>{
        let newTransaction=null;
        const session = await mongoose.connection.startSession();
        session.startTransaction();
        try{
            const{id,senderAccountId,receiverAccountId}=call.request;
            let amount=call.request.amount
            let status="PENDING";
            if (amount<=0) {
                await session.abortTransaction();
                session.endSession();
                        return callback({
                            code:grpc.status.INVALID_ARGUMENT,
                            details: "Transfer amount must be greater than zero"
                            })
                        }
            const foundSenderAccount= await Account.findOne({id:senderAccountId}).session(session);
            const foundReceiverAccount= await Account.findOne({id:receiverAccountId}).session(session);
            if (!foundSenderAccount) {
               
                return callback({ 
                code: grpc.status.NOT_FOUND, details: "Sender Account does not exist" });
                }
            if (!foundReceiverAccount) {
                return callback({ 
                code: grpc.status.NOT_FOUND, details: "Receiver Account does not exist" });
                }
            
            if (foundSenderAccount.balance< amount){
                              return callback({
                                code:grpc.status.FAILED_PRECONDITION,
                                details: `You don't have enough money. Current balance: ${foundSenderAccount.balance}.`
                            })
                        }
            newTransaction=new Transaction({senderAccountId,receiverAccountId,amount,status});
            await newTransaction.save({session});
            const tax=amount*0.08;
            let transferAmount=amount-tax;
            foundSenderAccount.balance-=amount;
            await foundSenderAccount.save({session});
            foundReceiverAccount.balance+=transferAmount;
            await foundReceiverAccount.save({session});
            newTransaction.status = "SUCCESS";
            await newTransaction.save({ session });
            //status="SUCCESS"
            //const updatedTransaction= await Transaction.findByIdAndUpdate(newTransaction._id,{status:"SUCCESS"},{new:true});
            await session.commitTransaction();
            session.endSession();
            return callback(null, {message: `Successfuly transfered ${amount} from ${senderAccountId} to ${receiverAccountId}`, transaction: newTransaction.toJSON() });

        } catch(err){
            await session.abortTransaction();
            session.endSession();
                if (newTransaction && newTransaction._id){
                    try {
                        await Transaction.findByIdAndUpdate({ _id: newTransaction._id },{status:"FAILED"});
                    }
                    catch (innerErr) {
                    return callback({ code: grpc.status.INTERNAL, details: `Transaction failed: ${innerErr.message}` });
                }
                }

                    return callback({code:grpc.status.INTERNAL,details:err.message});
                }
    },
    RevertTransaction: async (call,callback)=>{
        const session = await mongoose.connection.startSession();
        try{
            session.startTransaction();
            const transaction_id=call.request.transaction_id;
            const status="REVERTED";
            const foundTransaction = await Transaction.findOne({ _id: transaction_id }).session(session);
            if (!foundTransaction){
                return callback({ 
                code: grpc.status.NOT_FOUND, details: "Transaction does not exist" });
            }
            if(foundTransaction.status=="REVERTED"){
                  return callback({ 
                code: grpc.status.NOT_FOUND, details: "Transaction already reverted" });
            }
        const foundSenderAccount = await Account.findOne({ id: foundTransaction.senderAccountId }).session(session);
        const foundReceiverAccount = await Account.findOne({ id: foundTransaction.receiverAccountId }).session(session);
        if (!foundSenderAccount) {
                return callback({ 
                code: grpc.status.NOT_FOUND, details: "Sender Account no longer exists" });
                }
        
        const tax=foundTransaction.amount*0.08;
        let transferAmount=foundTransaction.amount-tax;
        if (foundReceiverAccount && foundTransaction.status === "SUCCESS") {
                foundReceiverAccount.balance-=transferAmount;
                await foundReceiverAccount.save({session});
                }
        foundSenderAccount.balance+=foundTransaction.amount;
        await foundSenderAccount.save({session});
        foundTransaction.status="REVERTED";
        await foundTransaction.save({session});
        await session.commitTransaction();
        session.endSession();
        return callback(null, {message: `Successfuly reverted ${transaction_id}`, transaction: foundTransaction.toJSON() });

        }
        catch(err){
            await session.abortTransaction();
            session.endSession();
            return callback({code:grpc.status.INTERNAL,details:err.message});
                }
    },
    GetAllTransactions: async (call,callback)=>{
        try{
        const transactions = await Transaction.find({});
        const formatted = transactions.map(m => {
            const tx = m.toJSON();
            return {
                ...tx,
                id: tx._id ? tx._id.toString() : tx.id
            };
        });
        callback(null,{transactions:formatted});
        }
        catch(err){
            callback({code:grpc.status.INTERNAL,details:err.message});
        }      
      }
    

}
const server=new grpc.Server();
server.addService(transactionProto.TransactionService.service, transactionService);
const port=50053;
server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(),
(err, port) => {
if (err) {
console.error('Error conneecting:', err);
return;
}
console.log(`Server is running on port: ${port}`);
});
console.log(`Transaction microservice is listening on port:  ${port}`);
