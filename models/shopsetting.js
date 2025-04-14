const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const shopsettingSchema = mongoose.Schema({

    printurl: {type: String},
    email: {type: String},
    phone: {type: String},
    site: {type: String},
    street: {type: String},
    city: {type:  String},
    state: {type:  String},
    zipcode: {type: String},
    
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
},
{
    timestamps: true,
    autoindex: true
});


shopsettingSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Shopsetting', shopsettingSchema)