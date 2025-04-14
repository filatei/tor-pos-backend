const mongoose = require('mongoose');

const CashBackAttachSchema = new mongoose.Schema({
    cashBackId: {type: mongoose.Schema.Types.ObjectId, ref: 'CashBack', required: true},
    status: { type: String, enum: ['PAID', 'UNPAID'], default: 'UNPAID' },
    imageText: { type: String },
    image: { type: String }, // Assuming this will be an URL to the image
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User'  },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User'}
}, {
    timestamps: true
}); // This enables automatic timestamp generation



module.exports = mongoose.model('CashBackAttach', CashBackAttachSchema);
