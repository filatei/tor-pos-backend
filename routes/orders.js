const express = require("express");
const Order = require("../models/order");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");
const { Parser } = require('json2csv');
var fs = require('fs');

function json2csv(fetchedOrders) {
  let fields = ['orderRef', 'status','payMethod', 'customer','createdAt','amount','amountPaid','site','cartItems'];
      const json2csvParser = new Parser({ fields, eol: "\n",
          unwindPath: 'cartItems',});
      const csvOrders = json2csvParser.parse(fetchedOrders);
      // console.log(csvOrders)
      return csvOrders;
}

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
      // fetchedOrders.map(order => {
      //   order.cartItems.forEach (item => {
      //      User.findById(item.customer).then ((cust) => {
      //       if (cust) {
      //         item.customer = cust.name
      //       }
      //      })
      //   })
      // })
      let csv = json2csv(fetchedOrders)
      const filename = 'data/file-' + (new Date().toLocaleDateString()).replace(/\//g,'-') + '.csv';
      fs.writeFile(filename, csv, function(err) {
        if (err) throw err;
        console.log('file saved');
      });
      res.status(200).json({
        message: "orders fetched successfully!",
        orders: fetchedOrders,
        csv: csv,
        filename: filename,
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
      if (result.n > 0) {
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
