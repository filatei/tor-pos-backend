const express = require("express");
const Customer = require("../models/customer");
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

router.get('',(req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const custQuery = Customer.find();
  let fetchedCustomers;
  if (pageSize && currentPage) {
    custQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  custQuery
    .then(documents => {
      fetchedCustomers = documents;
      return Customer.countDocuments();
    })
    .then(count => {
      res.status(200).json({
        message: "Customers fetched successfully!",
        customers: fetchedCustomers,
        maxCustomers: count
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching customers failed!"
      });
    });
});

router.post("", checkAuth, (req, res, next) => {
  let cust = req.body;
  cust.barcode = req.body.name;
  
  cust.creator = req.userData.userId; 

  const customer = new Customer(cust);
  customer.save().then ((result)=> {
    res.status(201).json({
      message: "Customer added successfully",
      customer: {
        ...result,
        id: result._id
      }
    });
  })
  .catch(error => {
    res.status(500).json({
      message: "creating customers failed!"
    });
  });
});

router.get("/:id", (req, res, next) => {
    Customer.findById(req.params.id)
    .then(customer => {
      if (customer) {
        res.status(200).json(customer);
      } else {
        res.status(404).json({ message: "customer not found!" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching customer failed!"
      });
    });
  });
  
router.put("/:id", checkAuth, (req, res, next) => {
  console.log('params ', req.params)
  let cust = req.body;
  cust._id = req.params.id;
  cust.updater = req.userData.userId; 
  const customer = new Customer(cust);

  Customer.updateOne({ _id: req.params.id }, customer)
  .then(result => {
    if (result.n > 0) {
      res.status(200).json({ message: "Update successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
  })
  .catch(error => {
    res.status(500).json({
      message: "Couldn't udpate customer!"
    });
  });
});

router.delete("/:id", (req, res, next) => {
    console.log('params ', req.params)
   Customer.deleteOne({ _id: req.params.id })
   .then(result => {
    console.log(result);
    if (result.n > 0) {
      res.status(200).json({ message: "Deletion successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
   })
   .catch(error => {
    res.status(500).json({
      message: "Deleting customer failed!"
    });
  });
});

module.exports = router;
