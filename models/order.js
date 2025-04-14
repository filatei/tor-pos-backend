const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require("mongoose-sequence")(mongoose);


const orderSchema = mongoose.Schema({
    cartItems: [{}],
    customer: {type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true},
    customerName: {type: String},
    userId: String,
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    updater: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    tellerId: String,
    payMethod: {type: mongoose.Schema.Types.ObjectId, ref: 'Paymethod'},
    bankName: {type: String},
    site: String,
    userName: String,
    taxAmount: Number,
    amountAfterTax: Number,
    taxRate: Number,
    amount: {type: Number},
    amountPaid: {type: Number},
    paidAmount: {type: Number},
    txn_amount: {type: Number},
    createdAt: Number,
    updatedAt: Number,
    status: String,
    trans_date: Date,
    orderRef: {type: String},
    updateLog: [{
        date: Number,
        userid: String,
        prevValues: {},
        newValues: {}
    }]

},
{
    timestamps: true
}
);

orderSchema.plugin( uniqueValidator );
orderSchema.plugin(AutoIncrement, { inc_field: "order_id" });

module.exports = mongoose.model('Order', orderSchema)