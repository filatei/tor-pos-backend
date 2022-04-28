const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const casualSchema = mongoose.Schema({
    personId: {type: mongoose.Schema.Types.ObjectId, ref: 'People', required: true},
    siteId: {type: mongoose.Schema.Types.ObjectId, ref: 'Site'},
    qty: {type: Number, required: true},
    date: {type: Date,  default: Date.now},
    type: {type: String, required: true, enum: ['LOADED', 'BAGGED']},
    personDateType: {type: String, required: true, unique: true},

    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
},
{
    timestamps: true
});

casualSchema.plugin(AutoIncrement, { inc_field: 'casual_id' });
casualSchema.plugin( uniqueValidator );


module.exports = mongoose.model('Casual', casualSchema)