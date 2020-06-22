require('dotenv').config();
const express = require("express");
const Recupload = require("../models/recupload");
const Customer = require("../models/customer");
const router = express.Router();
const fs = require('fs');
const mime = require('mime');
var sanitize = require('mongo-sanitize');

const env = process.env.NODE_ENV || 'development';

var multer  = require('multer')
const DIR = './uploads/recuploads/';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // console.log('req ', req.userData)
    userid = req.userData.userId
    const myDir = DIR + userid + '/'
    try {
      if (!fs.existsSync(myDir)){
        fs.mkdirSync(myDir, {recursive: true});
      }
    }
    catch (err) {
      throw err
    }
    cb(null, myDir);
  },
  filename: (req, file, cb) => {
    const fileName = req.userData.userId + '-' + new Date().getTime() + file.originalname.toLowerCase().split(' ').join('-');
   
    cb(null, fileName)
  }
});

// Multer Mime Type Validation
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 2
  },
  fileFilter: (req, file, cb) => {
    // console.log(file.mimetype)
    if (file.mimetype == "image/png" || file.mimetype == "image/jpeg" || file.mimetype == "image/jpg") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only .png or .jpg format allowed!'));
    }
  }
});

const checkAuth = require('../middleware/check-auth');

router.post('', checkAuth, upload.any(), function (req, res, next) {

  const alloweds = process.env.ALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
     return res.status(500).json({message: 'Not allowed'});
  }

  let recObj = req.body;
  if ( !recObj.customer || recObj.customer === undefined )
    return res.status(500).json({message: 'check your data. empty customer?'});

  if ( typeof recObj.customer != 'object')
    recObj.customer = JSON.parse(recObj.customer);
  
  recObj.userid = req.userData.userId;
  recObj.products = JSON.parse(recObj.products)

  if (req.files) {
    let fileName;
    req.files.forEach(file => {
        console.log(file, ' file in array')
        if (file.originalname == 'blob') {
            fileName = 'uploads/recuploads/'  + req.userData.userId + '/' + file.filename 
        } else {
            fileName = 'uploads/recuploads/'  + req.userData.userId + '/' + file.filename
        }

        url = req.protocol + '://' + req.get('host')
        // url = 'https://api.torama.ng'    
        path = url + '/' + fileName;

        if (file.fieldname === 'image') {
            recObj.image = path;
        }
    })
  }
  
  if (recObj.customer._id){
    console.log( 'customer already be in db')
    // store customer id and save claim
    recObj.customer = recObj.customer._id;
    saveReceipt(recObj);
    
  } else {
    console.log( 'customer may not  be in db')
    // store customer name and return _id,  before save claim
    saveCustomer(recObj.customer);
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
      //  console.log(result, ' cust find result')
        recObj.customer = result._id
        saveReceipt(recObj)
      } else {
        let custObj = new Customer(cust);
        console.log(custObj, ' new customer obj')
        custObj.save()
        .then((sres) => {
         recObj.customer = sres._id;
          console.log(recObj, ' recObj in customerloop')
          saveReceipt(recObj)
        })
        .catch(err => {
          console.log(err, ' customer save err')
          // throw err
        })
      }
    })
    .catch( (err) => {
      console.log (err, 'customer find  find err')
      // throw err
    })
  }

  function saveReceipt(recobj) {
    receipt = new Recupload(recobj);
    console.log('receipt new ', receipt)
    receipt.save()
    .then(result => {
      res.status(201).json({
        message: 'Receipt  Uploaded successfully',
        Recupload: {
            ...result,
            id: result._id
        }
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Creating a Recupload failed! " + error
      });
    }); 
  }
  
})
 
router.delete("/:id", checkAuth, (req, res, next) => {
  let filePath;
  Recupload.findById(req.params.id)
  .then (company => {
    filePath = 'uploads/' + company.image.split('uploads')[1];
  })
  .catch(err => {
    return res.status(401).json({ message: "receipt not found in db!" });
  })
  // console.log('params ', req.params)
  Recupload.deleteOne({ _id: req.params.id })
  .then(result => {
  if (result.n > 0) {
    // delete product.icon
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
      message: "Deleting Company failed!"
    });
  });

 });

router.get('', (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const coyQuery = Recupload.find().sort({updatedAt:-1}).
  populate('customer')
  let fetchedRecords;
  if (pageSize && currentPage) {
    coyQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  coyQuery
    .then(documents => {
        console.log(documents.count)
        fetchedRecords = documents;
      return Recupload.countDocuments();
    })
    .then(count => {
      res.status(200).json({
        message: "records fetched successfully!",
        records: fetchedRecords,
        maxCount: count
      });
    })
   .catch(error => {
    res.status(500).json({
      message: "Fetching companies failed!"
    });
  });
});

router.get("/:id", (req, res, next) => {
    Recupload.findById(req.params.id).
    populate('customer')
    .then(record => {
      if (record) {
        res.status(200).json(record);
      } else {
        res.status(404).json({ message: "record not found!" });
      }
    }).catch(error => {
      res.status(500).json({
        message: "Fetching record failed!"
      });
    });
  });


router.put("/:id", checkAuth, (req, res, next) => {

  // const alloweds = ['filatei@torama.ng', 'eadekan@gtsng.com', 
  //         'ratimi@gtsng.com', 'dkings@gtsng.com', 'eforcados@gtsng.com', 
  //         'olawefaodumu@gmail.com', 'princess.filatei@gtsng.com'];
  const alloweds = process.env.ALLOWEDS

  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }

  // update bank debit status
  
  if (!req.body.customer) return res.status(500).json({message: 'Every Receipt must have a customber '});

  let formFields = Object.keys(req.body)  // an array

  // remove fields from req.body with empty conten
  let recObj = formFields.filter(key => req.body[key] !== '')
            .reduce((obj, key) => {
              obj[key] = req.body[key];
              return obj;
            }, {});

  // console.log(recObj)

  recObj._id = sanitize(req.params.id);

  // userData  was added to checkAuth middleware and passed along
  recObj.updater = req.userData.userId; 
    // console.log(claimObj.customer, typeof claimObj.customer)
  if (typeof recObj.customer != 'object')
    recObj.customer = JSON.parse(recObj.customer)

  if (recObj.customer._id){
    // console.log( 'customer  already be in db')
    // store customer id and save claim
    recObj.customer = recObj.customer._id;
    saveReceipt(recObj);
  } else {
   // console.log( 'customer may not  be in db')
    // store customer name and return _id,  before save claim
    saveCustomer(recObj.customer);
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
      //  console.log(result, ' cust find result')
        claimObj.customer = result._id
        saveReceipt(recObj)
      } else {
        let custObj = new Customer(cust);
       // console.log(custObj, ' new customer obj')
        custObj.save()
        .then((sres) => {
          recObj.customer = sres._id;
         //  console.log(claimObj, ' recObj in customerloop')
          saveReceipt(recObj)
        })
        .catch(err => {
          console.log(err, ' customer save err')
          // throw err
        })
      }
    })
    .catch( (err) => {
      console.log (err, 'customer find  find err')
      // throw err
    })
  }

  /**
   * saves recObj to Recuploads collection
   * @param {*} recobj 
   */
  function saveReceipt(recobj) {
      // handle image upload

    receipt = new Recupload(recobj);
    Recupload.updateOne({ _id: req.params.id }, { $set: receipt })
    .then(result => {
        // console.log(result)
      if (result.n > 0) {
        res.status(200).json({ message: "Update successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch(error => {
      console.log(error)
      res.status(500).json({
        message: "Couldn't udpate receipt! " + error
      });
    });
  }

});

  
module.exports = router;
