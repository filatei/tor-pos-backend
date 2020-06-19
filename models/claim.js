const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const claimSchema = mongoose.Schema({
  
    customer: {type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true},
    txn_amount: {type:  Number, required: true},
    trans_id: {type:  String },
    log_code: {type:  String},
    acquirer: {type:  String, required: true},
    stan: {type:  String, required: true},
    rrn: {type:  String},
    status: {type:  String},
    bank: {type:  String},
    card_number: {type:  String},
    action_taken: {type:  String},
    terminal_location: {type:  String},
    
    trans_date: {type:  Date},
    trans_time: {type:  String},

    reply_date: {type:  Date},
    reply_time: {type:  String},

    received_date: {type:  Date},
    received_time: {type:  String},
  
    avatar: {type:  String},
    
    expiry_date: {type:  Date},
    expiry_time: {type:  String},
  
    company: {type:  String},
    remarks: {type:  String},
    card_bank: {type:  String},
    terminal_id: {type:  String},
    comments: {type:  String},
    bank_action: {type:  String}, // CORRECT DEBIT or WRONG DEBIT
    bank_debit_date: {type:  Date},
    image: {type:  String}, 

    // createdAt: {type: Date, Default: Date.now},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
},
{
    timestamps: true
});

claimSchema.plugin( uniqueValidator );
claimSchema.plugin(require('mongoose-beautiful-unique-validation'));

module.exports = mongoose.model('Claim', claimSchema)