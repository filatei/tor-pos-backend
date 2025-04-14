
const express = require("express");
const router = express.Router();
const multer = require("multer");
const FidoOrder = require("../models/fidoorder");

const os = require("os");
const HOSTNAME = os.hostname();
const homedir = os.homedir();
const tokens = require(`${homedir}/.token.json`)

const User = require('../models/user');

const axios = require("axios");

// const helmet = require("helmet");
const monnifyService = require('../services/Monnify.service');
const paymentService = require('../services/Payment.service');
const checkAuth = require("../middleware/check-auth");

router.post("/process-payment", checkAuth, async (req, res) => {
    try {
        // protected by auth middleware
        const { paidAmount, reference , trans_date, products, paymentMethod, customer, customerName, terminal_location} = req.body;
        let totalAmount = paidAmount;
        let paymentDescription = `${customerName} payment for ${products.length} products`;
        let paymentReference = reference;
       
        // where is order id?
        const order = new FidoOrder({
            products, txn_amount: paidAmount, tx_ref: reference, paymentMethod, customer: customer, trans_date,
            terminal_location, site: terminal_location, status: "AWAITING_PAYMENT"
        })

        const user = await User.findById(req.userData.userId);
        if (!user) return res.status(400).json({ success: false, message: "user not found" })

        order.userName = user.name
        order.orderType = "NORMAL"
        order.creator = user._id
        order.balance = 0;
        // console.log(user, "user monnifyController")

        const savedOrder = await order.save();
        let productId = order._id;
        
        // console.log(req.body, "req.body in monnifyController")
        // console.log(order, "order in monnifyController")

       
        
        const customerEmail = user.email;
        // const phoneNumber = user.phoneNumber;
        if (!totalAmount || !paymentDescription || !customerName || !customerEmail || !productId) {
            return res.status(400).json({ success: false, message: "missing params in payment service" });
        }

        const checkoutUrl = await paymentService.processPayment(productId, totalAmount, paymentReference, paymentDescription, customerName, customerEmail);

        if (checkoutUrl === null) {
            res.send('Error processing payment. Try again').status(400);
        }

        console.log(checkoutUrl, "checkoutUrl")

        return res.status(200).json({ success: true, checkoutUrl: checkoutUrl });

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "payment failed   " + error });
    }
});

router.post("/verify-payment", async (req, res) => {
    try {
        const { reference } = req.query;

        //  use reference to query database for payment record
        const response = new Object();
        //  to do more

        return res.status(200).json({ success: true, message: "payment verified", response });

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "payment verification failed   " + error });
    }
});

router.post("/webhook", async (req, res) => {
    try {
        res.status(200);
        // console.log(req.body, "req.body in webhook")

        const webhookResult = await monnifyService.handleWebhook(req.body)


    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "webhook failed   " + error });
    }
});

module.exports = router;

