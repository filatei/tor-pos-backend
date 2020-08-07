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
    console.log(fileName)
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

 
 let products = order.products 

 let product = `<table style="margin-left:auto; margin-right:auto"><thead><tr> <th>Product</th> <th></th> <th></th><th>Amount</th></tr></thead><tbody>`;
 let derived_total = 0
 products.forEach(p => {
  amount = (p.qty * p.price).toLocaleString();
  product += `<tr><td>${p.qty} x ${p.name} </td> <td colspan="3" style="text-align:right;">${amount} ${curr}</td><tr>`;
  derived_total += p.qty * p.price
 })
 derived_total = derived_total.toLocaleString();

 product += `</tbody><tfoot><tr><td colspan="4" style="text-align:right;" > Sum: ${derived_total} ${curr}</td></tr></tfoot></table>`;

 let html = `<!DOCTYPE html><html><body style="text-align:center;"><div style="margin-left:auto;margin-right:auto;"><img src=${logo} alt="logoimg" width="50"><p style="background:rgba(0, 128, 0,0.051); text-align:center;">${date}</p><div ><h2>ORDER CONFIRMED</h2><p> Hi ${customer},</p>`;
 html += `<p>We received your order # ${orderId} for ${curr} ${total.toLocaleString()} </p> <p>Factory Location: ${location}</p>`;
 html += `${product}`;
 html += `<table style="margin-left:auto; margin-right:auto"><tr><td><h3>Order summary</h3></td></tr><tr><td>Pay Type:</td><td> ${payType}</td></tr><tr><td> Subtotal:</td><td> ${curr} ${total.toLocaleString()} </td></tr>
 <tr> <td>Tax: </td><td>${curr} 0.00</td><tr> <tr><td>Total: </td><td>${curr} ${total.toLocaleString()}</td></tr></table>`;
 
 html += `<h4 style="background:rgba(0, 128, 0,0.033);text-align:center">ShopTorama - All rights reserved. ${new Date().getFullYear()}</h4> </div></body></html>`;

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
    error ? console.log(error) : console.log(response);
    smtpTransport.close();
  });
}

const checkAuth = require('../middleware/check-auth');

router.post('', checkAuth, upload.single('image'), function (req, res, next) {
  let path = ""
  let url= ""
  if (req.file) { 
    if (hostname.includes('torama.ng')) {
      path = 'https://api.torama.ng' + '/uploads/shoporderimages/' + req.file.filename;
    } else {
      url = req.protocol + '://' + req.get('host')
      path = url + '/uploads/shoporderimages/' + req.file.filename; 
    }
  }
  // console.log('path: ', path)
  // console.log('req.body', req.body)

  let shopObj = req.body;
  shopObj.creator = req.userData.userId;
  shopObj.orderId = new Date().getTime();
  
  // handle customer issues
  if ( !shopObj.customer || shopObj.customer === undefined )
    return res.status(500).json({message: 'check your data. empty customer?'});

  if (shopObj.card_number) {
    updateCustomerCard()
  }
  if ( typeof shopObj.customer != 'object')
    shopObj.customer = JSON.parse(shopObj.customer);

  if ( typeof shopObj.driver != 'object')
    shopObj.driver = JSON.parse(shopObj.driver);
    shopObj.driver = shopObj.driver.name

  // if (!shopObj.driver._id) {
  //   console.log ('saving new driver..', shopObj.driver)
  //   saveDriver(shopObj.driver)
  // } else {
  //   shopObj.driver = shopObj.driver._id;
  // }

  if (shopObj.customer._id){
    if (shopObj.contactEmail || shopObj.contactPhone) {
      updateCustomer(shopObj.customer)
    }
    console.log( 'customer already be in db')
    // store customer id and save claim
    shopObj.customer = shopObj.customer._id;
    saveOrder(shopObj);
    
  } else {
    // console.log( 'customer may not  be in db')
    // store customer name and return _id,  before save claim
    saveCustomer(shopObj.customer);
  }


  /**
   * saves customer cust to customer collection if not exist already
   * and sets claimObj.customer to savedcustomer._id
   * @param {*} cust 
   */
  function saveCustomer( cust ) {
    Customer.findOne({name: new RegExp('^'+cust.name+'$', "i")})
    .then( (result) => {
      if (result) {
        shopObj.customer = result._id
        saveOrder(shopObj)
      } else {
        let custObj = new Customer(cust);
        custObj.save()
        .then((sres) => {
          shopObj.customer = sres._id;
          saveOrder(shopObj)
        })
        .catch(err => {
          console.log(err, ' customer save err')
          // throw err
        })
      }
    })
    .catch( (err) => {
      console.log (err, 'customer find err')
      // throw err
    })
  }

  function updateCustomer( cust ) {
    Customer.updateOne({_id: cust._id}, cust)
    .then( (result) => {
      if (result.n > 0) {
        console.log('customer update 1 successful')
      } else { 
        console.log('customer update 1 unsuccessful')

      }
    })
    .catch(err => {
      console.log(err, ' customer save err')
      // throw err
    })
    
  }
    
  function saveOrder(shopObj) {
    const shoporder = new Order(shopObj);
    shoporder.image = path;

    shoporder.save()
    .then ((result)=> {
      console.log('order added', result)
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

  function updateCustomerCard() {
    let cust = shopObj.customer;
    let cardObj = {card_number: shopObj.card_number, card_bank: shopObj.card_bank, card_name: shopObj.card_name, card_type: shopObj.card_type};
    let found = false
    if (cust.cards && cust.cards.length > 0) {
      cust.cards.forEach(element => {
        if ( shopObj.card_number.includes(element.card_number)) {
          found = true;
        }
        
      });
      if (!found) {
        cust.cards.push(cardObj)
      }
    } else {
      cust.cards.push(cardObj);
    }
    Customer.updateOne({_id: cust._id}, cust)
    .then( (result) => {
      if (result.n > 0) {
        console.log('customer card update successful')
      } else {
        console.log('customer card update unsuccessful')

      }
    })
    .catch(err => {
      console.log(err, ' customer save err')
      // throw err
    })
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
    res.status(401).json({ message: "Not authorized!" });
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
