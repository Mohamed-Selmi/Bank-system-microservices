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

const userProtoPath='user.proto';
const userProtoDefinition=protoLoader.loadSync(userProtoPath,{
keepCase: true,
longs: String,
enums: String,
defaults: true,
oneofs: true,
});
const userProto=grpc.loadPackageDefinition(userProtoDefinition);

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


const port = 3000;
app.listen(port, () => {
console.log(`API Gateway en cours d'exécution sur le port ${port}`);
});
