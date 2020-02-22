const mongoose = require('mongoose');

const paymethodSchema = mongoose.Schema({
    name: {type: String, required: true},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    createdAt: Number,
    updatedAt: Number,

});

module.exports = mongoose.model('Paymethod', paymethodSchema)