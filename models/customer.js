const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');


const customerSchema = mongoose.Schema({
    name: {type: String, required: true},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    phone: {type: String},
    email: {type: String},
    icon: {type: String},
    barcode: {type: String},
    biometric: {type: String},
    phones: [],
    address: {
        street: String,
        city: String,
        state: String,
        zipcode: String
    },
    // createdAt: {type: Date, Default: Date.now},
    // updatedAt: {type: Date, Default: Date.now},
},
{
    timestamp: true,
    strict: true
});

customerSchema.set('autoIndex', process.env.Node_Env != 'production');
customerSchema.plugin( uniqueValidator );
// customerSchema.plugin(require('mongoose-beautiful-unique-validation'));

module.exports = mongoose.model('Customer', customerSchema)