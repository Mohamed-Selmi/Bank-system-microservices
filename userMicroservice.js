const grpc= require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose=require('mongoose');
const User=require('./models/User');

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
            const {id,name, CIN,account_id} = call.request.user || {};
            const newUser= new User({id,name,CIN, account_id});
            await newUser.save();
            callback(null,{user: newUser.toJSON()});
        }
        catch(err){callback({code:grpc.status.INTERNAL,details:err.message});}
    },
    SearchUsers: async (call,callback)=>{
        try{
        const query = call.request.user_name || "";
        const filter= query ? {name:{ $regex: query, $options:'i'}}:{};
        const users= await User.find(filter);
        callback(null,{matchingUsers:users.map(m=>m.toJSON())});
        }
        catch(err){
            callback({code:grpc.status.INTERNAL,details:err.message});
        }

    },
    UpdateUser: async (call,callback)=>{
        try{
            const user_id = call.request.user_id || "";
            const {id,name, CIN,account_id} = call.request.user;
            const updatedUser= await User.findOneAndUpdate({id:user_id},{id,name, CIN,account_id},{new:true});
            if (!updatedUser) return callback({ code: grpc.status.NOT_FOUND, details: "User not found" });
            callback(null, { user: updatedUser.toJSON() });
        }  catch(err){
            callback({code:grpc.status.INTERNAL,details:err.message});
        }
    },
    GetUser: async (call,callback)=>{
        try{
            const user_id = call.request.user_id || "";
            const foundUser= await User.findOne({id:user_id});
            if (!foundUser) return callback({ code: grpc.status.NOT_FOUND, details: "User not found" });
            callback(null, { searchedUser: foundUser.toJSON() });
        }  catch(err){
            callback({code:grpc.status.INTERNAL,details:err.message});
        }
    },


    DeleteUser: async (call,callback)=>{
        try{
            const user_id = call.request.user_id || "";
            const result= await User.findOneAndDelete({id:user_id});
            if (!result) 
                {return callback(null,
                { success: false, message: "User not found" });
                }
                callback(null,
                { success: true, message: "User deleted successfuly" });

        }
         catch(err){
            callback({code:grpc.status.INTERNAL,details:err.message});
        }
    },
}

const server=new grpc.Server();
server.addService(userProto.UserService.service,userService);
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