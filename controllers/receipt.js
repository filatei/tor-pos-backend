const Receipt = require("../models/receipt");
const path = require('path')
// const { Parser } = require('json2csv');
var fs = require('fs');


exports.createReceipt =  (req, res, next) => {
    let receiptObj = req.body;
   // zawsw console.log('orderObj ',req)
    // userData was added to checkAuth middleware and passed along
    receiptObj.creator = req.userData.userId; 
    const receipt = new Receipt(receiptObj);
      console.log('receipt ', receipt);
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
        res.status(500).json({
          message: "Creating a receipt failed!"
        });
      });
  }

  exports.getReceipts = (req, res, next) => {
    const pageSize = +req.query.pagesize;
    const dateBegin = req.query.datebegin;
    const dateEnd = req.query.dateend;
    const currentPage = +req.query.page;
    const receiptQuery = Receipt.find();
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
        // makeRecursiveFileAsync(filename, csv);
        makeRecursiveFileAsync(filename2, fetchedReceipts);
          
        res.status(200).json({
          message: "receipts fetched successfully!",
          receipts: fetchedReceipts,
          filename: filename2,
          maxReceipts: count
        });
      })
      .catch(error => {
        res.status(500).json({
          message: "Fetching receipts failed!"
        });
      });
   }

   exports.getReceipt = (req, res, next) => {
    Receipt.findById(req.params.id).then(receipt => {
      if (receipt) {
        res.status(200).json(receipt);
      } else {
        res.status(404).json({ message: "receipt not found!" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching receipt failed!"
      });
    });
  }

  exports.deleteReceipt = (req, res, next) => {
   // console.log('params ', req.params)
    Receipt.deleteOne({ _id: req.params.id }).then(result => {
        if (result.n > 0){
        res.status(200).json({ message: "Receipt deleted!" });
        }
        else {
        res.status(401).json({ message: "Not Authorised!" });
        }
    })
    .catch(error => {
        res.status(500).json({
        message: "Deleting receipt failed!"
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
          message: "Couldn't udpate receipt!"
        });
      });
  }