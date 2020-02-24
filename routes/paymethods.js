const express = require("express");

const Paymethod = require("../models/paymethod");

const router = express.Router();

router.get('',(req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const paymethodQuery = Paymethod.find();
  let fetchedPaymethods;
  if (pageSize && currentPage) {
    paymethodQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  paymethodQuery
    .then(documents => {
      fetchedPaymethods = documents;
      return Paymethod.countDocuments();
    })
    .then(count => {
      res.status(200).json({
        message: "Paymethods fetched successfully!",
        paymethods: fetchedPaymethods,
        maxPaymethods: count
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching paymethods failed!"
      });
    });
    
});

router.get("/:id", (req, res, next) => {
    Paymethod.findById(req.params.id).then(paymethod => {
      if (paymethod) {
        res.status(200).json(paymethod);
      } else {
        res.status(404).json({ message: "Paymethod not found!" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching paymethod failed!"
      });
    });
  });
  

router.put("/:id", (req, res, next) => {
  let payObj = req.body;
  payObj._id = req.params.id;

  const paymethod = new Paymethod(payObj);
   
    Paymethod.updateOne({ _id: req.params.id }, paymethod)
    .then(result => {
      if (result.nModified > 0) {
        res.status(200).json({ message: "Update successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Couldn't udpate paymethod!"
      });
    });
  });

router.post("", (req, res, next) => {
  let payObj = req.body;

  const paymethod = new Paymethod(payObj);
    
    console.log('paymethod ', paymethod);
    paymethod.save()
    .then(result => {
      res.status(201).json({
        message: "Paymethod added successfully",
        paymethod: {
          ...result,
          id: result._id
        }
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Creating a paymethod failed!"
      });
    });
});

router.delete("/:id", (req, res, next) => {
    console.log('params ', req.params)
    Paymethod.deleteOne({ _id: req.params.id })
    .then(result => {
      if (result.n > 0) {
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Deleting paymethod failed!"
      });
    });
});
 
module.exports = router;
