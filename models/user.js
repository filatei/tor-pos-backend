const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const userSchema = mongoose.Schema({
    name: {type: String},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true },
    image: {type: String }
},
{
    timestamp: true
});

userSchema.plugin( uniqueValidator );

module.exports = mongoose.model('User', userSchema)