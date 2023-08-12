const express = require("express");
const router = express.Router();
const multer = require("multer");
const ToramaPay = require("../models/toramapay"); 
const os = require("os");
const HOSTNAME = os.hostname();
const axios = require("axios");

const multerConfig = require("../config/multer-config");
const DIR = "/var/www/uploads/toramapay/";
const upload = multerConfig(DIR);

const checkAuth = require("../middleware/check-auth");

// const generateAuthHeader = require('../utils/mastercard-auth');




// POST Route
router.post("", checkAuth, upload.single("image"), async (req, res) => {
  try {
    // const str = `
    // curl https://ap-gateway.mastercard.com/api/nvp/version/72 \
    //     -d "apiOperation=INITIATE_CHECKOUT" \
    //     -d "apiPassword=$PWD" \
    //     -d "apiUsername=merchant.<your_merchant_id>" \
    //     -d "merchant=<your_merchant_id>" \
    //     -d "interaction.operation=AUTHORIZE" \
    //     -d "interaction.merchant.name=<your_merchant_name>" \
    //     -d "order.id=<unique_order_id>" \
    //     -d "order.amount=100.00" \
    //     -d "order.currency=USD" \
    //     -d "order.description=<description_of_order>"`;

    // const merchantId = "TESTFIDO0001"; // your merchant id

    // const url = `https://ap-gateway.mastercard.com/api/rest/version/73/merchant/${merchantId}/session`

    // const pay = new ToramaPay(req.body);

    // const saved = await pay.save();

    
    // return res.status(200).json({
    //   record: saved,
    //   message: "pay saved successfully.",
    // });
  } catch (error) {
    // console.error(error);
    // res.status(500).json({ message: `Server error: ${error.message}` }); // show error message for better debugging
  }
});

router.post('/initiate-checkout', async (req, res) => {
    // try {

    //     console.log( req.body, 'initiate-checkout');
    //     const authHeader = generateAuthHeader();
    //     console.log(authHeader, 'authHeader'); // works fine

    //     const orderId = '12'; // Generate or obtain from request
    //     const amount = '100.00'; // You might want to get this from the request too
    //     const currency = 'NGN';
    //     const description = 'Torama Test Order';

    //     const apiPassword = "mBLJKAwUk7pc9c7bw9CH";
    //     const merchantId = 'e98e77ea-be64-44c5-b7f0-67eb0fc35b9f';
    //     const merchantName = 'Torama Financial Services';
    //     // const url = "https://sandbox.api.mastercard.com/merchant-identifier";
    //     const merchant_descriptor = "merchant_descriptor=DOLIUMPTYLTDWELSHPOOLWA";
    //     const match_type = "match_type=ExactMatch";
    //     const url = `https://sandbox.api.mastercard.com/merchant-identifier/merchants?merchant_descriptor=${merchant_descriptor}&match_type=${match_type}`
        

    
    //     // const response = await axios.post('https://ap-gateway.mastercard.com/api/nvp/version/72', null, {
    //     const response = await axios.post(url, null, {
    //             params: {
    //       apiOperation: 'INITIATE_CHECKOUT',
    //       apiPassword: apiPassword,
    //       apiUsername: `merchant.${merchantId}`,
    //       merchant: merchantId,
    //       'interaction.operation': 'AUTHORIZE',
    //       'interaction.merchant.name': merchantName,
    //       'order.id': orderId,
    //       'order.amount': amount,
    //       'order.currency': currency,
    //       'order.description': description
    //     }
    //   });
    //   console.log(response.data, 'response.data')
  
    //   res.status(200).json(response.data);
    // } catch (error) {
    //   console.error(error);
    //   res.status(500).json({message:'An error occurred ' + error});
    // }
  });



module.exports = router;
