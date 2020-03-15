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
    const fileName = new Date().getTime() + '-' + file.originalname.toLowerCase().split(' ').join('-');
    console.log(fileName)
    cb(null, fileName)
  }
});


// Multer Mime Type Validation
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
  }
});

 
const checkAuth = require('../middleware/check-auth');

router.post('', checkAuth, upload.single('icon'), function (req, res, next) {
  let path = ""
  let url= ""
  if (req.file) { 
    url = req.protocol + '://' + req.get('host')
    path = url + '/uploads/productimages/' + req.file.filename; 
  }
  
  console.log('path: ', path)
  console.log('req.body', req.body)
  let prodObj = req.body;
  prodObj.creator = req.userData.userId;
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
      message: "Creating a product failed!"
    });
  });
  
})

// router.post("", checkAuth,(req, res, next) => {
//   // res.status(200).json({
//   //   msg: 'file good',
//   //   file: `uploads/${req.file.filename}`
//   // })
//   upload(req, res, (err) => {
//     if(err) {
//       return res.status(501).send({error: err})
//     }
//     if(req.file == undefined) {
//       return res.status(501).json({msg: 'Error : no file'});
//     } 
//     console.log('req.file: ', req.file); 
//     let prodObj = req.body;
//     prodObj.creator = req.userData.userId;
//     const product = new Product(prodObj);
//     product.icon = `uploads/${req.file.filename}`;

//     product.save()
//     .then ((result)=> {
//       res.status(201).json({
//         message: 'Product added successfully',
//         product: {...result,
//           id: result._id
//         }
//     });
//     })
//     .catch(error => {
//       res.status(500).json({
//         message: "Creating a product failed!"
//       });
//     });
//     // res.status(200).json({
//     //   msg: 'file good',
//     //   file: `uploads/${req.file.filename}`
//     // })
//   })

  
// });

router.put("/:id", checkAuth, upload.single('icon'), (req, res, next) => {
    let path = ""
    let url= ""
    if (req.file) { 
      url = req.protocol + '://' + req.get('host')
      path = url + '/uploads/productimages/' + req.file.filename; 
    }
    let prodObj = req.body;
    prodObj._id = req.params.id;
    prodObj.updater = req.userData.userId;
    const product = new Product(prodObj);
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
        message: "Couldn't udpate product!"
      });
    });
});

router.delete("/:id", checkAuth, (req, res, next) => {
  let filePath;
  Product.findById(req.params.id)
  .then (product => {
    filePath = 'uploads/' + product.icon.split('uploads')[1];
  })
  .catch(err => {
    return res.status(401).json({ message: "product not found in db!" });
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
