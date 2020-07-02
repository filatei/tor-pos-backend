const mongoose = require('mongoose');
uniqueValidator = require('mongoose-unique-validator');

const receiptSchema = mongoose.Schema({
    orderId: {type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true},
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

receiptSchema.index({ stan: 'text', terminal_location: 'text', acquirer: 'text',
    card_number: 'text', action_taken: 'text', customer: 'text'
})

const rc = mongoose.model('Receipt', receiptSchema)
rc.createIndexes();

receiptSchema.plugin( uniqueValidator );

module.exports = mongoose.model('Receipt', receiptSchema)