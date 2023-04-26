const express = require("express");
const Bank = require("../models/bank");
const User = require("../models/user");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
var multer = require("multer");
const DIR = "/var/www/uploads/bankimages/";

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

const checkAuth = require("../middleware/check-auth");
const Accesslog = require("../models/accesslog");

function logIncident(email, description) {
  const logObj = new Accesslog({ email: email, description: description });
  logObj
    .save(logObj)
    .then((result) => {
      console.log("access incident logged for user", result);
    })
    .catch((err) => {
      console.log("access logging error for user ", err);
    });
}

router.post("", checkAuth, upload.single("image"), async (req, res, next) => {
  let myPath = "";
  let url = "";
  let prodObj = req.body;
  const role = req.userData.role;
  const alloweds = ['ADMIN', 'MANAGER', 'GENERAL MANAGER', 'SNR ACCOUNTANT'];
  if ( !alloweds.includes(role) ) {
    return res.status(500).json({
      message: "Creating a bank failed! " + error,
    });
  }
  
  prodObj.price = parseFloat(prodObj.price);
  prodObj.taxRate = parseFloat(prodObj.taxRate) || 0;
  

  if (req.file) {
    if (hostname.includes("torama")) {
      url = "https://fido-api.torama.ng";
    } else {
      url = req.protocol + "://" + req.get("host");
    }
    
    myPath = url + "/" + req.file.path.split('/var/www/')[1];
    prodObj.icon = myPath;
    console.log(myPath, 'myPath')
  }

  prodObj.creator = await User.findOne({userId:req.userData.userId})._id;

  const bank = new Bank(prodObj);
  
  bank
    .save()
    .then((result) => {
      res.status(201).json({
        message: "Bank added successfully",
        bank: { ...result, id: result._id },
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Creating a bank failed! " + error,
      });
    });
});

router.put("/:id", checkAuth, upload.single("image"), (req, res, next) => {

  try {
    let myPath = "";
  let url = "";
  let prodObj = req.body;
  console.log(prodObj)
  const price = req.body.price;
  const taxRate = req.body.taxRate;
  const description = req.body.description;
  const name = req.body.name;
  const group = req.body.group;
  const category = req.body.category;
  // const updatedAt = req.body.updatedAt;
  const updater = req.userData.userId;
  const id = req.params.id;
  prodObj._id = req.params.id;
  prodObj.updater = req.userData.userId;
  const bank = new Bank(prodObj);
  if (req.file ) {
    if (hostname.includes("torama")) {
      url = "https://fido-api.torama.ng";
    } else {
      url = req.protocol + "://" + req.get("host");
    }

    myPath = url + "/" + req.file.path.split('/var/www/')[1];
    bank.icon = myPath;
    console.log(bank, 'bank1')
    Bank.updateOne({ _id: req.params.id }, bank)
      .then((result) => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          message: "Couldn't udpate bank! " + error,
        });
      });
  } else {
    console.log(bank, 'bank2')
    Bank.updateOne(
      { _id: req.params.id },
      bank
    )
      .then((result) => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          message: "Couldn't update bank! " + error,
        });
      });
  }
  }
  catch(err) {
    console.log(err)
  }
  
});


router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }

  let filePath;
  Bank.findById(req.params.id)
    .then((bank) => {
      if (bank && bank.icon) {
        filePath = "uploads/" + bank.icon.split("/uploads/")[1];
        console.log(filePath)
      }
    })
    .catch((err) => {
      return res
        .status(401)
        .json({ message: "bank not found in db!" + err });
    });
  console.log('params ', req.params)
  Bank.deleteOne({ _id: req.params.id })
    .then((result) => {
      if (result.n > 0) {
        // delete bank.icon
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
        message: "Deleting bank failed! " + error,
      });
    });
});

router.get("", (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const bankQuery = Bank.find().populate("categoryId");
  let fetchedBanks;
  if (pageSize && currentPage) {
    bankQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  bankQuery
    .then((documents) => {
      // console.log(documents, 'banks')
      res.status(200).json({
        message: "Banks fetched successfully!",
        banks: documents,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching banks failed! " + error,
      });
    });
});

router.get("/:id", (req, res, next) => {
  Bank.findById(req.params.id)
    .populate("categoryId")
    .then((bank) => {
      if (bank) {
        res.status(200).json(bank);
      } else {
        res.status(404).json({ message: "bank not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching bank failed! " + error,
      });
    });
});

module.exports = router;
