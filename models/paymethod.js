const mongoose = require('mongoose');

const paymethodSchema = mongoose.Schema({
    name: {type: String, required: true},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
   

},
{
    timestamp: true
});

module.exports = mongoose.model('Paymethod', paymethodSchema)