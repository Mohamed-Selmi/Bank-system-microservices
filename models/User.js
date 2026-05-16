const mongoose= require('mongoose')

const UserSchema= new mongoose.Schema({
    id: {type: String, required:true,unique:true},
    name: {type: String, required:true},
    CIN: {type: String, required:true},
    account_id: {type:String, required:true,unique:true},
    /*account: {
        type :mongoose.Schema.types.ObjectId,
        ref='Account',
        required:true
    }*/
},{
    toJSON:{
        transform: (doc,ret)=>{
            {  
                delete ret._id;  
                delete ret.__v;
                return ret;
        }
    }
}
});
module.exports= mongoose.model('User',UserSchema);