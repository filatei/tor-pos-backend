const express = require("express");
const Shopsetting = require("../models/shopsetting");

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


const checkAuth = require('../middleware/check-auth');

router.post('', checkAuth, function (req, res, next) {

  const alloweds = process.env.SHOPALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to create Sales')
     return res.status(500).json({message: 'Not allowed to create Sales'});
  }

  let path = ""
  let url= ""
  let shopObj = req.body;
  shopObj.creator = req.userData.userId;


  saveShopsetting(shopObj);
  
    
  function saveShopsetting(shopObj) {
    const shopsetting = new Shopsetting(shopObj);
    shopsetting.save()
    .then ((result)=> {
      console.log('shop setting added')
      res.status(201).json({
        message: 'Shopsetting added successfully',
        shopsetting: {...result}
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Creating a shopsetting failed! " + error
      });
    });
  }
  
})

router.put("/:id", checkAuth, (req, res, next) => {
    let shopObj = req.body;
    
    shopObj.updater = req.userData.userId;
    const id = req.params.id;
    shopObj._id = req.params.id;
    const shopsetting = new Shopsetting(shopObj);
    
      Shopsetting.updateOne({ _id: req.params.id }, shopsetting)
      .then(result => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch(error => {
        res.status(500).json({
          message: "Couldn't update shopsetting! " + error
        });
      });
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to delete ')
     return res.status(500).json({message: 'Not allowed'});
  }

  Shopsetting.deleteOne({ _id: req.params.id })
  .then(result => {
  if (result.n > 0) {
    res.status(200).json({ message: "Deletion successful!" });
  } else {
    res.status(401).json({ message: "deletion failed ...id may not exist!" });
  }
  })
  .catch(error => {
    console.error(error)
    res.status(500).json({
      message: "Deleting shopsetting failed! " + error
    });
  });

 });

router.get('',(req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const shopsettingQuery = Shopsetting.find().sort({createdAt:-1}).populate('creator');
  if (pageSize && currentPage) {
    shopsettingQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  shopsettingQuery
    .then(documents => {
      res.status(200).json({
        message: "Shopsettings fetched successfully!",
        settings: documents
      });
    })
   .catch(error => {
    res.status(500).json({
      message: "Fetching shopsettings failed! " + error
    });
  });
});

router.get("/:id", (req, res, next) => {
    Shopsetting.findById(req.params.id)
    .then(shopsetting => {
      if (shopsetting) {
        res.status(200).json(shopsetting);
      } else {
        res.status(404).json({ message: "shopsetting not found!" });
      }
    }).catch(error => {
      res.status(500).json({
        message: "Fetching shopsetting failed! " + error
      });
    });
  });
  
module.exports = router;
