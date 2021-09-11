const express = require("express");

const Produceitem = require("../models/produceitem");
const Inventory = require("../models/inventory");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
var multer = require("multer");
const DIR = "./uploads/produceitemimages/";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    const fileName =
      new Date().getTime() +
      "-" +
      file.originalname.toLowerCase().split(" ").join("-");
    console.log(fileName);
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

router.post("", checkAuth, upload.single("image"), function (req, res, next) {
  let path = "";
  let url = "";
  if (req.file) {
    if (hostname.includes("torama")) {
      url = "https://api.torama.ng";
    } else {
      url = req.protocol + "://" + req.get("host");
    }
    // url = 'https://api.torama.ng'
    // console.log(url)
    path = url + "/uploads/produceitemimages/" + req.file.filename;
    // console.log(path)
  }

  // console.log('path: ', path)
  // console.log('req.body', req.body)

  let stockObj = req.body;
  stockObj.name = stockObj.name.toUpperCase();

  stockObj.creator = req.userData.userId;

  const produceitem = new Produceitem(stockObj);
  produceitem.icon = path || null;

  produceitem
    .save()
    .then((result) => {
      res.status(201).json({
        message: "Produceitem added successfully",
        produceitem: { ...result, id: result._id },
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Creating a produceitem failed! " + error,
      });
    });
});

router.put("/:id", checkAuth, upload.single("image"), (req, res, next) => {
  let path = "";
  let url = "";
  let stockObj = req.body;
  stockObj.name = stockObj.name.toUpperCase();

  const id = req.params.id;

  stockObj._id = req.params.id;

  stockObj.updater = req.userData.userId;
  const produceitem = new Produceitem(stockObj);
  if (req.file && req.file.filename && req.file.filename.length > 0) {
    if (hostname.includes("torama")) {
      url = "https://api.torama.ng";
    } else {
      url = req.protocol + "://" + req.get("host");
    }

    path = url + "/uploads/produceitemimages/" + req.file.filename;
    produceitem.icon = path;
    Produceitem.updateOne({ _id: req.params.id }, produceitem)
      .then((result) => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          message: "Couldn't update produceitem! " + error,
        });
      });
  } else {
    Produceitem.updateOne({ _id: req.params.id }, produceitem)
      .then((result) => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          message: "Couldn't update produceitem! " + error,
        });
      });
  }
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }

  const id = req.params.id;
  // is id in inventory as name?
  checkInventory(id);

  async function checkInventory(id) {
    let response;
    response = await Inventory.exists({ name: id });
    console.log("item in inventory, not deleted");
    if (response) {
      return res
        .status(500)
        .json({ message: "item already in inventory, not deleted" });
    } else {
      console.log("deleting item...");
      deleteItem();
    }
  }

  function deleteItem() {
    let filePath;
    Produceitem.findById(req.params.id)
      .then((produceitem) => {
        if (produceitem && produceitem.icon) {
          filePath = "uploads/" + produceitem.icon.split("/uploads/")[1];
          console.log(filePath);
        }
      })
      .catch((err) => {
        return res
          .status(401)
          .json({ message: "produceitem not found in db!" + err });
      });
    // console.log('params ', req.params)
    Produceitem.deleteOne({ _id: req.params.id })
      .then((result) => {
        if (result.n > 0) {
          // delete produceitem.icon
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
          message: "Deleting produceitem failed! " + error,
        });
      });
  }
});

router.get("", (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const produceitemQuery = Produceitem.find();
  if (pageSize && currentPage) {
    produceitemQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  produceitemQuery
    .then((documents) => {
      console.log(documents?.length, " documents");
      res.status(200).json({
        message: "produce item fetched successfully!",
        produceitem: documents,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching produceitem failed! " + error,
      });
    });
});

router.get("/:id", (req, res, next) => {
  Produceitem.findById(req.params.id)
    .then((produceitem) => {
      if (produceitem) {
        res
          .status(200)
          .json({ produceitem: produceitem, message: "produceitem found" });
      } else {
        res.status(404).json({ message: "produceitem not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching produceitem failed! " + error,
      });
    });
});

module.exports = router;
