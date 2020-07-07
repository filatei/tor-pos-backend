require('dotenv').config();
const express = require("express");
const Recupload = require("../models/recupload");
const Customer = require("../models/customer");
const router = express.Router();
const moment = require('moment')

const fs = require('fs');
const mime = require('mime');
const Accesslog = require("../models/accesslog");

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
    fileSize: 1024 * 1024 * 10
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

const checkAuth = require('../middleware/check-auth');
const { deleteReceipt } = require('../controllers/receipt');

router.post('', checkAuth, upload.any(), function (req, res, next) {

  const alloweds = process.env.ALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to create Receipts')
     return res.status(500).json({message: 'Not allowed'});
  }

  let recObj = req.body;
  console.log('before ',recObj)
  // convert to number what is number
  recObj.products = JSON.parse(recObj.products)
  recObj.products.map(p => {
    p.qty = parseInt(p.qty)
    p.price = parseInt(p.price)
  })
  recObj.txn_amount = parseInt(recObj.txn_amount)
  // if ( recObj.amt_teller)
  //   recObj.amt_teller = parseInt(recObj.amt_teller)
  // console.log('after ', recObj)
  
  if ( !recObj.customer || recObj.customer === undefined )
    return res.status(500).json({message: 'check your data. empty customer?'});

  if ( typeof recObj.customer != 'object')
    recObj.customer = JSON.parse(recObj.customer);
  
  // recObj.userid = req.userData.userId;
  recObj.creator = req.userData.userId;
 // recObj.products = JSON.parse(recObj.products)
  // convert to number what is number
  // recObj.products.map(p => {
  //   p.qty = parseInt(p.qty)
  //   p.price = parseInt(p.price)
  // })
  // recObj.txn_amount = parseInt(recObj.txn_amount)
  console.log(recObj)

  if (req.files) {
    let fileName;
    req.files.forEach(file => {
        // console.log(file, ' file in array')
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
        recObj.customer = result._id
        saveReceipt(recObj)
      } else {
        let custObj = new Customer(cust);
        custObj.save()
        .then((sres) => {
         recObj.customer = sres._id;
          saveReceipt(recObj)
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

  function saveReceipt(recobj) {
    receipt = new Recupload(recobj);
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

  if(!req.params.id) return res.status(401).json({error: 'empty id'});

  const alloweds = process.env.DELALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to delete Receipts')
     return res.status(500).json({message: 'Not allowed'});
  }

  let filePath;
  Recupload.findById(req.params.id)
  .then (company => {
    filePath = 'uploads/' + company.image.split('/uploads/')[1];
    console.log('filepath', filePath);
    deleteReceipt(filePath);
  })
  .catch(err => {
    return res.status(401).json({ message: "receipt not found in db!" + err });
  })

  function deleteReceipt(filepath) {
    Recupload.deleteOne({ _id: req.params.id })
    .then(result => {
    if (result.n > 0) {
      // delete product.icon
      fs.unlink(filepath, (err) => {
        if (err) {
          console.error(err)
          return;
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
        message: "Deleting receipt failed!"
      });
    });
  }
  

 });

 router.get('/summary', (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const coyQuery = Recupload.find().sort({updatedAt:-1})
  .populate('customer').populate('creator').populate('updater')

  /**
   * compute sum of all txn_amounts per site given
   * @param {*} site 
   * @param {*} receipts 
   */
  function computeTotal(site, receipts, action) {
    let sum = 0
    const rc = receipts.filter(r => r.terminal_location == site &&
          new Date(r.createdAt).toDateString() === new Date().toDateString() 
            && r.action_taken === action)
    rc.forEach( rrr => {
      sum += parseInt(rrr.txn_amount +'');
    })
    return sum
  }
  
  let fetchedRecords;
  if (pageSize && currentPage) {
    coyQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  coyQuery
    .then(documents => {
        console.log(documents.count)
        fetchedRecords = documents;
        // compute summaries

        const kptotToday = computeTotal('KPANSIA', fetchedRecords, 'PRODUCT RELEASED')
        const obtotToday = computeTotal('OBUNNA', fetchedRecords, 'PRODUCT RELEASED')
        const swtotToday = computeTotal('SWALI', fetchedRecords, 'PRODUCT RELEASED')
        const oktotToday = computeTotal('OKUTUKUTU', fetchedRecords, 'PRODUCT RELEASED')
        const ygtotToday = computeTotal('YENEGWE', fetchedRecords, 'PRODUCT RELEASED')
        const kptotDecToday = computeTotal('KPANSIA', fetchedRecords, 'PRODUCT NOT RELEASED')
        const obtotDecToday = computeTotal('OBUNNA', fetchedRecords, 'PRODUCT NOT RELEASED')
        const swtotDecToday = computeTotal('SWALI', fetchedRecords, 'PRODUCT NOT RELEASED')
        const oktotDecToday = computeTotal('OKUTUKUTU', fetchedRecords, 'PRODUCT NOT RELEASED')
        const ygtotDecToday = computeTotal('YENEGWE', fetchedRecords, 'PRODUCT NOT RELEASED')
        
        let result = {
          kpansia: kptotToday,
          kpansiadec: kptotDecToday,  

          swali: swtotToday,
          swalidec: swtotDecToday,

          okutukutu: oktotToday,
          okutukutudec: oktotDecToday,
          yenegwe: ygtotToday,
          yenegwedec: ygtotDecToday,
          obunna: obtotToday,
          obunnadec: obtotDecToday
          
        }
        console.log(result, 'result')
        res.status(200).json({
          message: "Summaries",
          records: result
        });

      // return Recupload.countDocuments();
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching records failed!" + error
      });
    });
});

router.get('', (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const site = req.query.site;
  const idate = req.query.idate
  const today = moment().startOf('day')
  let coyQuery 

  // condition for today results
  let cond1 = {
      createdAt: {
        $gte: today.toDate(),
        $lte: moment(today).endOf('day').toDate()
      }
  }
  // if (idate) {
  //   coyQuery = Recupload.find(cond1).sort({createdAt:-1}).
  //   populate('customer').populate('creator').populate('updater')

  // } else {
   

  // }

  coyQuery = Recupload.find().sort({createdAt:-1}).
  populate('customer').populate('creator').populate('updater')

  // console.log(new Date(idate), idate, site)
  
  // if (site && idate) {
  //    coyQuery = Recupload.find({terminal_location:site, createdAt:new Date(idate)}).sort({createdAt:-1}).
  //   populate('customer').populate('creator').populate('updater')
  // } else {
  //    coyQuery = Recupload.find().sort({createdAt:-1}).
  //   populate('customer').populate('creator').populate('updater')
  // }

  
  let fetchedRecords;
  if (pageSize && currentPage) {
    coyQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  coyQuery
    .then(documents => {
       //  console.log(documents.count)
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
router.get("/getByText", (req, res, next) => {
  let stan = req.query.stan
  // get array
  let records 
  Recupload.find().populate('customer')
        .then( rec => {
          records = rec.filter(r => r.customer.name.toLowerCase().includes(stan.toLowerCase()))
          console.log(records)
          Recupload.find({ $text: { $search: stan } }).populate('customer')
            .then(record => {
              if (record) {
                res.status(200).json([...record, ...records]);
              } else {
                res.status(404).json({ message: "record not found!" });
              }
            }).catch(error => {
              res.status(500).json({
                message: "Fetching record failed!" + error
              });
            });
        })
        .catch(error => {
          res.status(500).json({
            message: "Fetching record failed!" + error
          });
        });
  
  
});
router.get("/:id", (req, res, next) => {
    Recupload.findById(req.params.id).
    populate('customer')
    .populate('creator')
    .populate('updater')
    .then(record => {
      if (record) {
        res.status(200).json(record);
      } else {
        res.status(404).json({ message: "record not found!" });
      }
    }).catch(error => {
      res.status(500).json({
        message: "Fetching record failed!" + error
      });
    });
  });


router.put("/:id", checkAuth, (req, res, next) => {

  // const alloweds = ['filatei@torama.ng', 'eadekan@gtsng.com', 
  //         'ratimi@gtsng.com', 'dkings@gtsng.com', 'eforcados@gtsng.com', 
  //         'olawefaodumu@gmail.com', 'princess.filatei@gtsng.com'];
  const alloweds = process.env.ALLOWEDS

  if ( !alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to update Receipts')
    return res.status(500).json({message: 'Not allowed'});
  }

  // update bank debit status
  
  if (!req.body.customer) return res.status(500).json({message: 'Every Receipt must have a customber '});

  let formFields = Object.keys(req.body)  // an array

  // remove fields from req.body with empty content
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

router.put('/imageupdate/:id', checkAuth, upload.any(), function (req, res, next) {
  const alloweds = process.env.ALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to create Receipts')
     return res.status(500).json({message: 'Not allowed'});
  }

  let updater = req.userData.userId;
  
  if (req.files) {
    let fileName;
    req.files.forEach(file => {
        // console.log(file, ' file in array')
        if (file.originalname == 'blob') {
            fileName = 'uploads/recuploads/'  + req.userData.userId + '/' + file.filename 
        } else {
            fileName = 'uploads/recuploads/'  + req.userData.userId + '/' + file.filename
        }

        url = req.protocol + '://' + req.get('host')
        // url = 'https://api.torama.ng'    
        path = url + '/' + fileName;

        // if (file.fieldname === 'image') {
        //     recObj.image = path;
        // }
    })
  }
  
  let recId = req.params.id
  Recupload.findByIdAndUpdate({ _id: recId },{"image": path, "updater": updater})
  .then( result => {
    res.status(201).json({
      message: 'Receipt  image updated successfully',
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
})


  
module.exports = router;
