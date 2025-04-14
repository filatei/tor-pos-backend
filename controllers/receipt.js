const Receipt = require("../models/receipt");
const Order = require("../models/order");
const mongoose = require('mongoose')

const path = require('path')
// const { Parser } = require('json2csv');
var fs = require('fs');

exports.createReceipt =  (req, res, next) => {
    let receiptObj = req.body;
    receiptObj.creator = req.userData.userId; // userData was added to checkAuth middleware and passed along
    let receipt = new Receipt(receiptObj);

    // we query Order because we want to save the order._id in Receipt
    Order.findOne({orderRef: receiptObj.header.orderRef})
    .then ( (result) => {
      receipt.orderId = result._id;
      saveReceipt()
    })
    .catch(err => {
      return res.status(500).json({
        message: "getting order from eceipt failed! - " + err
      });
    })

    // function save the receipt
    // 'function saveReceipt() {' old method of declaring function

    saveReceipt = () => {
      receipt.save()
      .then(result => {
        res.status(201).json({
          message: "receipt added successfully",
          receipt: {
            ...result,
            id: result._id
          }
        });
      })
      .catch(error => {
        console.log(error)
        res.status(500).json({
          message: "saving a receipt failed! " + error
        });
      });
    }
  }

  exports.getReceipts = (req, res, next) => {
      const pageSize = +req.query.pagesize;
      const dateBegin = req.query.datebegin;
      const dateEnd = req.query.dateend;
      const currentPage = +req.query.page;
      const receiptQuery = Receipt.find({orderId: req.query.orderid});
      let fetchedReceipts;
      if (pageSize && currentPage) {
        receiptQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
      }
      receiptQuery
        .then(documents => {
          fetchedReceipts = documents;
          return Receipt.countDocuments();
        })
        .then(count => {  
          return res.status(200).json({
            message: "receipts fetched successfully!",
            receipts: fetchedReceipts,
            maxReceipts: count
          });
        })
        .catch(error => {
          return res.status(500).json({
            message: "Fetching receipts failed! - " + error
          });
        });
    }
    
   

  exports.getReceipt = (req, res, next) => {
    
    // use this if no req.query but req.params defined
    Receipt.findById(req.params.id).then(receipt => {
      if (receipt) {
        res.status(200).json(receipt);
      } else {
        res.status(404).json({ message: "receipt not found!" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching receipt failed!" + error
      });
    });
  }

  exports.deleteReceipt = (req, res, next) => {
   // console.log('params ', req.params)
    Receipt.deleteOne({ _id: req.params.id }).then(result => {
      // console.log('deletereceipt ', result)
        if (result.n > 0){
        res.status(200).json({ message: "Receipt deleted!" });
        }
        else {
        res.status(401).json({ message: "Not Authorised!" });
        }
    })
    .catch(error => {
        res.status(500).json({
        message: "Deleting receipt failed!" + error
        });
    });
}

exports.updateReceipt =  (req, res, next) => {
    let receiptObj = req.body;
    receiptObj._id = req.params.id;
    // userData  was added to checkAuth middleware and passed along
    receiptObj.updater = req.userData.userId; 
    const receipt = new Receipt(receiptObj);
    
      Receipt.updateOne({ _id: req.params.id, creator: req.userData.userId }, receipt)
      .then(result => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch(error => {
        res.status(500).json({
          message: "Couldn't udpate receipt!" + error
        });
      });
  }