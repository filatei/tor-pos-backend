const express = require("express");
const Order = require("../models/order");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");


router.get('',(req, res, next) => {
    Order.find()
    .then(docs => {
        console.log('orders', docs)
        res.status(200).json(
         {
             orders: docs
         });
    })
    .catch(err => {
        console.log (err)
    })
 });

 router.get("/:id", (req, res, next) => {
    Order.findById(req.params.id).then(order => {
      if (order) {
        res.status(200).json(order);
      } else {
        res.status(404).json({ message: "product not found!" });
      }
    });
  });
  

 router.delete("/:id", (req, res, next) => {
     console.log('params ', req.params)
    Order.deleteOne({ _id: req.params.id }).then(result => {
      console.log(result);
      res.status(200).json({ message: "Order deleted!" });
    });
  });
  
 router.post("", checkAuth, (req, res, next) => {
  let orderObj = req.body;
  // userData  wasadded to checkAuth middleware and passed along
  orderObj.creator = req.userData.userId; 
  const order = new Order(orderObj);
    // const order = new Order({
    //    name: req.body.name,
    //    orderRef: req.body.orderRef,
    //    customer: req.body.customer,
    //    payMethod: req.body.payMethod,
    //    tellerId: req.body.tellerId,
    //    amount: req.body.amount,
    //    amountPaid: req.body.amountPaid,
    //    createdAt: req.body.createdAt,
    //    updatedAt: req.body.updatedAt,
    //    status: req.body.status,
    //    createdAt: req.body.createdAt,
    //    updatedAt: req.body.updatedAt,
    //    site: req.body.site,
    //    userId: req.body.userId,
    //    updateLog: req.body.updateLog,
    //    cartItems: req.body.cartItems
    // });
    console.log('order ', order);
    order.save().then ((result)=> {
        console.log('saved Order', result)
    })
    res.status(201).json({
        message: 'order added successfully'
    });
});

router.put("/:id", checkAuth, (req, res, next) => {
  let orderObj = req.body;
  orderObj._id = req.params.id;
  // userData  wasadded to checkAuth middleware and passed along
  orderObj.updater = req.userData.userId; 

  const order = new Order(orderObj);
  
    // const order = new Order({
    //     _id: req.body.id,
    //     name: req.body.name,
    //    orderRef: req.body.orderRef,
    //    customer: req.body.customer,
    //    payMethod: req.body.payMethod,
    //    tellerId: req.body.tellerId,
    //    amount: req.body.amount,
    //    amountPaid: req.body.amountPaid,
    //    updatedAt: req.body.updatedAt,
    //    status: req.body.status,
    //    createdAt: req.body.createdAt,
    //    updatedAt: req.body.updatedAt,
    //    site: req.body.site,
    //    userId: req.body.userId,
    //    updateLog: req.body.updateLog,
    //    cartItems: req.body.cartItems
    // });
    Order.updateOne({ _id: req.params.id }, order).then(result => {
      res.status(200).json({ message: "Update successful!" });
    });
});

module.exports = router;
