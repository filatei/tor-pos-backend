const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const settingSchema = mongoose.Schema({
    version: {type: String},
    buildDate: {type: Number},
    printip: {type: String},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}

},
{
    timestamp: true
}
);

// settingSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Setting', settingSchema)