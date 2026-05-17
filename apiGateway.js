const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express4');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');
const resolvers = require('./resolver');
const typeDefs = require('fs').readFileSync('./schema.gql', 'utf8');
const app = express();
app.use(express.json());
app.use(cors());
const accountProtoPath='account.proto';
const userProtoPath='user.proto';
const userProtoDefinition=protoLoader.loadSync(userProtoPath,{
keepCase: true,
longs: String,
enums: String,
defaults: true,
oneofs: true,
});
const userProto=grpc.loadPackageDefinition(userProtoDefinition);
const accountProtoDefinition=protoLoader.loadSync(accountProtoPath,{
keepCase: true,
longs: String,
enums: String,
defaults: true,
oneofs: true,
});
const accountProto=grpc.loadPackageDefinition(accountProtoDefinition);
const server = new ApolloServer({ typeDefs, resolvers });

server.start().then(() => {
app.use('/graphql',
cors(),
express.json(),
expressMiddleware(server),
);
});
app.get('/users', (req, res) => {
const client = new userProto.user.UserService('localhost:50051',
grpc.credentials.createInsecure());
client.SearchUsers({}, (err, response) => {
if (err) {
res.status(500).send(err);
} else {
res.json(response.matchingUsers || []);
}
});
});

app.get('/users/:id', (req, res) => {
const client = new userProto.user.UserService('localhost:50051',
grpc.credentials.createInsecure());
const targetUserId= req.params.id;
const payload={user_id: targetUserId};
client.GetUser(payload, (err, response) => {
if (err) {
res.status(500).send(err);
} else {
res.json(response.searchedUser || {});
}
});
});

app.post('/users', (req, res) => {
const client = new userProto.user.UserService('localhost:50051',
grpc.credentials.createInsecure());
const {id, name, CIN, account_id} = req.body;
const payload={user:{
    id:id,
    name:name,
    CIN:CIN,
    account_id:account_id
}};
client.AddUser(payload, (err, response) => {
if (err) {
res.status(500).send(err);
} else {
res.status(201).json(response.user);
}
});
});


app.put('/users/:id',(req,res)=>{
    const client = new userProto.user.UserService('localhost:50051',grpc.credentials.createInsecure()); 
    const targetUserId= req.params.id;
    const {id, name, CIN, account_id} = req.body;
const payload={
    user_id: targetUserId,
    user:{
    id:id || targetUserId,
    name:name,
    CIN:CIN,
    account_id:account_id
}};
    client.UpdateUser(payload,(err,response)=>{
        if (err){
        if (err.code==grpc.status.NOT_FOUND){
            return res.status(404).json({error:err.details});
        }
        return res.status(500).json({error:"Server error", details:err.message})
    }
    res.json(response.user);
}
    
);
});
app.delete('/users/:id',(req,res)=>{
    const client = new userProto.user.UserService('localhost:50051',grpc.credentials.createInsecure()); 
    const targetUserId= req.params.id;
    const payload={user_id: targetUserId};
    client.DeleteUser(payload,(err,response)=>{
    if (err) {
        res.status(500).send(err);
    }
    else {
        if (response.success){
            res.status(200).json({message:response.message})
        }
        else{
            res.status(404).json({message:response.message})
        }
    }
    })

});



app.get('/accounts', (req, res) => {
const client = new accountProto.account.AccountService('localhost:50052',
grpc.credentials.createInsecure());
const balanceFilter= parseFloat(req.query.balance) || 0.0;

const payload= { account_balance: balanceFilter};
client.SearchAccounts(payload, (err, response) => {
if (err) {
res.status(500).send(err);
} else {
res.json(response.matchingAccounts || []);
}
});
});

app.get('/accounts/:id', (req, res) => {
const client = new accountProto.account.AccountService('localhost:50052',
grpc.credentials.createInsecure());
const targetAccountId= req.params.id;
const payload={account_id: targetAccountId};
client.GetAccount(payload, (err, response) => {
if (err) {
res.status(500).send(err);
} else {
res.json(response.searchedAccount || {});
}
});
});

app.post('/accounts', (req, res) => {
const client = new accountProto.account.AccountService('localhost:50052',
grpc.credentials.createInsecure());
const {id,code, balance,user_id} = req.body;
const payload={account:{
    id:id,
    code:code,
    balance:balance,
    user_id:user_id
}};
client.AddAccount(payload, (err, response) => {
if (err) {
res.status(500).send(err);
} else {
res.status(201).json(response.account);
}
});
});


app.put('/accounts/:id',(req,res)=>{
    const client = new accountProto.account.AccountService('localhost:50052',grpc.credentials.createInsecure()); 
    const targetAccountId= req.params.id;
    const {id,code, balance,user_id} = req.body;
const payload={
    account_id: targetAccountId,
    account:{
    id:id || targetAccountId,
    code:code,
    balance:balance,
    user_id:user_id
}};
    client.UpdateAccount(payload,(err,response)=>{
        if (err){
        if (err.code==grpc.status.NOT_FOUND){
            return res.status(404).json({error:err.details});
        }
        return res.status(500).json({error:"Server error", details:err.message})
    }
    res.json(response.account);
}
    
);
});
app.delete('/accounts/:id',(req,res)=>{
    const client = new accountProto.account.AccountService('localhost:50052',grpc.credentials.createInsecure()); 
    const targetAccountId= req.params.id;
    const payload={account_id: targetAccountId};
    client.DeleteAccount(payload,(err,response)=>{
    if (err) {
        res.status(500).send(err);
    }
    else {
        if (response.success){
            res.status(200).json({message:response.message})
        }
        else{
            res.status(404).json({message:response.message})
        }
    }
    })

});
app.post('/accounts/:id/withdraw',(req,res)=>{
    const client = new accountProto.account.AccountService('localhost:50052',grpc.credentials.createInsecure()); 
    const targetAccountId= req.params.id;
    const { user_id, amount } = req.body;
    const payload = {user_id: user_id,account_id: targetAccountId, amount: parseFloat(amount)};
        client.WithdrawMoney(payload,(err,response)=>{
             if (err) {
            if (err.code === grpc.status.NOT_FOUND) {
                return res.status(404).json({ error: err.details });
            }
            if (err.code === grpc.status.PERMISSION_DENIED) {
                return res.status(403).json({ error: err.details });
            }
            if (err.code === grpc.status.INVALID_ARGUMENT || err.code === grpc.status.FAILED_PRECONDITION) {
                return res.status(400).json({ error: err.details });
            }
            return res.status(500).json({ error: "Server error", details: err.message });
    }
        res.json({
            message: response.message,
            account: response.account
        });
        });
});


app.post('/accounts/:id/deposit',(req,res)=>{
    const client = new accountProto.account.AccountService('localhost:50052',grpc.credentials.createInsecure()); 
    const targetAccountId= req.params.id;
    const { user_id, amount } = req.body;
    const payload = {user_id: user_id,account_id: targetAccountId, amount: parseFloat(amount)};
        client.DepositMoney(payload,(err,response)=>{
             if (err) {
            if (err.code === grpc.status.NOT_FOUND) {
                return res.status(404).json({ error: err.details });
            }
            if (err.code === grpc.status.INVALID_ARGUMENT || err.code === grpc.status.FAILED_PRECONDITION) {
                return res.status(400).json({ error: err.details });
            }
            return res.status(500).json({ error: "Server error", details: err.message });
    }
        res.json({
            message: response.message,
            account: response.account
        });
        });
});



const port = 3000;
app.listen(port, () => {
console.log(`API Gateway en cours d'exécution sur le port ${port}`);
});
