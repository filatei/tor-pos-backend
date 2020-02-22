const express = require("express");
const Product = require("../models/product");
const router = express.Router();

const checkAuth = require('../middleware/check-auth');

router.post("", checkAuth, (req, res, next) => {
  let prodObj = req.body;
  const product = new Product(prodObj);
    // const product = new Product({
    //     name: req.body.name,
    //     price: req.body.price,
    //     description: req.body.description,
    //     icon: req.body.icon,
    //     taxRate: req.body.taxRate,
    //     createdAt: req.body.createdAt,
    //     updatedAt: req.body.updatedAt
    // });
  console.log('prod ', product);
  product.save().then ((result)=> {
      console.log('saved product', result)
  })
  res.status(201).json({
      message: 'Product added successfully'
  });
});

router.delete("/:id", checkAuth, (req, res, next) => {
    console.log('params ', req.params)
   Product.deleteOne({ _id: req.params.id }).then(result => {
     console.log(result);
     res.status(200).json({ message: "product deleted!" });
   });
 });

router.get('',(req, res, next) => {
   Product.find()
   .then(docs => {
       
    res.status(200).json(
        {
            products: docs
        });
   })
   .catch(err => {
       console.log (err)
   })
});

router.get("/:id", (req, res, next) => {
    Product.findById(req.params.id).then(product => {
      if (product) {
        res.status(200).json(product);
      } else {
        res.status(404).json({ message: "product not found!" });
      }
    });
  });
  

router.put("/:id", checkAuth, (req, res, next) => {
  let prodObj = req.body;
  prodObj._id = req.params.id;
  const product = new Product(prodObj);
    // const product = new Product({
    //     _id: req.params.id,
    //     name: req.body.name,
    //     description: req.body.description,
    //     updatedAt: req.body.updatedAt,
    //     icon: req.body.icon,
    //     taxRate: req.body.taxRate,
    //     price: req.body.price
    // });
    Product.updateOne({ _id: req.params.id }, product).then(result => {
      res.status(200).json({ message: "Update successful!" });
    });
});

module.exports = router;
