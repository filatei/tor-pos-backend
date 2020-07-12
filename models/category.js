const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const categorySchema = mongoose.Schema({
    name: {type: String, required: true, unique: true, collation:{ locale: "en", strength: 3 }},
    description: {type: String},
    barcode: {type: String},
    icon: {type: String},
},
{
    timestamp: true,
    strict: true
});


categorySchema.plugin( uniqueValidator );

module.exports = mongoose.model('Category', categorySchema)