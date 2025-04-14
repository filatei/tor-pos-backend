const mongoose = require('mongoose');
// const uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const quantitySchema = mongoose.Schema({
    name: {type: mongoose.Schema.Types.ObjectId, ref: 'Stockitem'},
    store: {type: String, required: true},
    qty: {type: Number, required: true},

    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
},
{
    timestamps: true
});

quantitySchema.plugin(AutoIncrement, { inc_field: 'quant_id' });

// quantitySchema.plugin( uniqueValidator );

module.exports = mongoose.model('Quantity', quantitySchema)