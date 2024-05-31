const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require("mongoose-sequence")(mongoose);

const bankSchema = mongoose.Schema({
    name: { type: String, lowercase: false, trim: true, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    icon: { type: String },
    code: { type: String, required: true, unique: true },
},
    {
        timestamps: true,
        strict: true
    });


bankSchema.plugin(AutoIncrement, { inc_field: "bank_id" });

bankSchema.plugin(uniqueValidator);

const rc = mongoose.model("Bank", bankSchema);
module.exports = rc
