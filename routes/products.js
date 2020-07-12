const express = require("express");
const Product = require("../models/product");
const router = express.Router();
const path = require('path')
const fs = require('fs')
var multer  = require('multer')
const DIR = './uploads/productimages/';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    const fileName =  new Date().getTime() + '-' + file.originalname.toLowerCase().split(' ').join('-');
    console.log(fileName)
    cb(null, fileName)
  }
});


// Multer Mime Type Validation
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype == "image/gif" || file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only .gif, .png, .jpg and .jpeg format allowed!'));
    }
  }
});

const checkAuth = require('../middleware/check-auth');

router.post('', checkAuth, upload.single('image'), function (req, res, next) {
  let path = ""
  let url= ""
  if (req.file) { 
    url = req.protocol + '://' + req.get('host')
    // url = 'https://api.torama.ng'
    // console.log(url)
    path = url + '/uploads/productimages/' + req.file.filename; 
    // console.log(path)
  }
  
  console.log('path: ', path)
  console.log('req.body', req.body)

  let prodObj = req.body;
  prodObj.creator = req.userData.userId;


  // if ( typeof prodObj.categoryId != 'object'){
  //   prodObj.categoryId = JSON.parse(prodObj.categoryId);
  //   prodObj.categoryId = prodObj.categoryId._id;
  // }

  const product = new Product(prodObj);
  product.icon = path;

  product.save()
  .then ((result)=> {
    res.status(201).json({
      message: 'Product added successfully',
      product: {...result,
        id: result._id
      }
    });
  })
  .catch(error => {
    res.status(500).json({
      message: "Creating a product failed! " + error
    });
  });
  
})

router.put("/:id", checkAuth, upload.single('image'), (req, res, next) => {
    let path = ""
    let url= ""
    let prodObj = req.body;
    const price = req.body.price;
    const taxRate = req.body.taxRate;
    const description = req.body.description;
    const name = req.body.name;
    // const updatedAt = req.body.updatedAt;
    const updater = req.userData.userId;
    const id = req.params.id;
    prodObj._id = req.params.id;
    prodObj.updater = req.userData.userId;
    const product = new Product(prodObj);
    if (req.file && req.file.filename && req.file.filename.length > 0) {
      url = req.protocol + '://' + req.get('host')
      path = url + '/uploads/productimages/' + req.file.filename; 
      // path = 'https://api.torama.ng' + '/uploads/productimages/' + req.file.filename;
      product.icon = path;
      Product.updateOne({ _id: req.params.id }, product)
      .then(result => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch(error => {
        res.status(500).json({
          message: "Couldn't udpate product! " + error
        });
      });
    } else {
      Product.updateOne({ _id: req.params.id }, 
        {name: name, price: price, description: description, taxRate: taxRate, updatedAt: updatedAt})
      .then(result => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch(error => {
        res.status(500).json({
          message: "Couldn't update product! " + error
        });
      });
    }   
});

router.delete("/:id", checkAuth, (req, res, next) => {

  const alloweds = process.env.DELALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to delete ')
     return res.status(500).json({message: 'Not allowed'});
  }

  let filePath;
  Product.findById(req.params.id)
  .then (product => {
    filePath = 'uploads/' + product.icon.split('/uploads/')[1];
    console.log(filePath)
  })
  .catch(err => {
    return res.status(401).json({ message: "product not found in db!" + err });
  })
  // console.log('params ', req.params)
  Product.deleteOne({ _id: req.params.id })
  .then(result => {
  if (result.n > 0) {
    // delete product.icon
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(err)
      }
      console.log('related file deleted')
    })
    res.status(200).json({ message: "Deletion successful!" });
  } else {
    res.status(401).json({ message: "Not authorized!" });
  }
  })
  .catch(error => {
    console.error(error)
    res.status(500).json({
      message: "Deleting product failed! " + error
    });
  });

 });

router.get('',(req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const productQuery = Product.find().populate('categoryId');
  let fetchedProducts;
  if (pageSize && currentPage) {
    productQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  productQuery
    .then(documents => {
      fetchedProducts = documents;
      return Product.countDocuments();
    })
    .then(count => {
      res.status(200).json({
        message: "Products fetched successfully!",
        products: fetchedProducts,
        maxProducts: count
      });
    })
   .catch(error => {
    res.status(500).json({
      message: "Fetching products failed! " + error
    });
  });
});

router.get("/:id", (req, res, next) => {
    Product.findById(req.params.id).populate('categoryId')
    .then(product => {
      if (product) {
        res.status(200).json(product);
      } else {
        res.status(404).json({ message: "product not found!" });
      }
    }).catch(error => {
      res.status(500).json({
        message: "Fetching product failed! " + error
      });
    });
  });
  
module.exports = router;
