const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    name: {type: String, required: true},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
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

module.exports = mongoose.model('Product', productSchema)