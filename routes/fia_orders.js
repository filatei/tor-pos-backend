const express = require("express");
const Order = require("../models/fia_order");
const moment = require("moment");
const Customer = require("../models/fia_customer");
const User = require("../models/fia_user");
const _ = require("lodash");

const router = express.Router();
const Path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();
const tokens = require(`${homedir}/.token.json`);
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const Utils = require("../utils");


const Flutterwave = require('flutterwave-node-v3');
let flw;
if (hostname.includes('torama.ng')) {
   flw = new Flutterwave(tokens.FLW_PUBLIC_KEY, tokens.FLW_SECRET_KEY);

} else {
   flw = new Flutterwave(tokens.FLW_PUBLIC_KEY_TEST, tokens.FLW_SECRET_KEY_TEST);
}



var multer = require("multer");
const DIR = "/var/www/uploads/fia_images/";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(DIR)) {
        fs.mkdirSync(DIR, { recursive: true });
      }
    } catch (err) {
      throw err;
    }
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    let ext = Path.extname(file.originalname);
    if (!ext) {
      ext = ".png";
    }
    const fileName =
      new Date().getTime() +
      "-" +
      file.originalname.toLowerCase().split(" ").join("-") +
      ext;
    cb(null, fileName);
  },
});

// Multer Mime Type Validation
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/gif" ||
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .gif, .png, .jpg and .jpeg format allowed!"));
    }
  },
});


async function sendMail(order) {
  customer = await Customer.findById(order.customer).exec();
  customer = customer?.name;
  const smtpTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.tormail,
      clientId: tokens.clientID,
      clientSecret: tokens.clientSecret,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
    },
  });

  // some content
  let orderId = order?.orderId;
  let toEmail = order?.customer?.email 
  if (!toEmail) {
    toEmail =  "emptymail@torama.ng";
  }
  orderId = orderId.toString().padStart(8, "0");
  let subject = `ShopTorama Order Confirmation for Order (# ${orderId})`;
  let curr = order.curr || process.env.naira;
  let total = order.paidAmount;
  let payType = order.paymentMethod;
  if (order && order.creator) {
    user = await User.findById(order.creator);
    userName = user.name;
    userEmail = user.email;
  }

  let location = order?.terminal_location;
  let date = order.createdAt.toString() 
  if (!date) {
    date = new Date().toString();
  }
  let logo = "https://fido-api.torama.ng/uploads/productimages/fidologo.png";

  let products = order?.products;

  let product = `<table style="margin-left:auto; margin-right:auto"><thead><tr style="text-align:left;"> <th>Product</th> <th></th> <th></th><th>Amount</th></tr></thead><tbody>`;
  let derived_total = 0;
  products.forEach((p) => {
    amount = (p.qty * p.price).toLocaleString();
    product += `<tr style="text-align:left;"><td>${p.qty} x ${p.name} </td> <td colspan="3" style="text-align:right;">${amount} ${curr}</td><tr>`;
    derived_total += p.qty * p.price;
  });
  derived_total = derived_total.toLocaleString();

  product += `</tbody><tfoot><tr><td colspan="4" style="text-align:right;" > Sum: ${derived_total} ${curr}</td></tr></tfoot></table>`;

  let html = `<!DOCTYPE html><html><body style="text-align:center;"><img src="${logo}" alt="logoimg" width="50"><p style="background:rgba(0, 128, 0,0.051); text-align:center;">${date}</p><h2>ORDER CONFIRMED</h2><p> Hi ${customer},</p>`;
  html += `<p>We received your order # ${orderId} for ${curr} ${total.toLocaleString()} </p> <p>Factory Location: ${location}</p> <p>User: ${userName}</p>`;
  html += `${product}`;
  html += `<table style="margin-left:auto; margin-right:auto"><tr style="text-align:left;"><td><h3>Order summary</h3></td></tr><tr style="text-align:left;"><td>Pay Type:</td><td> ${payType}</td></tr><tr style="text-align:left;"><td> Subtotal:</td><td> ${curr} ${total.toLocaleString()} </td></tr>
 <tr style="text-align:left;"> <td>Tax: </td><td>${curr} 0.00</td></tr> <tr style="text-align:left;"><td>Total: </td><td>${curr} ${total.toLocaleString()}</td></tr></table>`;

  html += `<h4 style="background:rgba(0, 128, 0,0.033);text-align:center"> Powered by ShopTorama - All rights reserved. &#169; ${new Date().getFullYear()}</h4> </body></html>`;
  const mailOptions = {
    from: `ShopTorama ${process.env.tormail}`,
    to: toEmail,
    bcc: process.env.tormail,
    subject: subject,
    generateTextFromHTML: true,
    html: html,
  };

  // send mail
  smtpTransport.sendMail(mailOptions, (error, response) => {
    let result;
    if (error) {
      console.log(error);
      result = false;
    } else {
      result = true;
    }
    smtpTransport.close();
    return result;
  });
}

const checkAuth = require("../middleware/fia-check-auth");
router.post("", checkAuth, upload.single("image"), async (req, res, next) => {

  try {
    // const alloweds = ['ADMIN'];

  // if (!alloweds.includes(req.userData.role)) {
  //   return res.status(500).json({ message: "Not allowed to create Sales" });
  // }

  let url = "";
  let shopObj = req.body;
  // console.log(shopObj, 'shopobj')
  shopObj.paidAmount = parseInt(shopObj.paidAmount);
  shopObj.txn_amount = parseInt(shopObj.txn_amount);
  shopObj.response_frontend = JSON.parse(shopObj.response);
  Object.entries(shopObj).forEach(([key, value]) => {
    if (
      !value ||
      value === undefined ||
      value === null ||
      value === "null" ||
      value === "undefined"
    ) {
      delete shopObj[key];
    }
  });

  if (req.file) {
    if (hostname.includes("torama")) {
      url = "https://fido-api.torama.ng";
    } else {
      url = req.protocol + "://" + req.get("host");
    }
    myPath = url + "/" + req.file.path.split('/var/www/')[1];
    shopObj.image = myPath;
  }

  shopObj.creator = req.userData.userId;

  const transactionId = shopObj.response_frontend.transaction_id;
  flw.Transaction.verify({ id: transactionId })
    .then((response) => {
      shopObj.response_backend = response;
      
        if (
          
            response.data.status === "successful"
            && response.data.amount === shopObj.paidAmount
            && response.data.currency === shopObj.response_frontend.currency) {
              console.log(response, 'backend response')
              
              shopObj.charged_amount = response.data.charged_amount;
              shopObj.amount_settled = response.data.amount_settled;
              shopObj.status = 'PAID'
              saveOrder();
              
            // Success! Confirm the customer's payment
        } else {
            shopObj.status = 'NOT PAID';
            saveOrder()
            
            // Inform the customer their payment was unsuccessful
        }
    })
    .catch(err => {
      res.status(500).json({
        message: err
      })
    });

    function saveOrder() {
      const shoporder = new Order(shopObj);

              shoporder
                .save()
                .then(async (result) => {
                  console.log(result, 'result')
                  res.status(201).json({
                    message: "fiafia Order added successfully",
                    shoporder:result,
                    payStatus: shopObj.status
                  });
                  // sendMail(result);
                })
                .catch((error) => {
                  res.status(500).json({
                    message: "Creating a fiafia order failed! " + error,
                    
                  });
                });
    }
  
  
  // if (shopObj.action_taken === "PRODUCT RELEASED") {
  //   shopObj.status = "PAID";
  // } else {
  //   shopObj.status = "NOT PAID";
  // }

  // if (shopObj.customer && typeof shopObj.customer === "object") {
  //   shopObj.customer = shopObj.customer._id;
  // }

  // if (!shopObj.teller_id) {
  //   delete shopObj.teller_id;
  // }
  // let prods = [];
  // shopObj.products = JSON.parse(req.body.products);
  // shopObj.receipt = JSON.parse(req.body.receipt);
  // const geoLocation = JSON.parse(req.body.geoLocation);
  // shopObj.geoLocation = {
  //   latitude: geoLocation.latitude,
  //   longitude: geoLocation.longitude,
  // };
  
  
  } catch (error) {
    console.log(error)
  }
});


router.put("/:id", checkAuth, upload.single("image"), (req, res, next) => {
  let path = "";
  let url = "";
  let shopObj = req.body;
  const price = req.body.price;
  const status = req.body.status;
  const taxRate = req.body.taxRate;
  const description = req.body.description;
  const name = req.body.name;
  // const updatedAt = req.body.updatedAt;
  const updater = req.userData.userId;
  const id = req.params.id;
  shopObj._id = req.params.id;
  shopObj.updater = req.userData.userId;

  const shoporder = new Order(shopObj);
  if (req.file && req.file.filename && req.file.filename.length > 0) {
    if (hostname.includes("torama.ng")) {
      path =
        "https://fido-api.torama.ng" +
        "/uploads/shoporderimages/" +
        req.file.filename;
    } else {
      url = req.protocol + "s://" + req.get("host");
      path = url + "/uploads/shoporderimages/" + req.file.filename;
    }
    shoporder.image = path;
    Order.updateOne({ _id: req.params.id }, shoporder)
      .then((result) => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          message: "Couldn't update shoporder! " + error,
        });
      });
  } else {
    Order.updateOne(
      { _id: req.params.id },
      {
        name: name,
        price: price,
        description: description,
        taxRate: taxRate,
        status: status,
        updaters: shopObj.updaters,
      }
    )
      .then((result) => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          message: "Couldn't update shoporder! " + error,
        });
      });
  }
});
router.put(
  "/notes/:id",
  checkAuth,
  upload.single("image"),
  async function (req, res, next) {
    const alloweds = process.env.ALLOWEDS;

    if (!alloweds.includes(req.userData.email)) {
      return res.status(500).json({ message: "Not allowed" });
    }

    let updater = req.userData.userId;
    const note = req.body;
    if (req.file && req.file.filename && req.file.filename.length > 0) {
      if (hostname.includes("torama.ng")) {
        path =
          "https://fido-api.torama.ng" +
          "/uploads/shoporderimages/" +
          req.file.filename;
      } else {
        url = req.protocol + "://" + req.get("host");
        path = url + "/uploads/shoporderimages/" + req.file.filename;
      }
      note.image = path;
    }
    let recId = req.params.id;
    try {
      let orderObj = await Order.findById(recId);
      // send mail with Note image
      // let msent = await Mail.sendNote(note, expObj);

      let notes = orderObj.notes || [];
      if (notes && notes?.length) {
        notes.push(note);
      } else {
        notes = [note];
      }

      log = orderObj.log || [];

      log.push({
        updater: note.author,
        status: orderObj.status,
        date: new Date(),
        note,
      });
      Order.findByIdAndUpdate(
        { _id: recId },
        { notes: notes, updater: updater, log: log }
      )
        .then((result) => {
          res.status(201).json({
            message: " note with image updated successfully",
            order: {
              ...result,
              id: result._id,
            },
          });
        })
        .catch((error) => {
          res.status(500).json({
            message: "Creating an Image upload failed! " + error,
          });
        });
    } catch (err) {
      res.status(500).json({
        message: "Error with update in try block " + err,
      });
    }
  }
);

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    return res.status(500).json({ message: "Not allowed" });
  }

  let filePath;
  Order.findById(req.params.id)
    .then((shoporder) => {
      if (shoporder && shoporder.image) {
        filePath = "uploads/" + shoporder.image.split("/uploads/")[1];
      }
    })
    .catch((err) => {
      return res
        .status(401)
        .json({ message: "shoporder not found in db!" + err });
    });
  Order.deleteOne({ _id: req.params.id })
    .then((result) => {
      if (result.n > 0) {
        // delete shoporder.image
        if (filePath) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(err);
            }
            console.log("related file deleted");
          });
        }

        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res
          .status(401)
          .json({ message: "deletion failed ...id may not exist!" });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        message: "Deleting shoporder failed! " + error,
      });
    });
});

router.get("", (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const shoporderQuery = Order.find()
    .lean()
    .sort({ createdAt: -1 })
    .populate("customer")
    .populate("creator")
    .populate("terminal_id");
  if (pageSize && currentPage) {
    shoporderQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  shoporderQuery
    .then((documents) => {
      res.status(200).json({
        message: "Orders fetched successfully!",
        shoporders: documents,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching shoporders failed! " + error,
      });
    });
});

router.get("/bydate", checkAuth, async (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    return res.status(500).json({ message: "Not allowed" });
  }
  //  given a date, return all receipts for day

  try {
    const { date } = req.query;
    let ddate = date.split("T")[0];
    var start = moment(ddate).startOf("day");

    // end day
    var end = moment(ddate).endOf("day");
    let dayData = await Order.find({
      createdAt: { $gte: start, $lt: end },
    })
      .lean()
      .sort({ createdAt: -1 })
      .populate("customer")
      .populate("creator")
      .populate("terminal_id");
    if (dayData) {
      return res.status(200).json({ records: dayData });
    } else {
      return res.status(500).json({ message: "empty day data" });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error with  daily try block " + err });
  }
});

router.get("/:id", (req, res, next) => {
  Order.findById(req.params.id)
    .populate("creator")
    .populate("customer")
    .populate("terminal_id")
    .then((shoporder) => {
      if (shoporder) {
        res.status(200).json(shoporder);
      } else {
        res.status(404).json({ message: "shoporder not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching shoporder failed! " + error,
      });
    });
});

module.exports = router;
