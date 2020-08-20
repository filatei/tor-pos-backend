const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const contactSchema = mongoose.Schema({
    name: {type: String, required: true, unique: true, collation:{ locale: "en", strength: 3 }},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    phone: {type: String},
    department: {type: String},
    bank_account: {
        bank: String,
        acct_number: String,
        icon: String
    },
    email: {type: String},
    icon: {type: String},
    biometric: {type: String},
    phones: [],
    emails: [],
    category: {type: String},
    site: {type: String},
    jobname: {type: String},
    type: {type: String},
    address: {
        street: String,
        city: String,
        state: String,
        zipcode: String
    },
},
{
    timestamps: true,
    strict: true
});

contactSchema.plugin(AutoIncrement, { inc_field: 'contact_id' });

contactSchema.set('autoIndex', process.env.Node_Env != 'production');
contactSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Contact', contactSchema)