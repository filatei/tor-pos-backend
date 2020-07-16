const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');

const terminalSchema = mongoose.Schema({
    terminal_id: {type: String, required: true},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    bank: {type: String}, 
    terminal_location: {type: String},
    company: {type: String},
    sn: {type: String}

},
{
    timestamp: true,
    strict: true
});

terminalSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Terminal', terminalSchema)



