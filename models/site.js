const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const siteSchema = mongoose.Schema({
    name: {type: String, required: true, unique: true, collation:{ locale: "en", strength: 3 }},
    buildDate: {type: Number},
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipcode: String
    },
    phone: String,
    email: String,
    icon: String,
    taxRate: Number
},
{
    timestamp: true
}
);

siteSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Site', siteSchema)