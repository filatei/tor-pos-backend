const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const recuploadSchema = mongoose.Schema({
    customer: {type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true},
    txn_amount: {type:  Number, required: true},
    trans_id: {type:  String },
    log_code: {type:  String},
    acquirer: {type:  String, required: true},
    stan: {type:  String, unique: true, required: true},
    rrn: {type:  String, unique: true, required: true},
    status: {type:  String},
    bank: {type:  String},
    card_number: {type:  String},
    action_taken: {type:  String},
    trans_date: {type:  Date},
    reply_date: {type:  Date},
    received_date: {type:  Date},
    receipt_id: {type: String},
    
    expiry_date: {type:  Date},
    company: {type:  String},
    remarks: {type:  String},
    card_bank: {type:  String},
    terminal_id: {type:  String},
    terminal_location: {type:  String},
    comments: {type:  String},
    image: {type:  String},

    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
   
},
{
    timestamps: true
});

recuploadSchema.plugin( uniqueValidator );
recuploadSchema.plugin(require('mongoose-beautiful-unique-validation'));

module.exports = mongoose.model('Recupload', recuploadSchema)