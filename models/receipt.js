const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');

const receiptSchema = mongoose.Schema({
    header: {
        company: String,
        address: {
            street: String,
            city: String,
            state: String,
            zipcode: String,
            country: String,
        },
        phone:String,
        email: String,
        site: String,
        customerName: String,
        userId: String,
        orderRef: String,
        tellerId: String,
        bankName: String,
        receiptRef: String,
        createDate: String,
    },
    mid: {
        cartItems: [{}],
        amount: Number,
        amountPaid: Number,
        taxAmount: Number,
        amountAfterTax: Number,
        status: String,
    },
    footer: String,

    reprint: Number,

});

receiptSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Receipt', receiptSchema)