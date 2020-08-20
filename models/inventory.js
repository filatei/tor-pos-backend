const mongoose = require('mongoose');
// const uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const inventorySchema = mongoose.Schema({
    name: {type: mongoose.Schema.Types.ObjectId, ref: 'Stockitem'},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    description: {type: String},
    ops: {type: String},
    qty: {type: Number, required: true},
    unit: {type: String},
    rollsUnit: {type: String},
    rollsQty: {type: Number},
    category: {type: String},
    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'Contact'},
    receiver: {type: mongoose.Schema.Types.ObjectId, ref: 'Contact'},
    store: {type: String},
    barcode: {type: String},
    dateReceived: {type: Date}
},
{
    timestamps: true
});

inventorySchema.plugin(AutoIncrement, { inc_field: 'stock_id' });

// inventorySchema.plugin( uniqueValidator );

module.exports = mongoose.model('Inventory', inventorySchema)