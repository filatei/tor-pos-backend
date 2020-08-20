const express = require("express");
const Quantity = require("../models/quantity");
const Stockitem = require("../models/stockitem");
const router = express.Router();
const path = require('path')
const fs = require('fs')
const os = require("os");
const hostname = os.hostname();


const checkAuth = require('../middleware/check-auth');

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

router.post('', checkAuth,  function (req, res, next) {
  
  // console.log('path: ', path)
  // console.log('req.body', req.body)

  let stockObj = req.body;
  stockObj.creator = req.userData.userId;
  console.log(stockObj, 'quantity route')
  const quantity = new Quantity(stockObj);
  // quantity.icon = path || null;

  saveQuantity()

  

  async function saveQuantity() {
    try {
      const invSave = await quantity.save()
      res.status(201).json({
        message: 'Quantity added successfully',
        quantity: { ...invSave,
          id: invSave._id
        }
      });
    } catch (err) {
      if (err) {
        res.status(500).json({
          message: "Creating an quantity failed! " + err
        });
      } 
    }

  }
})

router.put("/:id", checkAuth, (req, res, next) => {
    let path = ""
    let url= ""
    let stockObj = req.body;
    
    
    // const updatedAt = req.body.updatedAt;
    const id = req.params.id;
    stockObj._id = req.params.id;
    stockObj.updater = req.userData.userId;
    const quantity = new Quantity(stockObj);
    
    Quantity.updateOne({ _id: req.params.id }, quantity)
    .then(result => {
      if (result.n > 0) {
        res.status(200).json({ message: "Update successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Couldn't update quantity! " + error
      });
    });
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to delete ')
     return res.status(500).json({message: 'Not allowed'});
  }

  let filePath;
  Quantity.findById(req.params.id)
  .then (quantity => {
    if (quantity && quantity.icon) {
      filePath = 'uploads/' + quantity.icon.split('/uploads/')[1];
      console.log(filePath)
    }
    
  })
  .catch(err => {
    return res.status(401).json({ message: "quantity not found in db!" + err });
  })
  // console.log('params ', req.params)
  Quantity.deleteOne({ _id: req.params.id })
  .then(result => {
  if (result.n > 0) {
    // delete quantity.icon
    res.status(200).json({ message: "Deletion successful!" });
  } else {
    res.status(401).json({ message: "Not authorized!" });
  }
  })
  .catch(error => {
    console.error(error)
    res.status(500).json({
      message: "Deleting quantity failed! " + error
    });
  });

 });

router.get('', (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const quantityQuery = Quantity.find().sort({ createdAt:-1 }).populate('name')
  if (pageSize && currentPage) {
    quantityQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  quantityQuery
    .then(documents => {
      res.status(200).json({
        message: "Inventories fetched successfully!",
        quantity: documents
      });
    })
   .catch(error => {
    res.status(500).json({
      message: "Fetching inventories failed! " + error
    });
  });
});

router.get("/:id", (req, res, next) => {
    Quantity.findById(req.params.id).populate('name')
    .then(quantity => {
      if (quantity) {
        res.status(200).json(quantity);
      } else {
        res.status(404).json({ message: "quantity not found!" });
      }
    }).catch(error => {
      res.status(500).json({
        message: "Fetching quantity failed! " + error
      });
    });
  });
  
module.exports = router;
