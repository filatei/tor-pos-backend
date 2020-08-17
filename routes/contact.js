const express = require("express");
const mongoose = require('mongoose');

const Contact = require("../models/contact");
const Inventory = require("../models/inventory");
const router = express.Router();
const path = require('path')
const fs = require('fs')
const os = require("os");
const hostname = os.hostname();
var multer  = require('multer')
const DIR = './uploads/contactimages/';
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
    
    if (hostname.includes('torama')) {
      url = 'https://api.torama.ng'
    } else {
      url = req.protocol + '://' + req.get('host')
    }
    // url = 'https://api.torama.ng'
    // console.log(url)
    path = url + '/uploads/contactimages/' + req.file.filename; 
    // console.log(path)
  }
  
  // console.log('path: ', path)
  // console.log('req.body', req.body)

  let contactObj = req.body;

  contactObj.creator = req.userData.userId;

  const contact = new Contact(contactObj);
  contact.icon = path || null;

  contact.save()
  .then ((result)=> {
    res.status(201).json({
      message: 'Contact added successfully',
      contact: { ...result,
        id: result._id
      }
    });
  })
  .catch(error => {
    res.status(500).json({
      message: "Creating a contact failed! " + error
    });
  });
  
})

router.put("/:id", checkAuth, upload.single('image'), (req, res, next) => {
    let path = ""
    let url= ""
    let contactObj = req.body;
    
    const description = req.body.description;
    const name = req.body.name;
    const qty = req.body.qty;
    const unit = req.body.unit;
    // const updatedAt = req.body.updatedAt;
    const id = req.params.id;
    contactObj._id = req.params.id;
    contactObj.updater = req.userData.userId;
    const contact = new Contact(contactObj);
    if (req.file && req.file.filename && req.file.filename.length > 0) {

      if (hostname.includes('torama')) {
        url = 'https://api.torama.ng';
      } else {
        url = req.protocol + '://' + req.get('host');
      }
      
      path = url + '/uploads/contactimages/' + req.file.filename; 
      contact.icon = path;
      Contact.updateOne({ _id: req.params.id }, contact)
      .then(result => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch(error => {
        res.status(500).json({
          message: "Couldn't update contact! " + error
        });
      });
    } else {
      Contact.updateOne({ _id: req.params.id }, 
        contact)
      .then(result => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch(error => {
        res.status(500).json({
          message: "Couldn't update contact! " + error
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
  // in contact in inventory, dont delete
  const sender = req.body.sender;
  const receiver = req.body.receiver;
  const id = req.params.id;
  // console.log (id)

  // is id  in sender or receiver fields in inventory?
  checkInventory(id);

  async function checkInventory(id) {
    let response1;
    let response2;
    let ret = false;

    response1 = await Inventory.exists({receiver:  id });
    response12= await Inventory.exists({sender:  id });
    // console.log (response1,  'res1' , response2)
    if (response1  || response2) {
      console.log(true, 'not deleting... ')
      return res.status(500).json({message: 'Contact already in inventory, not deleted'});
    } else {
      console.log(false, ' deleting... ')

      deleteContact()
    }
  }
  
  function deleteContact() {
    let filePath;
    Contact.findById(req.params.id)
    .then (contact => {
      if (contact && contact.icon) {
        filePath = 'uploads/' + contact.icon.split('/uploads/')[1];
        console.log(filePath)
      }
      
    })
    .catch(err => {
      return res.status(401).json({ message: "contact not found in db!" + err });
    })
    // console.log('params ', req.params)
    Contact.deleteOne({ _id: req.params.id })
    .then(result => {
    if (result.n > 0) {
      // delete contact.icon
      if (filePath) {
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(err, 'file unlink err')
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
      console.error(error, 'catch err')
      res.status(500).json({
        message: "Deleting contact failed! " + error
      });
    });
  }

 });

router.get('',(req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const contactQuery = Contact.find();
  if (pageSize && currentPage) {
    contactQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  contactQuery
    .then(documents => {
      res.status(200).json({
        message: "Inventories fetched successfully!",
        contact: documents
      });
    })
   .catch(error => {
    res.status(500).json({
      message: "Fetching inventories failed! " + error
    });
  });
});

router.get("/:id", (req, res, next) => {
    Contact.findById(req.params.id)
    .then(contact => {
      if (contact) {
        res.status(200).json(contact);
      } else {
        res.status(404).json({ message: "contact not found!" });
      }
    }).catch(error => {
      res.status(500).json({
        message: "Fetching contact failed! " + error
      });
    });
  });
  
module.exports = router;
