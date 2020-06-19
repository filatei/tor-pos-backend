const express = require("express");
const Recupload = require("../models/recupload");
const Customer = require("../models/customer");
const router = express.Router();
const path = require('path')
const fs = require('fs');
const mime = require('mime');

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
    let path = ""
    let url = ""
    let recObj = req.body;

    recObj.userid = req.userData.userId;
    let customerName = recObj.customer;
    console.log(recObj.products, ' before')
    recObj.products = JSON.parse(recObj.products)
    console.log(recObj.products, ' after')
    const recupload = new Recupload(recObj);

    console.log(req.body.image, 'image')
    let fileName;
   
    console.log(req.file, 'file')
    console.log(req.files, 'files')
    if (req.files) {
        // console.log('files', req.files)
        if (env != 'development') {
            url = 'https://api.torama.ng'
        } else {
            url = req.protocol + '://' + req.get('host')
        }
        // url = req.protocol + '://' + 'api.torama.ng:4000' //for prod

        req.files.forEach(file => {
            console.log(file, ' file in array')
            if (file.originalname == 'blob') {
                fileName = 'uploads/recuploads/'  + req.userData.userId + '/' + file.filename 
            }
                
            else {
                fileName = 'uploads/recuploads/'  + req.userData.userId + '/' + file.filename
            }
                
            path = url + '/' + fileName;
    
            if (file.fieldname === 'image') {
                recupload.image = path;
            }
        })
    }
    // }
    console.log('path: ', path)

    recupload.save()
    .then((result) => {
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
    
  // if customer is object, it exists in our db
  // get object_id of customer
  console.log( typeof recObj.customer, 'typeof custobj', recObj.customer)
    // if (typeof recObj.customer === 'object') {
        // recupload.customer = recupload.customer._id;
        
    // else {
    //     // is customer in db? If not create in customers db them create rec
    //    Customer.findOne({name: new RegExp('^'+customerName+'$', "i")}, function(err, doc) {
    //      if (err) {
    //        console.error(err, 'err in customer find') 
    //        return res.status(500).json({
    //          message: "error in customer find" + err 
    //        });
    //      } 
    //      if (doc) {
    //        // console.log('customer exists - ' + doc);
    //        recObj.customer = doc._id
    //        recupload = new Recupload(recObj);
    //        // console.log('creating claim 1')
    //        recupload.save()
    //        .then(result => {
    //          res.status(201).json({
    //            message: "Creating  rec succeeded!" + result
    //          });
    //        })
    //        .catch(error => {
    //          console.error(error )
    //          res.status(500).json({
    //            message: "Creating a rec failed!" + error 
    //          });
    //        });  
          
    //      } else {
    //        // create customer
           
    //        let custObj = new Customer({name: recObj.customer})
    //         // we need to embed customer obj in claims doc
           
    //        custObj.save()
    //        .then(ress => {
             
    //          recObj.customer = ress._id;
    //          recupload = new Recupload(recObj);
    //           console.log(ress, ' ress', recObj)
    //           console.log('creating rec 2')
    //          recupload.save()
    //          .then(result => {
    //             console.log (' rec 2 success', result)
    //            res.status(201).json({
    //              message: "Creating  rec succeeded!" + result
    //            });
    //          })
    //          .catch(error => {
    //            console.error(error )
    //            res.status(500).json({
    //              message: "Creating a rec failed!" + error 
    //            });
    //          });  
    //        })
    //        .catch(err => {
    //          console.error ('error creating customer', err)
    //          throw err
    //        }) 
    //      }
    //    })
    //  }
  
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

router.get('',(req, res, next) => {
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
        maxCompanys: count
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
  



module.exports = router;
