const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const accesslogSchema = mongoose.Schema({
  
    email: {type:  String, required: true },
    description: {type: String}
    
},
{
    timestamps: true
});

accesslogSchema.plugin( uniqueValidator );


module.exports = mongoose.model('Accesslog', accesslogSchema)