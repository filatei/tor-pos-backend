const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const expenseSchema = mongoose.Schema({
    name: {type: mongoose.Schema.Types.ObjectId, ref: 'Stockitem'},
    vendor: {type: mongoose.Schema.Types.ObjectId, ref: 'Contact'},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    unit: {type: String},
    site: {type: String},
    qty: {type: Number},
    rate: {type: Number},
    date: {type: Date},
    type: {type: String},
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