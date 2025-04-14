const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const vehicleSchema = mongoose.Schema({
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    updater: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {type: String, enum: ["Tricycle", "Keke", "Dyna", "Van", "Truck"],},
    
    model: {type: String},
    make: {type: String},
    site: {type: String},
    engineNo: {type: String},
    purchaseDate: { type: Date },
    purchasePrice: {type: Number},
    plateNo: { type: String },
    image: { type: String },
    regDate: { type: Date },
    notes: [{
        text: { type: String },
        image: { type: String },
        author: { type: String },
        date: { type: Date },
        
    }]
 },
{
    timestamps: true,
    strict: true
});

vehicleSchema.plugin(AutoIncrement, { inc_field: 'vehicle_id' });

// vehicleSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Vehicle', vehicleSchema)