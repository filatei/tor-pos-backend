const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');

const cardSchema = mongoose.Schema({
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    customerId: {type: mongoose.Schema.Types.ObjectId, ref: 'Customer'},
    image: {type: String},
    card_type: {type: String},
    card_name: {type: String},  // name on card
    card_bank: {type: String},
    cvc: {type: Number},
    card_number: {type: Number},
    expiry: {type: Date},

},
{
    timestamps: true,
    strict: true
});

cardSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Card', cardSchema)



