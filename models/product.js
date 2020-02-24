const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const productSchema = mongoose.Schema({
    name: {type: String, required: true, unique: true, collation:{ locale: "en", strength: 3 }},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    description: {type: String},
    price: {type: Number, required: true},
    cost_price: {type: Number},
    category_id: {type: String},
    barcode: {type: String},
    icon: {type: String},
    createdAt: {type: Number},
    updatedAt: {type: Number},
    ordered: {type: Boolean},
    taxRate: {type: Number},

});

productSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Product', productSchema)