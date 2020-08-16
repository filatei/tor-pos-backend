const express = require("express");
const Inventory = require("../models/inventory");
const Stockitem = require("../models/stockitem");
const router = express.Router();
const path = require('path')
const fs = require('fs')
const os = require("os");
const hostname = os.hostname();
var multer  = require('multer')
const DIR = './uploads/inventoryimages/';
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

router.post('', checkAuth,  function (req, res, next) {
  
  // console.log('path: ', path)
  // console.log('req.body', req.body)

  let stockObj = req.body;
  stockObj.creator = req.userData.userId;
  console.log(stockObj, 'inventory route')
  const inventory = new Inventory(stockObj);
  // inventory.icon = path || null;

  inventory.save()
  .then ((result)=> {
    res.status(201).json({
      message: 'Inventory added successfully',
      inventory: { ...result,
        id: result._id
      }
    });
  })
  .catch(error => {
    res.status(500).json({
      message: "Creating an inventory failed! " + error
    });
  });
  
})

router.put("/:id", checkAuth, upload.single('image'), (req, res, next) => {
    let path = ""
    let url= ""
    let stockObj = req.body;
    
    const description = req.body.description;
    const name = req.body.name;
    const qty = req.body.qty;
    const unit = req.body.unit;
    // const updatedAt = req.body.updatedAt;
    const id = req.params.id;
    stockObj._id = req.params.id;
    stockObj.updater = req.userData.userId;
    const inventory = new Inventory(stockObj);
    if (req.file && req.file.filename && req.file.filename.length > 0) {

      if (hostname.includes('torama')) {
        url = 'https://api.torama.ng';
      } else {
        url = req.protocol + '://' + req.get('host');
      }
      
      path = url + '/uploads/inventoryimages/' + req.file.filename; 
      inventory.icon = path;
      Inventory.updateOne({ _id: req.params.id }, inventory)
      .then(result => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch(error => {
        res.status(500).json({
          message: "Couldn't update inventory! " + error
        });
      });
    } else {
      Inventory.updateOne({ _id: req.params.id }, 
        { name, qty, description, icon, unit })
      .then(result => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch(error => {
        res.status(500).json({
          message: "Couldn't update inventory! " + error
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
  Inventory.findById(req.params.id)
  .then (inventory => {
    if (inventory && inventory.icon) {
      filePath = 'uploads/' + inventory.icon.split('/uploads/')[1];
      console.log(filePath)
    }
    
  })
  .catch(err => {
    return res.status(401).json({ message: "inventory not found in db!" + err });
  })
  // console.log('params ', req.params)
  Inventory.deleteOne({ _id: req.params.id })
  .then(result => {
  if (result.n > 0) {
    // delete inventory.icon
    if (filePath) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(err)
        } else {
          console.log('related file deleted')
        }
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
      message: "Deleting inventory failed! " + error
    });
  });

 });

router.get('', (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const inventoryQuery = Inventory.find().sort({ createdAt:-1 }).populate('name')
  .populate('sender').populate('receiver');
  if (pageSize && currentPage) {
    inventoryQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  inventoryQuery
    .then(documents => {
      res.status(200).json({
        message: "Inventories fetched successfully!",
        inventory: documents
      });
    })
   .catch(error => {
    res.status(500).json({
      message: "Fetching inventories failed! " + error
    });
  });
});

router.get("/:id", (req, res, next) => {
    Inventory.findById(req.params.id).populate('name')
    .populate('sender').populate('receiver')
    .then(inventory => {
      if (inventory) {
        res.status(200).json(inventory);
      } else {
        res.status(404).json({ message: "inventory not found!" });
      }
    }).catch(error => {
      res.status(500).json({
        message: "Fetching inventory failed! " + error
      });
    });
  });
  
module.exports = router;
