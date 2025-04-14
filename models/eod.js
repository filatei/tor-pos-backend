const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');

const eodSchema = mongoose.Schema({
    terminal_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Terminal'},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    date: {type: Date},
    declineTotal: {type: Number},
    cardTotal: { type: Number },
    image: { type: String },
    imageText: { type: String },

},
{
    timestamp: true,
    strict: true
});

eodSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Eod', eodSchema)



