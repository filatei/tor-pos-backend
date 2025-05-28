const express = require("express");

const Stockitem = require("../models/stockitem");
const Inventory = require("../models/inventory");
const router = express.Router();
const path = require('path')
const fs = require('fs')
const os = require("os");
const hostname = os.hostname();
const clerkMiddleware = require("../middleware/clerk-check");
var multer = require('multer')
const DIR = '/var/www/uploads/stockitemimages/';

if (!fs.existsSync(DIR)) {
  fs.mkdirSync(DIR, { recursive: true });
  console.log('Created uploads directory:', DIR);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .replace(/\s+/g, '-')       // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9\-]/g, '') // Remove special chars
      .slice(0, 20);              // Limit length
    const uniqueName = `stockitem_${baseName}_${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1 // 1MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/gif", "image/png", "image/jpg", "image/jpeg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only .gif, .png, .jpg and .jpeg formats are allowed.'));
    }
  }
});

const checkAuth = require('../middleware/check-auth');

const Accesslog = require("../models/accesslog");
const message = require("../models/message");

function logIncident(email, description) {
  const logObj = new Accesslog({ email: email, description: description })
  logObj.save(logObj).
    then(result => {
      console.log('access incident logged for user', result)
    })
    .catch(err => {
      console.log('access logging error for user ', err)
    })
}

router.post('', checkAuth, function (req, res, next) {
  upload.single('image')(req, res, function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image too large. Max size is 1MB.' });
      }
      return res.status(400).json({ message: 'Image upload failed: ' + err.message });
    }

    let path = '';
    let url = '';

    if (req.file) {
      if (hostname.includes('torama')) {
        url = 'https://fido-api.torama.ng';
      } else {
        url = req.protocol + '://' + req.get('host');
      }
      path = url + '/uploads/stockitemimages/' + req.file.filename;
    }

    let stockObj = req.body;
    stockObj.name = stockObj.name.toUpperCase();
    stockObj.creator = req.userData.userId;

    const stockitem = new Stockitem(stockObj);
    stockitem.icon = path || null;

    stockitem.save()
      .then((result) => {
        res.status(201).json({
          message: 'Stockitem added successfully',
          stockitem: {
            ...result._doc,
            id: result._id
          }
        });
      })
      .catch(error => {
        res.status(500).json({
          message: "Creating a stockitem failed! " + error
        });
      });
  });
});

router.post('/create', clerkMiddleware, function (req, res, next) {
  upload.single('image')(req, res, function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image too large. Max size is 1MB.' });
      }
      return res.status(400).json({ message: 'Image upload failed: ' + err.message });
    }

    let path = '';
    let url = '';

    if (req.file) {
      if (hostname.includes('torama')) {
        url = 'https://fido-api.torama.ng';
      } else {
        url = req.protocol + '://' + req.get('host');
      }
      path = url + '/uploads/stockitemimages/' + req.file.filename;
    }

    let stockObj = req.body;
    stockObj.name = stockObj.name.toUpperCase();
    stockObj.creator = req.userData.userId;

    const stockitem = new Stockitem(stockObj);
    stockitem.icon = path || null;

    stockitem.save()
      .then((result) => {
        res.status(201).json({
          message: 'Stockitem added successfully',
          stockitem: {
            ...result._doc,
            id: result._id
          }
        });
      })
      .catch(error => {
        res.status(500).json({
          message: "Creating a stockitem failed! " + error
        });
      });
  });
});
// router.post('', checkAuth, upload.single('image'), function (req, res, next) {
//   let path = ""
//   let url = ""
//   if (req.file) {

//     if (hostname.includes('torama')) {
//       url = 'https://fido-api.torama.ng'
//     } else {
//       url = req.protocol + '://' + req.get('host')
//     }

//     path = url + '/uploads/stockitemimages/' + req.file.filename;

//   }


//   let stockObj = req.body;
//   stockObj.name = stockObj.name.toUpperCase()


//   stockObj.creator = req.userData.userId;

//   const stockitem = new Stockitem(stockObj);
//   stockitem.icon = path || null;

//   stockitem.save()
//     .then((result) => {
//       res.status(201).json({
//         message: 'Stockitem added successfully',
//         stockitem: {
//           ...result,
//           id: result._id
//         }
//       });
//     })
//     .catch(error => {
//       res.status(500).json({
//         message: "Creating a stockitem failed! " + error
//       });
//     });

// })

// router.put("/:id", checkAuth, upload.single('image'), (req, res, next) => {
//   let path = ""
//   let url = ""
//   let stockObj = req.body;
//   stockObj.name = stockObj.name.toUpperCase()

//   const id = req.params.id;

//   stockObj._id = req.params.id;

//   stockObj.updater = req.userData.userId;
//   const stockitem = new Stockitem(stockObj);
//   if (req.file && req.file.filename && req.file.filename.length > 0) {

//     if (hostname.includes('torama')) {
//       url = 'https://fido-api.torama.ng';
//     } else {
//       url = req.protocol + '://' + req.get('host');
//     }

//     path = url + '/uploads/stockitemimages/' + req.file.filename;
//     stockitem.icon = path;

//     Stockitem.updateOne({ _id: req.params.id }, stockitem)
//       .then(result => {
//         if (result.n > 0) {
//           res.status(200).json({ message: "Update successful!" });
//         } else {
//           res.status(401).json({ message: "Not authorized!" });
//         }
//       })
//       .catch(error => {
//         res.status(500).json({
//           message: "Couldn't update stockitem! " + error
//         });
//       });
//   } else {
//     Stockitem.updateOne({ _id: req.params.id },
//       stockitem)
//       .then(result => {
//         if (result.n > 0) {
//           res.status(200).json({ message: "Update successful!" });
//         } else {
//           res.status(401).json({ message: "Not authorized!" });
//         }
//       })
//       .catch(error => {
//         res.status(500).json({
//           message: "Couldn't update stockitem! " + error
//         });
//       });
//   }
// });
router.put("/:id", checkAuth, upload.single('image'), async (req, res, next) => {
  try {
    let path = "";
    let url = "";
    let stockObj = req.body;
    stockObj.name = stockObj.name.toUpperCase();

    const id = req.params.id;
    stockObj._id = id;
    stockObj.updater = req.userData.userId;

    if (req.file && req.file.filename && req.file.filename.length > 0) {
      if (hostname.includes('torama')) {
        url = 'https://fido-api.torama.ng';
      } else {
        url = req.protocol + '://' + req.get('host');
      }

      path = url + '/uploads/stockitemimages/' + req.file.filename;
      stockObj.icon = path;
    }

    const result = await Stockitem.findByIdAndUpdate(
      id,
      stockObj,
      { new: true } // Return the updated document
    );

    if (result) {
      res.status(200).json({ stockeitem: result, message: "Update successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Couldn't update stockitem! " + error
    });
  }
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, 'Not allowed to delete ')
    return res.status(500).json({ message: 'Not allowed' });
  }

  const id = req.params.id;
  // is id in inventory as name?
  checkInventory(id);

  async function checkInventory(id) {
    let response;
    response = await Inventory.exists({ name: id });
    console.log('item in inventory, not deleted')
    if (response) {
      return res.status(500).json({ message: 'item already in inventory, not deleted' });
    } else {
      console.log('deleting item...')
      deleteItem()
    }
  }

  function deleteItem() {
    let filePath;
    Stockitem.findById(req.params.id)
      .then(stockitem => {
        if (stockitem && stockitem.icon) {
          filePath = 'uploads/' + stockitem.icon.split('/uploads/')[1];
          console.log(filePath)
        }

      })
      .catch(err => {
        return res.status(401).json({ message: "stockitem not found in db!" + err });
      })
    // console.log('params ', req.params)
    Stockitem.deleteOne({ _id: req.params.id })
      .then(result => {
        if (result.n > 0) {
          // delete stockitem.icon
          if (filePath) {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(err)
              } else {
                console.log('related file deleted')
              }
            })
          }
          res.status(200).json({ message: "Deletion successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch(error => {
        console.error(error)
        res.status(500).json({
          message: "Deleting stockitem failed! " + error
        });
      });

  }

});


router.get("/getByText", checkAuth, async (req, res, next) => {
  try {
    const alloweds = [
      "ADMIN",
      "MANAGER",
      "GENERAL MANAGER",
      "SECRETARY",
      "SNR ACCOUNTANT",
      "ACCOUNTANT",
      "SUPERVISOR",
      "POS OFFICER",
    ];

    if (!alloweds.includes(req.userData.role)) {
      return res.status(500).json({ message: "Not allowed" });
    }

    const { searchTerm } = req.query;

    let result = [];
    result = await Stockitem.find({
      name: { $regex: searchTerm, $options: "i" },
    })
      .sort({ name: 1 })
      .limit(50);

    console.log(result[0], "result");
    return res.status(200).json({ stockItems: result });

  } catch (error) {
    console.log(error);
    res.status(404).json({ message: "server  Error! " + error });
  }
});

router.get("/search", clerkMiddleware, async (req, res, next) => {
  try {
    const alloweds = [
      "ADMIN",
      "MANAGER",
      "GENERAL MANAGER",
      "SECRETARY",
      "SNR ACCOUNTANT",
      "ACCOUNTANT",
      "SUPERVISOR",
      "POS OFFICER",
      "USER",
    ];

    if (!alloweds.includes(req.userData.role)) {
      return res.status(500).json({ message: "Not allowed" });
    }

    const { searchTerm } = req.query;
    let result = [];
    result = await Stockitem.find({
      name: { $regex: searchTerm, $options: "i" },
    })
      .sort({ name: 1 })
      .limit(50);

    console.log(result[0], "result");
    return res.status(200).json({ stockItems: result });

  } catch (error) {
    console.log(error);
    res.status(404).json({ message: "server  Error! " + error });
  }
});

router.get('', (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const stockitemQuery = Stockitem.find();
  if (pageSize && currentPage) {
    stockitemQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  stockitemQuery
    .then(documents => {
      res.status(200).json({
        message: "Inventories fetched successfully!",
        stockitem: documents
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching inventories failed! " + error
      });
    });
});

router.get('/list', clerkMiddleware, (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const stockitemQuery = Stockitem.find();
  if (pageSize && currentPage) {
    stockitemQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  stockitemQuery
    .then(documents => {
      res.status(200).json({
        message: "Inventories fetched successfully!",
        stockitems: documents
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching inventories failed! " + error
      });
    });
});

router.get("/:id", (req, res, next) => {
  Stockitem.findById(req.params.id)
    .then(stockitem => {
      if (stockitem) {
        res.status(200).json(stockitem);
      } else {
        res.status(404).json({ message: "stockitem not found!" });
      }
    }).catch(error => {
      res.status(500).json({
        message: "Fetching stockitem failed! " + error
      });
    });
});

module.exports = router;
