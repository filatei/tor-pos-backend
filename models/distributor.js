const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const distributorSchema = mongoose.Schema({
    name: {type: String, required: true, unique: true, lowercase: false, trim: true, collation:{ locale: "en", strength: 3 }},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    linkedCustomer: {type: mongoose.Schema.Types.ObjectId, ref: 'Customer'},
    phone: {type: String},
    email: {type: String},
    image: {type: String},
    category: {type: String, enum: ["MAJOR", "MEDIUM", "MINOR", "REGULAR"],},
    status: {type: String, enum: ["ACTIVE", "DORMANT", "DISCONTINUED"]},
    site: {type: String},
    address: { type: String },
    remarks: { type: String },
    balance: {type: Number},
    bDay: { type: Number },
    bMonth: {type: Number},
 },
{
    timestamps: true,
    strict: true
});

distributorSchema.plugin(AutoIncrement, { inc_field: 'distributor_id' });

distributorSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Distributor', distributorSchema)