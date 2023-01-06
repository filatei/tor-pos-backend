const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const productSchema = mongoose.Schema({
    name: {type: String, required: true, unique: true, collation:{ locale: "en", strength: 3 }},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    description: {type: String},
    price: {type: Number, required: true},
    costprice: {type: Number},
    category: {type: String},
    group: {type: String},
    barcode: {type: String},
    icon: {type: String},
    taxRate: {type: Number},

},
{
    timestamps: true
});

productSchema.plugin( uniqueValidator );

module.exports = mongoose.model('FiaProduct', productSchema)