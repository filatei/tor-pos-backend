const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const expenseSchema = mongoose.Schema({
    products: [{
        name: {type: mongoose.Schema.Types.ObjectId, ref: 'Stockitem'},
        qty: {type: Number},
        price: {type: Number},
        unit: {type: String},

    }],
    vendor: {type: mongoose.Schema.Types.ObjectId, ref: 'Contact'},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    // unit: {type: String},
    site: {type: String},
    status: {type: String},
    category: {type: String},
    payment: {},
    // qty: {type: Number},
    // rate: {type: Number},
    
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