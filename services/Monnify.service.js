

const axios = require("axios");
// const cacheService = require('./Cache.service');

const os = require("os");
const HOSTNAME = os.hostname();
const homedir = os.homedir();
const tokens = require(`${homedir}/.token.json`)


const apiKey = tokens.MONNIFY_API_KEY_PROD;
const apiSecret = tokens.MONNIFY_SECRET_KEY_PROD;
const baseUrl = tokens.MONNIFY_BASE_URL_PROD;
const monnifyContractCode = tokens.MONNIFY_CONTRACT_CODE_PROD;
// const Ticket = require('../Models/Ticket.model');
// const User = require('../model/User.model');
const User = require('../models/user')
const FidoOrder = require('../models/fidoorder')

let redirectUrl;

console.log(process.env.NODE_ENV, "process.env.NODE_ENV")

if (process.env.NODE_ENV === 'production') {
    redirectUrl = process.env.REDIRECT_URL_PROD;
} else {
    redirectUrl = process.env.REDIRECT_URL_DEV;
}
redirectUrl = process.env.REDIRECT_URL_PROD;

async function authenticate() {
    try {
        // const cachedAccessToken = await cacheService.get('monnifyAccessToken');
        // if (cachedAccessToken) {
        //     return cachedAccessToken;
        // }

        const clientIDSecretInBase64 = Buffer.from(apiKey + ':' + apiSecret).toString('base64');

        const headers = {
            Authorization: 'Basic ' + clientIDSecretInBase64
        }
        const response = await axios.post(baseUrl + '/api/v1/auth/login', null, { headers });
        const { responseBody } = response.data;
        const { accessToken, expiresIn } = responseBody;

        // await cacheService.set('monnifyAccessToken', accessToken, expiresIn);

        return accessToken;
    } catch (error) {
        console.error('Error authenticating on Monnify. Monnify error: ', error.response.data.responseMessage);
        console.error('Error authenticating on Monnify. Server error: ', error.message);
    }
}

async function initialiseTransaction(totalAmount, paymentReference, paymentDescription, customerEmail, customerName ) {
    // totalAmount, paymentReference, paymentDescription, customerEmail, customerName
    try {
        const dataToSend = {
            "amount": totalAmount,
            "customerName": customerName,
            "customerEmail": customerEmail,
            "paymentReference": paymentReference,
            "paymentDescription": paymentDescription,
            "currencyCode": "NGN",
            "contractCode": monnifyContractCode,
            "redirectUrl": redirectUrl,
            // "paymentMethods": [monnifyCardPaymentMethod, monnifyAccountTransferPaymentMethod]
        }

        // console.log(dataToSend, "dataToSend")
        const accessToken = await authenticate();
        // console.log(accessToken, "accessToken")

        const headers = {
            Authorization: 'Bearer ' + accessToken
        }
        const response = await axios.post(baseUrl + '/api/v1/merchant/transactions/init-transaction', dataToSend, { headers });
        const { responseBody } = response.data;

        // console.log(responseBody, "responseBody")

        return responseBody;

    } catch (error) {
        console.error('Error initialising Monnify transaction. Monnify error: ', error.response.data.responseMessage);
        console.error('Error initialising Monnify transaction. Server error: ', error.message);
    }
}

async function handleWebhook(webhookData) {
    // console.log(webhookData, 'webhookData');
    const { eventData } = webhookData;
    const { paymentReference, amountPaid, paymentStatus,
        customer, totalPayable,
        paymentDescription, destinationAccountInformation,
        settlementAmount } = eventData;
    console.log(eventData, 'eventData');
    const user = await User.findOne({ email: customer.email });
    const order = await FidoOrder.findOne({ tx_ref: paymentReference })
    // console.log(order, 'order in db');

    if (eventData.paymentStatus === 'PAID') {
        order.status = 'PAID';
        order.paidAmount = eventData.amountPaid;
        
    } else if (eventData.paymentStatus === 'FAILED') {
        order.status = 'FAILED';
    }

    order.platform_data = eventData;
    const saveOrder = await order.save();
    // console.log(saveOrder, 'saveOrder');
    // send websocket notification to client


    // const ticket = new Ticket({
    //     platform: 'MONNIFY', user_id: user._id,
    //     paymentDetails: eventData, amount: amountPaid, paymentDescription: paymentDescription,
    //     reference: paymentReference, status: paymentStatus
    // })
    // const paid = await ticket.save()
    // console.log(paid, "paid")
    return "something"
}

module.exports = {
    authenticate: authenticate,
    initialiseTransaction: initialiseTransaction,
    handleWebhook: handleWebhook
}