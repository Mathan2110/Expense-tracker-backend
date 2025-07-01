const mongoose = require('mongoose')

const expenseSchema = new mongoose.Schema({
    
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true
    },
    amount:{
        type:Number,
    },
    date:{
        type:String,
        required:true
    },
    category:{
        type:String,
        required:true
    },
    receiptUri:{
        type:String,
    },
    status:{
        type:String,
    },
    voucherPath:{
        type:String,
        default:null
    },
    note:{ 
        type: String, 
        default: "" 
    }

},{
    collection:"Expenses"
})

const Expense = mongoose.model("Expenses",expenseSchema)

module.exports = Expense;