const express = require("express");
const Order = require("../models/shoporder");
const Customer = require("../models/customer");

const router = express.Router();
const path = require('path')
const fs = require('fs')
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();
const tokens = require(`${homedir}/.token.json`);
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

var multer  = require('multer')
const DIR = './uploads/shoporderimages/';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    const fileName =  new Date().getTime() + '-' + file.originalname.toLowerCase().split(' ').join('-');
    // console.log(fileName)
    cb(null, fileName)
  }
});

// Multer Mime Type Validation
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype == "image/gif" || file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only .gif, .png, .jpg and .jpeg format allowed!'));
    }
  }
});

const Accesslog = require("../models/accesslog");

function logIncident(email, description) {
  const logObj = new Accesslog({email: email, description: description})
  logObj.save(logObj).
  then(result => {
    console.log ('access incident logged for user', result)
  })
  .catch(err => {
    console.log ('access logging error for user ', err)
  })
}

async function sendMail(order) {
  // console.log(order.products)
  customer = await Customer.findById(order.customer).exec()
  customer = customer.name;
  const smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
          type: "OAuth2",
          user: process.env.tormail, 
          clientId: tokens.clientID,
          clientSecret: tokens.clientSecret,
          refreshToken: tokens.refresh_token,
          accessToken: tokens.access_token
      }
 });

 // some content
 let orderId = order.id 
 let toEmail = order.customer.email || 'emptymail@torama.ng';
 orderId = orderId.toString().padStart(5, '0')
 let subject = `ShopTorama Order Confirmation for Order (# ${orderId})`
 let curr = order.curr || process.env.naira
 let total = order.paidAmount;
 let payType = order.paymentMethod;
 
 let location = order.terminal_location;
 let date = (order.createdAt).toString() || new Date().toString();
 let logo = 'https://api.torama.ng/uploads/productimages/fidologo.png'
 // logo = "data:image/png;base64,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";

 let products = order.products 

 let product = `<table style="margin-left:auto; margin-right:auto"><thead><tr style="text-align:left;"> <th>Product</th> <th></th> <th></th><th>Amount</th></tr></thead><tbody>`;
 let derived_total = 0
 products.forEach(p => {
  amount = (p.qty * p.price).toLocaleString();
  product += `<tr style="text-align:left;"><td>${p.qty} x ${p.name} </td> <td colspan="3" style="text-align:right;">${amount} ${curr}</td><tr>`;
  derived_total += p.qty * p.price
 })
 derived_total = derived_total.toLocaleString();

 product += `</tbody><tfoot><tr><td colspan="4" style="text-align:right;" > Sum: ${derived_total} ${curr}</td></tr></tfoot></table>`;

 let html = `<!DOCTYPE html><html><body style="text-align:center;"><img src="${logo}" alt="logoimg" width="50"><p style="background:rgba(0, 128, 0,0.051); text-align:center;">${date}</p><h2>ORDER CONFIRMED</h2><p> Hi ${customer},</p>`;
 html += `<p>We received your order # ${orderId} for ${curr} ${total.toLocaleString()} </p> <p>Factory Location: ${location}</p>`;
 html += `${product}`;
 html += `<table style="margin-left:auto; margin-right:auto"><tr style="text-align:left;"><td><h3>Order summary</h3></td></tr><tr style="text-align:left;"><td>Pay Type:</td><td> ${payType}</td></tr><tr style="text-align:left;"><td> Subtotal:</td><td> ${curr} ${total.toLocaleString()} </td></tr>
 <tr style="text-align:left;"> <td>Tax: </td><td>${curr} 0.00</td></tr> <tr style="text-align:left;"><td>Total: </td><td>${curr} ${total.toLocaleString()}</td></tr></table>`;
 
 html += `<h4 style="background:rgba(0, 128, 0,0.033);text-align:center"> Powered by ShopTorama - All rights reserved. &#169; ${new Date().getFullYear()}</h4> </body></html>`;
// console.log (html, 'html')
 const mailOptions = {
      from: `ShopTorama ${process.env.tormail}`,
      to: toEmail,
      bcc: process.env.tormail, 
      subject: subject,
      generateTextFromHTML: true,
      html: html
  };

  // send mail
  smtpTransport.sendMail(mailOptions, (error, response) => {
    let result;
    if (error) {
      console.log(error)
      result = false;
    } else {
      // console.log(response)
      result = true
    }
    smtpTransport.close();
    return result;
  });
}

const checkAuth = require('../middleware/check-auth');

router.post('', checkAuth, upload.single('image'), function (req, res, next) {

  const alloweds = process.env.SHOPALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to create Sales')
     return res.status(500).json({message: 'Not allowed to create Sales'});
  }

  let path = ""
  let url= ""
  let shopObj = req.body;
  shopObj.orderId = new Date().getTime();

  if ( !shopObj.customer || shopObj.customer === undefined ) {
    return res.status(500).json({message: 'check your data. empty customer?'});
  }

  if (req.file) { 
    if (hostname.includes('torama.ng')) {
      path = 'https://api.torama.ng' + '/uploads/shoporderimages/' + req.file.filename;
    } else {
      url = req.protocol + '://' + req.get('host')
      path = url + '/uploads/shoporderimages/' + req.file.filename; 
    }
    shopObj.icon = path;
  }
  // console.log('path: ', path)
  // console.log('req.body', req.body)

  shopObj.creator = req.userData.userId;
  let customerUpdate = false;
  
  // handle customer issues
  

  if (shopObj.card_number) {
    updateCustomerCard()
  }

  if ( typeof shopObj.customer != 'object') {
    shopObj.customer = JSON.parse(shopObj.customer);
  }
    
  if ( shopObj.driver && typeof shopObj.driver != 'object') {
    shopObj.driver = JSON.parse(shopObj.driver);
  }

  if ( shopObj.driver && typeof shopObj.driver === 'object' ) {
    shopObj.driver = shopObj.driver._id;
  }

  if ( shopObj.customer && typeof shopObj.customer === 'object' ) {
    shopObj.customer = shopObj.customer._id;
  }
  if (!shopObj.teller_id) { delete shopObj.teller_id}
  // console.log(shopObj)
  saveOrder(shopObj);
  
    
  function saveOrder(shopObj) {
    const shoporder = new Order(shopObj);
    shoporder.image = path;

    shoporder.save()
    .then ((result)=> {
      console.log('order added')
      res.status(201).json({
        message: 'Order added successfully',
        shoporder: {...result,
          id: result.id,
          paidAmount: result.paidAmount
        }
      });
      sendMail(result);
    })
    .catch(error => {
      res.status(500).json({
        message: "Creating a shoporder failed! " + error
      });
    });
  }

  
})

router.post('/mail', checkAuth, function (req, res, next) {
  let orderObj = req.body;
  orderObj.creator = req.userData.userId;
  
  if ( sendMail(orderObj) ) {
    return res.status(200).json({ message: "Mail Send successful!" });
  } else {
    res.status(500).json({
      message: "Mail Send unsuccessful" + error
    });
  }
  
})

router.put("/:id", checkAuth, upload.single('image'), (req, res, next) => {
    let path = ""
    let url= ""
    let shopObj = req.body;
    const price = req.body.price;
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
      if (hostname.includes('torama.ng')) {
        path = 'https://api.torama.ng' + '/uploads/shoporderimages/' + req.file.filename;
      } else {
        url = req.protocol + '://' + req.get('host')
        path = url + '/uploads/shoporderimages/' + req.file.filename; 
      }
      shoporder.image = path;
      Order.updateOne({ _id: req.params.id }, shoporder)
      .then(result => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch(error => {
        res.status(500).json({
          message: "Couldn't udpate shoporder! " + error
        });
      });
    } else {
      Order.updateOne({ _id: req.params.id }, 
        {name: name, price: price, description: description, taxRate: taxRate})
      .then(result => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch(error => {
        res.status(500).json({
          message: "Couldn't update shoporder! " + error
        });
      });
    }   
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to delete ')
     return res.status(500).json({message: 'Not allowed'});
  }

  let filePath;
  Order.findById(req.params.id)
  .then (shoporder => {
    if (shoporder && shoporder.image) {
      filePath = 'uploads/' + shoporder.image.split('/uploads/')[1];
      console.log(filePath)
    }
    
  })
  .catch(err => {
    return res.status(401).json({ message: "shoporder not found in db!" + err });
  })
  // console.log('params ', req.params)
  Order.deleteOne({ _id: req.params.id })
  .then(result => {
  if (result.n > 0) {
    // delete shoporder.image
    if (filePath) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(err)
        }
        console.log('related file deleted')
      })
    }
    
    res.status(200).json({ message: "Deletion successful!" });
  } else {
    res.status(401).json({ message: "deletion failed ...id may not exist!" });
  }
  })
  .catch(error => {
    console.error(error)
    res.status(500).json({
      message: "Deleting shoporder failed! " + error
    });
  });

 });

router.get('',(req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const shoporderQuery = Order.find().sort({createdAt:-1}).populate('customer').populate('creator');
  if (pageSize && currentPage) {
    shoporderQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  shoporderQuery
    .then(documents => {
      res.status(200).json({
        message: "Orders fetched successfully!",
        shoporders: documents
      });
    })
   .catch(error => {
    res.status(500).json({
      message: "Fetching shoporders failed! " + error
    });
  });
});

router.get("/:id", (req, res, next) => {
    Order.findById(req.params.id)
    .then(shoporder => {
      if (shoporder) {
        res.status(200).json(shoporder);
      } else {
        res.status(404).json({ message: "shoporder not found!" });
      }
    }).catch(error => {
      res.status(500).json({
        message: "Fetching shoporder failed! " + error
      });
    });
  });
  
module.exports = router;
