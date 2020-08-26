const express = require("express");
const mongoose = require('mongoose');

const Expense = require("../models/expense");
const Inventory = require("../models/inventory");
const Accesslog = require("../models/accesslog");
const router = express.Router();
const path = require('path')
const fs = require('fs')
const os = require("os");
const hostname = os.hostname();
var multer  = require('multer')
const DIR = './uploads/expenseimages/';
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
  const alloweds = process.env.STOREALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to create Inventory')
     return res.status(500).json({message: 'Not allowed to create inventory'});
  }

  let expenseObj = req.body;
  console.log(expenseObj)

  expenseObj.creator = req.userData.userId;

  const expense = new Expense(expenseObj);

  expense.save()
  .then ((result)=> {
    console.log(result)
    res.status(201).json({
      message: 'Expense added successfully',
      expense: { ...result,
        id: result._id
      }
    });
  })
  .catch(error => {
    res.status(500).json({
      message: "Creating a expense failed! " + error
    });
  });
  
})

router.put("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.STOREALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to create Inventory')
     return res.status(500).json({message: 'Not allowed to create inventory'});
  }

  let expenseObj = req.body;

  const id = req.params.id;
  expenseObj._id = id;
  expenseObj.updater = req.userData.userId;
  const expense = new Expense(expenseObj);
  
    Expense.updateOne({ _id: req.params.id }, 
      expense)
    .then(result => {
      if (result.n > 0) {
        res.status(200).json({ message: "Update successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Couldn't update expense! " + error
      });
    });
});

router.delete("/:id", checkAuth, (req, res, next) => {

  const alloweds = process.env.DELALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to delete ')
     return res.status(500).json({message: 'Not allowed'});
  }
 
  deleteExpense()
  
  
  function deleteExpense() {

   
    Expense.deleteOne({ _id: req.params.id })
    .then(result => {
    if (result.n > 0) {
      res.status(200).json({ message: "Deletion successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
    })
    .catch(error => {
      console.error(error, 'catch err')
      res.status(500).json({
        message: "Deleting expense failed! " + error
      });
    });
  }

 });

router.get('',(req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const expenseQuery = Expense.find().populate('vendor').populate('name');
  if (pageSize && currentPage) {
    expenseQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  expenseQuery
    .then(documents => {
      res.status(200).json({
        message: "Expenses fetched successfully!",
        expense: documents
      });
    })
   .catch(error => {
    res.status(500).json({
      message: "Fetching inventories failed! " + error
    });
  });
});

router.get("/:id", (req, res, next) => {
    Expense.findById(req.params.id)
    .then(expense => {
      if (expense) {
        res.status(200).json(expense);
      } else {
        res.status(404).json({ message: "expense not found!" });
      }
    }).catch(error => {
      res.status(500).json({
        message: "Fetching expense failed! " + error
      });
    });
  });
  
module.exports = router;
