const express = require("express");
const Product = require("../models/fia_product");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
var multer = require("multer");
const DIR = "/var/www/uploads/fia_productimages/";

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "application/pdf": "pdf",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    const fileName =
      new Date().getTime() +
      "-" +
      file.originalname.toLowerCase().split(" ").join("-") +
      "." +
      MIME_TYPE_MAP[file.mimetype];
    cb(null, fileName);
  },
});

// Multer Mime Type Validation
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/gif" ||
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .gif, .png, .jpg and .jpeg format allowed!"));
    }
  },
});

const checkAuth = require("../middleware/fia-check-auth");

router.post("", checkAuth, upload.single("image"), async (req, res, next) => {
  try {
    let myPath = "";
    let url = "";
    let prodObj = req.body;

    if (req.file) {
      if (hostname.includes("torama")) {
        url = "https://fido-api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }
      
      myPath = url + "/" + req.file.path.split('/var/www/')[1];
      prodObj.icon = myPath;
    }

    prodObj.price = parseInt(prodObj.price) || 0;
    prodObj.taxRate = parseInt(prodObj.taxRate) || 0;;

    prodObj.creator = req.userData.userId;
    const product = new Product(prodObj);
   
    product
      .save()
      .then((result) => {
        console.log (result,'result' );

        res.status(201).json({
          message: "Product added successfully",
          product: { ...result, id: result._id },
        });
      })
      .catch((error) => {
        res.status(500).json({
          message: "Creating a product failed! " + error,
        });
    });
    
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Creating a product failed! " + error,
    });
  }
});

router.put("/:id", checkAuth, upload.single("image"), (req, res, next) => {
  try {
    let myPath = "";
    let url = "";
    let prodObj = req.body;
  
    prodObj.updater = req.userData.userId;
    if (req.file ) {
      if (hostname.includes("torama")) {
        url = "https://fido-api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }

      myPath = url + "/" + req.file.path.split('/var/www/')[1];
      prodObj.icon = myPath;
    }

    Product.updateOne({ _id: req.params.id }, prodObj)
      .then( async (result) => {
        console.log(result, 'result')
        if (result.n > 0) {
          const p = await Product.findById(req.params.id);
          console.log(p)
          res.status(200).json({ message: "Update successful!", product: p } );
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          message: "Couldn't update product! " + error,
        });
      });
    } 
  catch(err) {
    console.log(err)
  }
});

router.delete("/:id", checkAuth, (req, res, next) => {
  // const alloweds =['ADMIN', 'GENERAL MANAGER'];

  // if (!alloweds.includes(req.userData.role)) {
  //   return res.status(500).json({ message: "Not allowed" });
  // }
  console.log(req.params.id)

  let filePath;
  Product.findById(req.params.id)
    .then((product) => {
      if (product && product.icon) {
        filePath = "uploads/" + product.icon.split("/uploads/")[1];
        console.log(filePath)
      }
    })
    .catch((err) => {
      return res
        .status(401)
        .json({ message: "product not found in db!" + err });
    });
  console.log('params ', req.params)
  Product.deleteOne({ _id: req.params.id })
    .then((result) => {
      if (result.n > 0) {
        // delete product.icon
        if (filePath) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(err);
            } else {
              console.log("related file deleted");
            }
          });
        }
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        message: "Deleting product failed! " + error,
      });
    });
});

router.get("", (req, res, next) => {
  console.log(req.body, 'req')
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const productQuery = Product.find().populate("categoryId");
  let fetchedProducts;
  if (pageSize && currentPage) {
    productQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  productQuery
    .then((documents) => {
      // console.log(documents, 'products')
      res.status(200).json({
        message: "Products fetched successfully!",
        products: documents,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching products failed! " + error,
      });
    });
});

router.get("/:id", (req, res, next) => {
  Product.findById(req.params.id)
    .populate("categoryId")
    .then((product) => {
      if (product) {
        res.status(200).json(product);
      } else {
        res.status(404).json({ message: "product not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching product failed! " + error,
      });
    });
});

module.exports = router;
