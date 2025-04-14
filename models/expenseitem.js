const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const expenseitemSchema = mongoose.Schema({
    name: {type: String, required: true, unique: true, lowercase: false, trim: true, collation:{ locale: "en", strength: 3 }},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    description: {type: String},
    unit: {type: String},
    category: {type: String},
    barcode: {type: String},
    icon: {type: String},
},
{
    timestamps: true
});

expenseitemSchema.plugin(AutoIncrement, { inc_field: 'expitem_id' });

expenseitemSchema.plugin( uniqueValidator );

expenseitemSchema.index({ "$**": "text" });

expenseitemSchema.set('autoIndex', process.env.Node_Env != 'production');
const rc = mongoose.model('Expenseitem', expenseitemSchema)
rc.createIndexes();

module.exports = rc;
