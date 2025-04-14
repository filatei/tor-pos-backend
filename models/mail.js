const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');

const mailSchema = mongoose.Schema({
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    orderId: {type: mongoose.Schema.Types.ObjectId, ref: 'ShopOrder'},
    body: {type: String},
    subject: {type: String},
    email: {type: String},
    accepted: [],
    rejected: [],
    envelope: {},
    envelopeTime: {type: Number},
    messageTime: {type: Number},
    messageSize: {type: String}
},
{
    timestamps: true,
    strict: true
});

mailSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Mail', mailSchema)