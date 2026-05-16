const mongoose= require('mongoose')

const AccountSchema= new mongoose.Schema({
    id: {type: String, required:true},
    code:{type:String, required:true},
    balance:{type:Number},
    user_id:{type:String, required:true},
    },
    {toJSON:{transform:(doc,ret)=>{ret.id=ret._id.toString(); delete ret._id; delete ret.__v;}}}

);

module.exports=mongoose.model('Account',AccountSchema);