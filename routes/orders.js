const express = require("express");
const Order = require("../models/order");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");


router.get('',(req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const orderQuery = Order.find();
  let fetchedOrders;
  if (pageSize && currentPage) {
    orderQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  orderQuery
    .then(documents => {
      fetchedOrders = documents;
      return Order.countDocuments();
    })
    .then(count => {
      res.status(200).json({
        message: "orders fetched successfully!",
        orders: fetchedOrders,
        maxOrders: count
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching orders failed!"
      });
    });
 });

 router.get("/:id", (req, res, next) => {
    Order.findById(req.params.id).then(order => {
      if (order) {
        res.status(200).json(order);
      } else {
        res.status(404).json({ message: "order not found!" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching order failed!"
      });
    });
  });
  

 router.delete("/:id", checkAuth, (req, res, next) => {
     console.log('params ', req.params)
    Order.deleteOne({ _id: req.params.id }).then(result => {
      // console.log(result);
      if (result.n > 0){
        res.status(200).json({ message: "Order deleted!" });
      }
      else {
        res.status(401).json({ message: "Not Authorised!" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Deleting order failed!"
      });
    });
  });
  
 router.post("", checkAuth, (req, res, next) => {
  let orderObj = req.body;
  // userData was added to checkAuth middleware and passed along
  orderObj.creator = req.userData.userId; 
  const order = new Order(orderObj);
    console.log('order ', order);
    order.save()
    .then(result => {
      res.status(201).json({
        message: "Order added successfully",
        order: {
          ...result,
          id: result._id
        }
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Creating an order failed!"
      });
    });
});

router.put("/:id", checkAuth, (req, res, next) => {
  let orderObj = req.body;
  orderObj._id = req.params.id;
  // userData  was added to checkAuth middleware and passed along
  orderObj.updater = req.userData.userId; 

  const order = new Order(orderObj);
  
    Order.updateOne({ _id: req.params.id, creator: req.userData.userId }, order)
    .then(result => {
      if (result.nModified > 0) {
        res.status(200).json({ message: "Update successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Couldn't udpate order!"
      });
    });
});

module.exports = router;
