const express = require("express");

const Paymethod = require("../models/paymethod");

const router = express.Router();

router.get('',(req, res, next) => {
    Paymethod.find()
    .then(docs => {
        console.log('paymethod', docs)
        res.status(200).json(
         {
             paymethods: docs
         });
    })
    .catch(err => {
        console.log (err)
    })
    
});

router.get("/:id", (req, res, next) => {
    Paymethod.findById(req.params.id).then(paymethod => {
      if (paymethod) {
        res.status(200).json(paymethod);
      } else {
        res.status(404).json({ message: "Post not found!" });
      }
    });
  });
  

router.put("/:id", (req, res, next) => {
  let payObj = req.body;
  payObj._id = req.params.id;

  const paymethod = new Paymethod(payObj);
    // const paymethod = new Paymethod({
    //     _id: req.params.id,
    //     name: req.body.name,
    //     updatedAt: req.body.updatedAt
    // });
    Paymethod.updateOne({ _id: req.params.id }, paymethod).then(result => {
      res.status(200).json({ message: "Update successful!" });
    });
  });

router.post("", (req, res, next) => {
  let payObj = req.body;

  const paymethod = new Paymethod(payObj);
    // const paymethod = new Paymethod({
    //     name: req.body.name,
    //     createdAt: req.body.createdAt,
    //     updatedAt: req.body.updatedAt
    // });
    console.log('paymethod ', paymethod);
    paymethod.save().then ((result)=> {
        console.log('saved paymethod', result)
    })
    res.status(201).json({
        message: 'paymethod added successfully'
    });
});

router.delete("/:id", (req, res, next) => {
    console.log('params ', req.params)
    Paymethod.deleteOne({ _id: req.params.id }).then(result => {
        console.log(result);
        res.status(200).json({ message: "paymethod deleted!" });
    });
});
 
module.exports = router;
