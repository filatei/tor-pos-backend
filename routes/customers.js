const express = require("express");
const Customer = require("../models/customer");
const router = express.Router();

router.get('',(req, res, next) => {
    Customer.find()
    .then(docs => {
       // console.log('cusotmers', docs)
        res.status(200).json(
         {
            customers: docs
         });
    })
    .catch(err => {
        console.log (err)
    })
});

router.post("", (req, res, next) => {
  let cust = req.body;
  const customer = new Customer(cust);
    // const customer = new Customer({
    //     name: req.body.name,
    //     email: req.body.email,
    //     phone: req.body.phone,
    //     icon: req.body.icon,
    //     createdAt: req.body.createdAt,
    //     updatedAt: req.body.updatedAt
    // });
    // console.log('customer ', customer);
  customer.save().then ((result)=> {
      console.log('saved customer', result)
  })
  res.status(201).json({
      message: 'customer added successfully'
  });
});

router.get("/:id", (req, res, next) => {
    Customer.findById(req.params.id).then(customer => {
      if (customer) {
        res.status(200).json(customer);
      } else {
        res.status(404).json({ message: "customer not found!" });
      }
    });
  });
  
router.put("/:id", (req, res, next) => {
  console.log('params ', req.params)
  let cust = req.body;
  cust._id = req.params.id;
  const customer = new Customer(cust);

  // const customer = new Customer({
  //     _id: req.params.id,
  //     name: req.body.name,
  //     email: req.body.email,
  //     phone: req.body.phone,
  //     barcode: req.body.barcode,
  //     address: req.body.address,
  //     phones: req.body.phones,
  //     updatedAt: req.body.updatedAt
  // });
  Customer.updateOne({ _id: req.params.id }, customer).then(result => {
    res.status(200).json({ message: "Update successful!" });
  });
});

router.delete("/:id", (req, res, next) => {
    console.log('params ', req.params)
   Customer.deleteOne({ _id: req.params.id }).then(result => {
   //  console.log(result);
     res.status(200).json({ message: "customer deleted!" });
   });
 });

module.exports = router;
