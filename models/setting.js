const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const settingSchema = mongoose.Schema({
    version: {type: String, required: true, unique: true, collation:{ locale: "en", strength: 3 }},
    buildDate: {type: Number},
});

settingSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Setting', settingSchema)