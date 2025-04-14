// const User = require("../models/user");
// const express = require("express");
// const router = express.Router();
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const fs = require("fs");
// const os = require("os");
// const hostname = os.hostname();
// const MyMail = require("../mail");
// const _ = require("lodash");
// var multer = require("multer");
// const checkAuth = require("../middleware/check-auth");
// const Mail = require("nodemailer/lib/mailer");
// const axios = require('axios');
// const Flutterwave = require('flutterwave-node-v3');




// router.post("/response", async (req, res, next) => {
//     const { transaction_id } = req.query;
//     // const flw = new Flutterwave(PUBLIC_KEY, SECRET_KEY  );

//     // URL with transaction ID of which will be used to confirm transaction status
//     const url = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;

//     // Network call to confirm transaction status
//     const response = await axios({
//         url,
//         method: "get",
//         headers: {
//         "Content-Type": "application/json",
//         Accept: "application/json",
//         Authorization: `${process.env.FLUTTERWAVE_V3_SECRET_KEY}`,
//         },
//     });

//     const { status, currency, id, amount, customer } = response.data.data;

//     // check if customer exist in our database
//     const user = await User.findOne({ email: customer.email });

//     // check if user have a wallet, else create wallet
//     const wallet = await validateUserWallet(user._id);

//     // create wallet transaction
//     await createWalletTransaction(user._id, status, currency, amount);

//     // create transaction
//     await createTransaction(user._id, id, status, currency, amount, customer);

//     await updateWallet(user._id, amount);

//     return res.status(200).json({
//         response: "wallet funded successfully",
//         data: wallet,
//     });
// });
  
// // Validating User wallet
// const validateUserWallet = async (userId) => {
//     try {
//       // check if user have a wallet, else create wallet
//       const userWallet = await Wallet.findOne({ userId });
  
//       // If user wallet doesn't exist, create a new one
//       if (!userWallet) {
//         // create wallet
//         const wallet = await Wallet.create({
//           userId,
//         });
//         return wallet;
//       }
//       return userWallet;
//     } catch (error) {
//       console.log(error);
//     }
//   };
  
//   // Create Wallet Transaction
//   const createWalletTransaction = async (userId, status, currency, amount) => {
//     try {
//       // create wallet transaction
//       const walletTransaction = await WalletTransaction.create({
//         amount,
//         userId,
//         isInflow: true,
//         currency,
//         status,
//       });
//       return walletTransaction;
//     } catch (error) {
//       console.log(error);
//     }
//   };
  
//   // Create Transaction
//   const createTransaction = async (
//     userId,
//     id,
//     status,
//     currency,
//     amount,
//     customer
//   ) => {
//     try {
//       // create transaction
//       const transaction = await Transaction.create({
//         userId,
//         transactionId: id,
//         name: customer.name,
//         email: customer.email,
//         phone: customer.phone_number,
//         amount,
//         currency,
//         paymentStatus: status,
//         paymentGateway: "flutterwave",
//       });
//       return transaction;
//     } catch (error) {
//       console.log(error);
//     }
//   };
  
//   // Update wallet 
//   const updateWallet = async (userId, amount) => {
//     try {
//       // update wallet
//       const wallet = await Wallet.findOneAndUpdate(
//         { userId },
//         { $inc: { balance: amount } },
//         { new: true }
//       );
//       return wallet;
//     } catch (error) {
//       console.log(error);
//     }
//   };
