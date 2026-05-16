const mongoose= require('mongoose')

const AccountSchema= new mongoose.Schema({
    id: {type: String, required:true,unique:true},
    code:{type:String, required:true},
    balance:{type:Number,default:0},
    user_id:{type:String, required:true,unique:true},
    },
    {
        toJSON:{
        transform: (doc,ret)=>{
            {  
                delete ret._id;  
                delete ret.__v;
                return ret;
        }
    }
}
    }

);

module.exports=mongoose.model('Account',AccountSchema);