require('dotenv').config();
const express = require("express");
const Claim = require("../models/claim");
const Accesslog = require("../models/accesslog");
const Customer = require("../models/customer");
const router = express.Router();

const fs = require('fs');
const mime = require('mime');
const checkAuth = require('../middleware/check-auth');
var sanitize = require('mongo-sanitize');

// multer
var multer  = require('multer')
const DIR = './uploads/claims/';
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

router.post('', checkAuth, upload.any(), function (req, res, next) {
    let claimObj = req.body;
  // console.log('reqbody', claimObj)
  // userData was added to checkAuth middleware and passed along
  // console.log('userdata in claim ', req.userData.userId)
  claimObj.creator = req.userData.userId;
  const alloweds = process.env.CLAIMALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
     logIncident(req.userData.email, 'Not allowed to Add Claims')
     return res.status(500).json({message: 'Not allowed to Add Claims'});
  }

  if ( !claimObj.customer || claimObj.customer === undefined )
    return res.status(500).json({message: 'check your data. empty customer?'});

  claimObj.avatar = claimObj.stan + '.jpg'
  // file upload handing
  if (req.files) {
    // console.log('files', req.files)

    req.files.forEach(file => {
        console.log(file, ' file in array')
        if (file.originalname == 'blob') {
            fileName = 'uploads/claims/'  + req.userData.userId + '/' + file.filename 
        }
            
        else {
            fileName = 'uploads/claims/'  + req.userData.userId + '/' + file.filename
        }
       
        url = req.protocol + '://' + req.get('host')
        // url = 'https://api.torama.ng'

        path = url + '/' + fileName;

        if (file.fieldname === 'image') {
            claimObj.image = path;
        }
    })
  }
  // console.log(typeof claimObj.customer, claimObj.customer)

  if ( typeof claimObj.customer != 'object')
    claimObj.customer = JSON.parse(claimObj.customer);

  if (claimObj.customer._id){
    // console.log( 'customer may already be in db')
    // store customer id and save claim
    claimObj.customer = claimObj.customer._id;
    saveClaim(claimObj);
  } else {
    console.log( 'customer may not  be in db')
    // store customer name and return _id,  before save claim
    saveCustomer(claimObj.customer);
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
        // console.log(result, ' cust find result')
        claimObj.customer = result._id
        saveClaim(claimObj)
      } else {
        let custObj = new Customer(cust);
        //  console.log(custObj, ' new customer obj')
        custObj.save()
        .then((sres) => {
          claimObj.customer = sres._id;
          //  console.log(claimObj, ' claimobj in customerloop')
          saveClaim(claimObj)
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

  function saveClaim(claimobj) {
    claim = new Claim(claimobj);
    //  console.log('claim new ', claim)
    claim.save()
    .then(result => {
      res.status(201).json({
        message: "Creating  claim succeeded!" + result
      });
    })
    .catch(error => {
      // console.error(error )
      res.status(500).json({
        message: "Creating a claim failed! " + error 
      });
    }); 
  }

  
    
})

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = ['filatei@torama.ng', 'princess.filatei@gtsng.com'];

  if ( !alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to Delete Claim')
    return res.status(500).json({message: 'Not allowed'});
  }
  Claim.deleteOne({ _id: req.params.id }).then(result => {
    //  console.error('claim deleted ', result)
    if (result.n == 1 && result.deletedCount == 1) {
      // console.log(' claim deleted :', result.deletedCount)
      return res.status(200).json({ message: "Claim deleted! " + result });
    }
    else {
      return res.status(401).json({ message: "Not Authorised!" });
    }
  })
    .catch(error => {
      return res.status(500).json({
        message: "Deleting claim failed! - " + error
      });
    });
  
});
  
router.get('',(req, res, next) => {
    const pageSize = +req.query.pagesize;
  const dateBegin = req.query.datebegin;
  const dateEnd = req.query.dateend;
  const currentPage = +req.query.page;
  const claimQuery = Claim.find().sort({ updatedAt:-1 })
  .populate('customer')
  .populate('creator')
  .populate('updater')
  let fetchedClaims;
  if (pageSize && currentPage) {
    claimQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  claimQuery

    .then(documents => {
      // console.log(documents[0])
      res.status(200).json({
        message: "claims fetched successfully!",
        claims: documents,
        total_count: documents.length
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching claims failed!"
      });
    });
});
  
router.get("/:id", (req, res, next) => {
    //  console.log(req.params.id )
    if (!req.params.id || req.params.id == undefined) return res.status(500).json({
        message: "claim id blank " 
    });
    Claim.
    findById(req.params.id).
    populate('customer')
    .populate('creator')
    .populate('updater')
    .exec(function (err, claim) {
        // if (err) return handleError(err);
        if (err)  {
            return res.status(500).json({
                message: "Error finding claim " + err
            });
        }

        if (claim) {
        // let nc = JSON.parse(JSON.stringify(claim))
        // nc.customer = claim.customer.name;
        // console.log(nc)
        // console.log('The customer is now %s', nc.customer);
        res.status(200).json(claim);
        } else {
        res.status(404).json({ message: "claim not found!" });
        }
    });
});

// claim import
router.post('/import', checkAuth,  function (req, res, next) {
    const alloweds = ['filatei@torama.ng'];
    
    if ( !alloweds.includes(req.userData.email)) {
      logIncident(req.userData.email, 'Not allowed to import Claims')
      return res.status(500).json({message: 'Not allowed'});
    }
    let claimsArr = req.body;
    // console.log(claimsArr, claimsArr, req.body)
    let userid = req.userData.userId;
    
    
    // unique customer names  .. not used
    function uniqcust(array) {
        const key = 'name';
        const arrayUniqueByKey = [...new Map(array.map(item =>
        [item[key], item])).values()];
        return arrayUniqueByKey;
    }

    claimsArr.forEach(claim => {
        // customerID = Customer.findOneAndUpdate({name: claim.customer})
        claim.stan = claim.stan + ''
        let customerID;
        // console.log(claim.customer, 'customer')
        if (!claim.customer)
            return res.status(500).json ({error: ' Blank Customer' })

        let customerName = claim.customer.trim()
        Customer.findOne({name: new RegExp('^'+customerName+'$', "i")}, function(err, cust) {

        if (err) {
            console.log (err)
            // throw err
        }
        if (!cust) {
            // create customer and
            customer = new Customer({name: customerName})
            
            return customer.save()
            .then(result => {
            // console.log('customer created')
            customerID = result._id;
            
            })
            .then (ress => {
            customerID = ress._id;
            })
            .catch(err => {
            console.log(err)
            })
            
        }
        if (cust) {
            // save claim
            customerID = cust._id
        }
        // save claim
        let nc = {
            creator: userid,
            customer: customerID? customerID:"",
            acquirer: claim.acquirer? claim.acquirer:"",
            stan: (claim.stan != null && claim.stan.indexOf('.jpg') > -1)? claim.stan.replace('.jpg',""):claim.stan,
            txn_amount: claim.txn_amount? claim.txn_amount:0,
            status: claim.status?  claim.status:"",
            remarks: claim.remarks,
            action_taken: claim.action_taken? claim.action_taken:"",
            trans_id: claim.trans_id?claim.trans_id:"",
            log_code: claim.log_code,
            trans_date:  claim.trans_date? new Date((claim.trans_date - (25567 + 2)) * 86400 * 1000): null,
            expiry_date: claim.expiry_date?  new Date((claim.expiry_date - (25567 + 2)) * 86400 * 1000): null,
            received_date: claim.received_date?  new Date((claim.received_date - (25567 + 2)) * 86400 * 1000):null,
            reply_date: claim.reply_date?  new Date((claim.reply_date - (25567 + 2)) * 86400 * 1000):null,
            company: claim.company? claim.company:"",
            terminal_location: claim.terminal_location?claim.terminal_location:"",
            terminal_id: claim.terminal_id?claim.terminal_id: "",
            card_number: claim.card_number? claim.card_number: "",
            card_bank: claim.card_bank? claim.card_bank: "",
            bank_action: claim.bank_action? claim.bank_action: "",
            bank_debit_date: claim.bank_debit_date? new Date((claim.bank_debit_date - (25567 + 2)) * 86400 * 1000):null,

            avatar: (claim.stan.indexOf('.jpg') > -1)? claim.stan: claim.stan.concat('.jpg'),
        }
        let newClaimObj = new Claim(nc);
        newClaimObj.save()
        .then( result => {
            console.log('claim saved', result.card_number)
            // res.status(201).jsom({message: 'claim saved'})
        })
        .catch(err => {
            // res.status(500).json ({error: ' claim save failed' + err})
            console.error(err)
        })
        });
    })
    res.status(201).json({message: "Claims Imported"})
})

router.put("/:id", checkAuth, upload.any(), (req, res, next) => {

    const alloweds = process.env.CLAIMALLOWEDS
    if ( alloweds && !alloweds.includes(req.userData.email)) {
        logIncident(req.userData.email, 'Not allowed to update Claims')
        return res.status(500).json({message: 'Not allowed'});
    }

    // update bank debit status
    
    if (!req.body.customer) return res.status(500).json({message: 'Every Claim must have a customber '});

    let formFields = Object.keys(req.body)  // an array

  // remove fields from req.body with empty conten
  let claimObj = formFields.filter(key => req.body[key] !== '')
            .reduce((obj, key) => {
              obj[key] = req.body[key];
              return obj;
            }, {});

  // let claimObj = req.body;
  claimObj._id = sanitize(req.params.id);

  // userData  was added to checkAuth middleware and passed along
  claimObj.updater = req.userData.userId; 
    // console.log(claimObj.customer, typeof claimObj.customer)
    if (typeof claimObj.customer != 'object')
        claimObj.customer = JSON.parse(claimObj.customer)

  if (req.files) {
    // console.log('files', req.files)

    req.files.forEach(file => {
        // console.log(file, ' file in array')
        if (file.originalname == 'blob') {
            fileName = 'uploads/claims/'  + req.userData.userId + '/' + file.filename 
        }
            
        else {
            fileName = 'uploads/claims/'  + req.userData.userId + '/' + file.filename
        }
        // url = 'https://api.torama.ng'
        url = req.protocol + '://' + req.get('host')

        path = url + '/' + fileName;

        if (file.fieldname === 'image') {
            claimObj.image = path;
        }
    })
  }

  if (claimObj.customer._id){
    // console.log( 'customer  already be in db')
    // store customer id and save claim
    claimObj.customer = claimObj.customer._id;
    saveClaim(claimObj);
  } else {
    console.log( 'customer may not  be in db')
    // store customer name and return _id,  before save claim
    saveCustomer(claimObj.customer);
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
       // console.log(result, ' cust find result')
        claimObj.customer = result._id
        saveClaim(claimObj)
      } else {
        let custObj = new Customer(cust);
        //console.log(custObj, ' new customer obj')
        custObj.save()
        .then((sres) => {
          claimObj.customer = sres._id;
          console.log(claimObj, ' claimobj in customerloop')
          saveClaim(claimObj)
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

  function saveClaim(claimobj) {
      // handle image upload

    claim = new Claim(claimobj);
    Claim.updateOne({ _id: req.params.id }, claim)
    .then(result => {
        console.log(result)
      if (result.n > 0) {
        res.status(200).json({ message: "Update successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch(error => {
      console.log(error)
      res.status(500).json({
        message: "Couldn't udpate claim! " + error
      });
    });
  }

});

module.exports = router;
