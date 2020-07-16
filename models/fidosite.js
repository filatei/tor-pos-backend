const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const fidositeSchema = mongoose.Schema({
    name: {type: String, required: true, unique: true, collation:{ locale: "en", strength: 3 }},
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
},
{
    timestamp: true
}
);

fidositeSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Fidosite', fidositeSchema)