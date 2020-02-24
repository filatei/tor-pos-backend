const express = require("express");
const Product = require("../models/product");
const router = express.Router();

const checkAuth = require('../middleware/check-auth');

router.post("", checkAuth, (req, res, next) => {
  let prodObj = req.body;
  prodObj.creator = req.userData.userId;
  const product = new Product(prodObj);

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
      message: "Creating a product failed!"
    });
  });
});

router.put("/:id", checkAuth, (req, res, next) => {
  let prodObj = req.body;
  prodObj._id = req.params.id;
  prodObj.updater = req.userData.userId;
  const product = new Product(prodObj);
    
    Product.updateOne({ _id: req.params.id }, product)
    .then(result => {
      if (result.nModified > 0) {
        res.status(200).json({ message: "Update successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Couldn't udpate product!"
      });
    });
});

router.delete("/:id", checkAuth, (req, res, next) => {
   // console.log('params ', req.params)
   Product.deleteOne({ _id: req.params.id })
   .then(result => {
    if (result.n > 0) {
      res.status(200).json({ message: "Deletion successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
   })
   .catch(error => {
    res.status(500).json({
      message: "Deleting product failed!"
    });
  });
 });

router.get('',(req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const productQuery = Product.find();
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
      message: "Fetching products failed!"
    });
  });
});

router.get("/:id", (req, res, next) => {
    Product.findById(req.params.id)
    .then(product => {
      if (product) {
        res.status(200).json(product);
      } else {
        res.status(404).json({ message: "product not found!" });
      }
    }).catch(error => {
      res.status(500).json({
        message: "Fetching product failed!"
      });
    });
  });
  



module.exports = router;
