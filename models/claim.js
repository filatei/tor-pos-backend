const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const claimSchema = mongoose.Schema({
    customer: {type: String,required: true },
   //  creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
   //  updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},

    txn_amount: {type:  Number, required: true},
    trans_id: {type:  String },
    log_code: {type:  String},
    acquirer: {type:  String, required: true},
    
    stan: {type:  String},
    bank: {type:  String},
    card_number: {type:  String},
    action_taken: {type:  String},
    terminal_location: {type:  String},
    trans_date_time: {type:  Date},
    reply_mail: {type:  Date},
    received_from_bank: {type:  Date},
    avater: {type:  String},
    expiry_date: {type:  Date},
    company: {type:  String},
    remarks: {type:  String},
    reply_date: {type:  Number},
    card_bank: {type:  String},
    terminal_id: {type:  String},
    createdAt: {type: Date, Default: Date.now}
    // createdAt: {type: Number},
},
{
    timestamps: true
});

claimSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Claim', claimSchema)