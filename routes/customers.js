require('dotenv').config();
const express = require("express");
const Customer = require("../models/customer");
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

router.get('', async (req, res, next) => {
  const pageSize = +req.query.pagesize ;
  const currentPage = +req.query.currentpage;
  const sort = req.query.sort;

  let custQuery = Customer.find().sort({customer_id:-1})
  // if (pageSize && currentPage) {
  //   custQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  // }

  // console.log(sort, 'sort')
  const byname = req.query.byname;
  
  // if (byname) {
  //   custQuery = Customer.find({name: new RegExp(byname, "i")})
  //  // console.log(custQuery)
  // } else {
  //   custQuery = Customer.find().sort(sort).limit(pageSize);
  // }
  
  let fetchedCustomers;
  
  custQuery
    .then(documents => {
      
      //  console.log(documents.length)
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
        message: "Fetching customers failed! " + error
      });
    });
});

router.get("/getByText", checkAuth, async (req, res, next) => {
  
  try {
    const alloweds = ['ADMIN', 'MANAGER', 'GENERAL MANAGER', 'SECRETARY','SNR ACCOUNTANT', 'ACCOUNTANT', 'SUPERVISOR', 'POS OFFICER']

    if (!alloweds.includes(req.userData.role)) {
      return res.status(500).json({ message: "Not allowed" });
    }

    const { searchTerm } = req.query;

    let result = [];
    result = await Customer.find({
      name: { $regex: searchTerm, $options: "i" },
    })
      .sort({ name: 1 })
      .limit(50);

   return res.status(200).json({ customers: result });
    
    
  } catch (error) {
    console.log(error)
    res.status(404).json({ message: "try Block Error! " + error });
  }

  
});

router.get("/:id",  (req, res, next) => {
  // console.log('id ', req.params.id)
  // console.log(req.userData.userId)
  Customer.findById(req.params.id)
  .then(customer => {
    if (customer) {
      // console.log(customer)
      res.status(200).json({customer: customer});
    } else {
      res.status(404).json({ message: "customer not found!" });
    }
  })
  .catch(error => {
    res.status(500).json({
      message: "Fetching customer failed! " + error
    });
  });
});

router.post("", checkAuth, (req, res, next) => {
  const alloweds = ['ADMIN', 'GENERAL MANAGER', 'MANAGER', 'ACCOUNTANT', 'SNR ACCOUNTANT', 'SECRETARY', 'POS OFFICER'];

  if (!alloweds.includes(req.userData.role)) {
    return res.status(401).json({ message: "Not allowed" });
  }

  let cust = req.body;
  cust.barcode = req.body.name;

  cust.creator = req.userData.userId; 
  // cust.name = cust.name.toUpperCase();

  const customer = new Customer(cust);
  console.log(customer);
  customer.save().then ((result)=> {
    // console.log(result)
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
      message: "creating customers failed! " + error
    });
  });
});
  
router.put("/:id", checkAuth, (req, res, next) => {
  const alloweds = ['ADMIN', 'GENERAL MANAGER', 'MANAGER', 'ACCOUNTANT', 'SNR ACCOUNTANT', 'SECRETARY', 'POS OFFICER'];

  if (!alloweds.includes(req.userData.role)) {
    return res.status(401).json({ message: "Not allowed" });
  }
  
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
      message: "Couldn't udpate customer! " + error
    });
  });
});

router.delete("/:id", (req, res, next) => {
  const alloweds = ['filatei@torama.ng'];  
  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }

   Customer.deleteOne({ _id: req.params.id })
   .then(result => {
    // console.log(result);
    if (result.n > 0) {
      res.status(200).json({ message: "Deletion successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
   })
   .catch(error => {
    res.status(500).json({
      message: "Deleting customer failed! " + error
    });
  });
});

router.post("/import", checkAuth, (req, res, next) => {
  const alloweds = ['filatei@torama.ng']  
  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }
// exports.importClaim =  (req, res, next) => {
  // console.log(req)
  let customerArr = req.body;  // array of customer objs
   // zawsw console.log('claimObj ',req)
    // userData was added to checkAuth middleware and passed along
    // console.log('userdata in claim ', req.userData)
   
  // unique customer names
  function uniqcust(array) {
    const key = 'name';
    const arrayUniqueByKey = [...new Map(array.map(item =>
      [item[key], item])).values()];

    return arrayUniqueByKey;
  }

  let uniqcusts = uniqcust(customerArr)
  Customer.collection.insertMany(uniqcusts, {ordered: true})
  .then(result => {
    // console.log('insertcount', result.insertedCount)
    res.status(200).json({message: 'customers insertered ' + result.insertedCount })
  })
  .catch(err => {
    // console.error(err)
    res.status(500).json({
      message: "Creating  customers failed!" + err
    });
    
    throw err
  })


})

module.exports = router;
