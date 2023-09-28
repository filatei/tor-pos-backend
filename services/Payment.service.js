const monnifService = require('./Monnify.service');

async function processPayment(productId, totalAmount,paymentReference, paymentDescription, customerName, customerEmail) {

    try {
        // create an order in your db with product id, trans ref, payment ref and status pending

        console.log(productId, totalAmount, paymentDescription, customerName, customerEmail, "productId, totalAmount, paymentDescription, customerName, customerEmail")

        if (!productId || !totalAmount || !paymentDescription || !customerName || !customerEmail) throw new Error('missing params in payment service')
        const response = await monnifService.initialiseTransaction(totalAmount, paymentReference, paymentDescription, customerEmail, customerName);
        console.log(response, "response")
        if (!response) throw new Error('no response in payment service')

        // we got a response from monnify
        if (Object.keys(response).length > 0) {
            const { checkoutUrl, transactionReference, paymentReference } = response;
            console.log(checkoutUrl, transactionReference, paymentReference, "checkoutURL, transRef, PayRef")
            // update order in db with ID by changing the status to AWAITING_PAYMENT
            return checkoutUrl;
        }

        return null;

    } catch (error) {
        console.log('error in payment service ', error)
        throw new Error(error)

    }

}

module.exports = {
    processPayment: processPayment
}