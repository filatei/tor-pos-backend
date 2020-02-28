const Order = require("../models/order");
const path = require('path')
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

exports.createOrder =  (req, res, next) => {
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
  }

  exports.getOrders = (req, res, next) => {
    const pageSize = +req.query.pagesize;
    const dateBegin = req.query.datebegin;
    const dateEnd = req.query.dateend;
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
        
        let csv = json2csv(fetchedOrders)
        const file = 'file-' + (new Date().toLocaleDateString('en-US')).replace(/\//g,'-') + '.csv'
        const filename =  path.join(__dirname, '..', 'data', file);
        const filename2 = 'data/filejson-' + (new Date().toLocaleDateString()).replace(/\//g,'-') + '.txt';
         
        const makeRecursiveFileAsync = async (path, data) => {
          try{
            await fs.writeFile(path,data,(err)=> {
              if (err) {  
                throw err 
              }
            })
          }
          catch(err){
            if (err){
              throw err
            } 
          }
        }
        makeRecursiveFileAsync(filename, csv);
        makeRecursiveFileAsync(filename2, fetchedOrders);
          
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
   }

   exports.getOrder = (req, res, next) => {
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
  }

  exports.deleteOrder = (req, res, next) => {
   // console.log('params ', req.params)
    Order.deleteOne({ _id: req.params.id }).then(result => {
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
}

exports.updateOrder =  (req, res, next) => {
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
  }