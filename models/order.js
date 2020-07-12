const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');

const orderSchema = mongoose.Schema({
    cartItems: [{}],
    customer: {type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true},
    customerName: {type: String, required: true},
    userId: String,
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    tellerId: String,
    payMethod: {type: mongoose.Schema.Types.ObjectId, ref: 'Paymethod', required: true},
    bankName: {type: String, required: true},
    site: String,
    taxAmount: Number,
    amountAfterTax: Number,
    taxRate: Number,
    amount: {type: Number, required: true},
    amountPaid: {type: Number, required: true},
    createdAt: Number,
    updatedAt: Number,
    status: String,
    orderRef: {type: String, required: true, unique: true},
    updateLog: [{
        date: Number,
        userid: String,
        prevValues: {},
        newValues: {}
    }]

},
{
    timestamp: true
}
);

orderSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Order', orderSchema)