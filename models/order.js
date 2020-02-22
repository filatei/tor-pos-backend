const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    cartItems: [{}],
    customer: {type: String, required: true},
    userId: String,
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},

    tellerId: String,
    payMethod: {type: String, required: true},
    site: String,
    taxAmount: Number,
    amountAfterTax: Number,
    taxRate: Number,
    amount: {type: Number, required: true},
    amountPaid: {type: Number, required: true},
    createdAt: Number,
    updatedAt: Number,
    status: String,
    orderRef: String,
    updateLog: [{
        date: Number,
        userid: String,
        prevValues: {},
        newValues: {}
    }]

});

module.exports = mongoose.model('Order', orderSchema)