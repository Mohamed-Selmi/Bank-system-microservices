const mongoose= require('mongoose')

const TransactionSchema= new mongoose.Schema({
    senderAccountId: {type: String, required:true},
    receiverAccountId: {type: String, required:true},
    amount: {type:Number,required:true,},
    status:{type:String,default:'In progress'},
    timeStamp:{type:Date,default:Date.now}
    /*account: {
        type :mongoose.Schema.types.ObjectId,
        ref='Account',
        required:true
    }*/
},{ id:true,
    toJSON:{
        virtuals:true,
        transform: (doc,ret)=>{
            
                delete ret._id;  
                delete ret.__v;
                return ret;
        }
    }
});
module.exports= mongoose.model('Transaction',TransactionSchema);