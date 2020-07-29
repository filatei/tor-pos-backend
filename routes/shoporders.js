const express = require("express");
const Order = require("../models/shoporder");
const Customer = require("../models/customer");

const router = express.Router();
const path = require('path')
const fs = require('fs')
const os = require("os");
const hostname = os.hostname();
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
  // if (shopObj.products) {
  //   shopObj.products = shopObj.products.map(p => {
  //     return {id:p._id, qty:p.qty, price:p.price, amount:p.amount}
  //   })
  // }
  // handle customer issues
  if ( !shopObj.customer || shopObj.customer === undefined )
    return res.status(500).json({message: 'check your data. empty customer?'});
  if ( typeof shopObj.customer != 'object')
    shopObj.customer = JSON.parse(shopObj.customer);

  if ( typeof shopObj.driver != 'object')
    shopObj.driver = JSON.parse(shopObj.driver);

  if (!shopObj.driver._id) {
    saveDriver(shopObj.driver)
  }

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

  // drivers are also customers
  function saveDriver( drvr ) {
    Customer.findOne({name: new RegExp('^'+ drvr.name+'$', "i")})
    .then( (result) => {
      if (result) {
        shopObj.driver = result._id
      } else {
      let custObj = new Customer(drvr);
      custObj.save()
        .then((sres) => {
          shopObj.driver = sres._id;
        })
        .catch(err => {
          console.log(err, ' driver save err')
          // throw err
        })
      }
    })
    .catch( (err) => {
      console.log (err, 'driver find err')
      // throw err
    })
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
        console.log('customer update successful')
      } else {
        console.log('customer update unsuccessful')

      }
    })
    .catch(err => {
      console.log(err, ' customer save err')
      // throw err
    })
  }
    
  function saveOrder(shopObj) {
    const shoporder = new Order(shopObj);
    shoporder.icon = path;

    shoporder.save()
    .then ((result)=> {
      res.status(201).json({
        message: 'Order added successfully',
        shoporder: {...result,
          id: result.id
        }
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Creating a shoporder failed! " + error
      });
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
      shoporder.icon = path;
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
    filePath = 'uploads/' + shoporder.icon.split('/uploads/')[1];
    console.log(filePath)
  })
  .catch(err => {
    return res.status(401).json({ message: "shoporder not found in db!" + err });
  })
  // console.log('params ', req.params)
  Order.deleteOne({ _id: req.params.id })
  .then(result => {
  if (result.n > 0) {
    // delete shoporder.icon
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(err)
      }
      console.log('related file deleted')
    })
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
