const express = require("express");
const mongoose = require("mongoose");

const Distributor = require("../models/distributor");
const Inventory = require("../models/inventory");
const Accesslog = require("../models/accesslog");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
var multer = require("multer");

const MIME_TYPE_MAP = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/jpg": "jpg",
  };
const DIR = "./uploads/distributorimages/";
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      userid = req.userData.userId;
      const myDir = DIR + userid + "/";
      try {
        if (!fs.existsSync(myDir)) {
          fs.mkdirSync(myDir, { recursive: true });
        }
      } catch (err) {
        throw err;
      }
      cb(null, myDir);
    },
    filename: (req, file, cb) => {
      const fileName =
        req.userData.userId +
        "-" +
        new Date().getTime() +
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
      fileSize: 1024 * 1024 * 10,
    },
    fileFilter: (req, file, cb) => {
      // console.log(file.mimetype)
      if (
        file.mimetype == "image/png" ||
        file.mimetype == "image/jpeg" ||
        file.mimetype == "image/jpg" 
      ) {
        cb(null, true);
      } else {
        cb(null, false);
        return cb(new Error("Only .png or .jpg format allowed!"));
      }
    },
  });
  

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

const checkAuth = require("../middleware/check-auth");

router.post("", checkAuth, upload.any(), async (req, res, next) => {
    const alloweds = process.env.ALLOWEDS;
  
    if (!alloweds.includes(req.userData.email)) {
      logIncident(req.userData.email, "Not allowed to create Geb");
      return res.status(500).json({ message: "Not allowed" });
    }
  
    let dObj = req.body;
   
    dObj.creator = req.userData.userId;
    
    if (req.files) {
      req.files.forEach((file) => {
        if (hostname.includes("torama.ng")) {
          url = "https://api.torama.ng";
        } else {
          url = req.protocol + "://" + req.get("host");
        }
          const fPath = url + "/" + file.path;
        dObj.image = fPath;
      });
    }
  
    Object.entries(dObj).forEach(([key, value]) => {
      if (
        !value ||
        value === undefined ||
        value === null ||
        value === "null" ||
        value === "undefined"
      ) {
        delete dObj[key];
      }
    });
  
    saveDist(dObj);
  
    function saveDist(dObj) {
      dist = new Distributor(dObj);
      dist
        .save()
        .then((result) => {
          res.status(201).json({
            message: "Dist Uploaded successfully",
            Distributor: {
              ...result,
              id: result._id,
            },
          });
        })
        .catch((error) => {
          res.status(500).json({
            message: "Creating a Distributor failed! " + error,
          });
        });
    }
  });

router.put("/:id", checkAuth, upload.any(), async (req, res, next) => {
  let path = "";
  let url = "";
  let distributorObj = req.body;

  const id = req.params.id;
  distributorObj._id = id;
  distributorObj.updater = req.userData.userId;
  if (distributorObj.image === 'null') {
    delete distributorObj.image; // dont update image if not sent
 }
  const distributor = new Distributor(distributorObj);
  
  console.log(distributor, 'distr object');

  if (req.files) {
    req.files.forEach((file) => {
      if (hostname.includes("torama.ng")) {
        url = "https://api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }
        const fPath = url + "/" + file.path;
      distributor.image = fPath;
      console.log(fPath)
    });
  }


  Distributor.updateOne({ _id: req.params.id }, distributor)
  .then((result) => {
    if (result.n > 0) {
      res.status(200).json({ message: "Update successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
  })
  .catch((error) => {
    res.status(500).json({
      message: "Couldn't update distributor! " + error,
    });
  });
  
  // else {
  //   Distributor.updateOne({ _id: req.params.id }, distributor)
  //     .then((result) => {
  //       if (result.n > 0) {
  //         res.status(200).json({ message: "Update successful!" });
  //       } else {
  //         res.status(401).json({ message: "Not authorized!" });
  //       }
  //     })
  //     .catch((error) => {
  //       res.status(500).json({
  //         message: "Couldn't update distributor! " + error,
  //       });
  //     });
  // }
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }
  const id = req.params.id;
  let filePath;


  try {
    Distributor.findById(id)
      .then((distributor) => {
        if (distributor && distributor.image) {
          filePath = "uploads/" + distributor.image.split("/uploads/")[1];
          console.log(filePath);
        }
      })
      .catch((err) => {
        return res
          .status(401)
          .json({ message: "distributor not found in db!" + err });
      });
    // console.log('params ', req.params)
    Distributor.deleteOne({ _id: req.params.id })
      .then((result) => {
        if (result.n > 0) {
          // delete distributor.image
          if (filePath) {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(err, "file unlink err");
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
        console.error(error, "catch err");
        res.status(500).json({
          message: "Deleting distributor failed! " + error,
        });
      });
  } catch (error) {
    console.error(error, "catch err");
    return  res.status(500).json({
        message: "TryCatch: Deleting distributor failed! " + error,
      });
  }
});

router.get("", (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const distributorQuery = Distributor.find().sort({name:1}).populate('linkedCustomer').populate('creator')
  if (pageSize && currentPage) {
    distributorQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  distributorQuery
    .then((documents) => {
      res.status(200).json({
        message: "Inventories fetched successfully!",
        distributor: documents,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching inventories failed! " + error,
      });
    });
});

router.get("/:id", (req, res, next) => {
  Distributor.findById(req.params.id).populate('linkedCustomer').populate('creator')
    .then((distributor) => {
        if (distributor) {
            res.status(200).json({ distributor:distributor });
      } else {
        res.status(404).json({ message: "distributor not found!" });
      }
    })
      .catch((error) => {
        console.log(error)
      res.status(500).json({
        message: "Fetching distributor failed! " + error,
      });
    });
});

module.exports = router;
