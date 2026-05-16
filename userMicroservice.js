const grpc= require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose=required('mongoose');
const User=required('./models/User');

mongoose.connect('mongodb://localhost:27017/project_users').then(()=>console.log('User microservice connected to project_users database?')).catch(err=>console.error("Failed to conneect",err));
const userProtoPath='user.proto';
const userProtoDefinition=protoLoader.loadSync(userProtoPath,{
keepCase: true,
longs: String,
enums: String,
defaults: true,
oneofs: true,
});
const userProto=grpc.loadPackageDefinition(userProtoDefinition).user;
const userService={
    AddUser: async (call, callback)=>{
        try{
            const {id,name, CIN,account_id} = call.request;
            const newUser= new User({id,name,CIN, account_id});
            await newUser.save();
            callback(null,{user: newUser.toJson()});
        }
        catch(err){callback({code:grpc.status.INTERNAL,details:err.message});}
    }
}

const server=new grpc.server();
server.addService(userProto.userService,userService);
const port=50051;
server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(),
(err, port) => {
if (err) {
console.error('Error conneecting:', err);
return;
}
console.log(`Server is running on port: ${port}`);
});
console.log(`User microservice is listening on port:  ${port}`);