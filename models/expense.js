const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const expenseSchema = mongoose.Schema({
    products: [{
        name: {type: String},
        description: {type: String},
        category: {type: String},

        qty: {type: Number},
        unit: {type: String},
        price: {type: Number},
        amount: {type: Number},

    }],
    notes: [{
        text: {type: String},
        author: {type: String},
        date: {type: Date},
    }],
    vendor: {type: mongoose.Schema.Types.ObjectId, ref: 'Contact'},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    // unit: {type: String},
    site: {type: String},
    status: {type: String},
    approvalComment: {type: String},
    category: {type: String},
    payment: {},
    
    date: {type: Date},
    type: {type: String},
    txn_amount: { type: Number },
    remarks: {type: String}
},
{
    timestamps: true,
    strict: true
});

expenseSchema.plugin(AutoIncrement, { inc_field: 'expense_id' });

expenseSchema.set('autoIndex', process.env.Node_Env != 'production');
expenseSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Expense', expenseSchema)