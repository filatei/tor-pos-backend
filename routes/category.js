require('dotenv').config();
const express = require("express");
const Category = require("../models/category");
const router = express.Router();
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

router.post("", checkAuth, upload.single('image'), (req, res, next) => {
    const alloweds = process.env.ALLOWEDS;
  
    if ( !alloweds.includes(req.userData.email)) {
      return res.status(500).json({message: 'Not allowed'});
    }
    let path;
    if (req.file) { 
      url = req.protocol + '://' + req.get('host');
      // url = 'https://fido-api.torama.ng'
      path = url + '/uploads/productimages/' + req.file.filename; 

    }
  
    let categ = req.body;
    categ.barcode = req.body.name;
  
    categ.creator = req.userData.userId; 
    categ.icon = path;
  
    const category = new Category(categ);
    category.save().then ((result)=> {
      // console.log(result)
      res.status(201).json({
        message: "Category added successfully",
        category: {
          ...result,
          id: result._id
        }
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "creating category failed! " + error
      });
    });
  });

router.get('',(req, res, next) => {
  const pageSize = +req.query.pagesize ;
  const currentPage = +req.query.currentpage;
  const sort = req.query.sort;

  let categQuery = Category.find();
  if (pageSize && currentPage) {
    categQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  
  categQuery
    .then(docs => {
      res.status(200).json({
        message: "categories fetched successfully!",
        categories: docs,
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching categories failed! " + error
      });
    });
});

router.get("/:id",  (req, res, next) => {
  // console.log('id ', req.params.id)
  // console.log(req.userData.userId)
  Category.findById(req.params.id)
  .then(categ => {
    if ( categ ) {
      res.status(200).json({category: categ});
    } else {
      res.status(404).json({ message: "category not found!" });
    }
  })
  .catch(error => {
    res.status(500).json({
      message: "Fetching category failed!"
    });
  });
});


  
router.put("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }
  
  let categ = req.body;
  categ._id = req.params.id;
  categ.updater = req.userData.userId; 
  const category = new Category(categ);

  Category.updateOne({ _id: req.params.id }, category)
  .then(result => {
    if (result.n > 0) {
      res.status(200).json({ message: "Update successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
  })
  .catch(error => {
    res.status(500).json({
      message: "Couldn't update category! "+ error
    });
  });
});

router.delete("/:id", (req, res, next) => {
  const alloweds = ['filatei@torama.ng'];  
  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }

   Category.deleteOne({ _id: req.params.id })
   .then(result => {
    // console.log(result);
    if (result.n > 0) {
      res.status(200).json({ message: "Deletion successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
   })
   .catch(error => {
    res.status(500).json({
      message: "Deleting Category failed!" + error
    });
  });
});


module.exports = router;
