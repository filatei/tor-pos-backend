const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');

const cardSchema = mongoose.Schema({
    name: {type: String, required: true},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    icon: {type: String},
    brand: {type: String},
    holder: {type: String},
    bank: {type: String},
    cvc: {type: Number},
    number: {type: Number},
    expiry: {type: Date},

},
{
    timestamp: true,
    strict: true
});

cardSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Card', cardSchema)



