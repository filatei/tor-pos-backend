const express = require("express");
const Inventory = require("../models/inventory");
const Stockitem = require("../models/stockitem");
const Accesslog = require("../models/accesslog");
const Quantity = require("../models/quantity");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const Mail = require("../mail.js");
var multer = require("multer");
const DIR = "./uploads/inventoryimages/";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    const fileName =
      new Date().getTime() +
      "-" +
      file.originalname.toLowerCase().split(" ").join("-");
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

router.post("", checkAuth, function (req, res, next) {
  // const alloweds = process.env.STOREALLOWEDS;
  const ALLOWED = ['ADMIN', 'STOREKEEPER', 'MANAGER','GENERAL MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT']
  if (!ALLOWED.includes(req.userData.role)) {
    return res.status(500).json({ message: "Not allowed to create inventory" });
  }

  let stockObj = req.body;
  stockObj.creator = req.userData.userId;
  // console.log(stockObj, 'inventory route')
  const inventory = new Inventory(stockObj);
  // inventory.icon = path || null;

  saveInventory();

  // uodate quantities in Quantity
  async function updateQty() {
    let quantity;
    const quant = await Quantity.findOne({
      name: stockObj.name,
      store: stockObj.store,
    });
    // console.log(quant, 'quant')
    if (!quant) {
      // new Inventory
      quantity = new Quantity({
        name: stockObj.name,
        store: stockObj.store,
        qty: stockObj.qty,
      });
      await quantity.save();
    } else {
      if (stockObj.ops == "OUTFLOW") {
        quant.qty = quant.qty - stockObj.qty;
      }
      if (stockObj.ops == "INFLOW") {
        quant.qty = quant.qty + stockObj.qty;
      }
      await quant.save();
    }
  }

  async function saveInventory() {
    try {
      await updateQty();
      const invSave = await inventory.save();
      Mail.sendInventory(invSave);
      res.status(201).json({
        message: "Inventory added successfully",
        inventory: { ...invSave, id: invSave._id },
      });
    } catch (err) {
      if (err) {
        res.status(500).json({
          message: "Creating an inventory failed! " + err,
        });
      }
    }
  }
});

router.put("/:id", checkAuth, (req, res, next) => {
  const ALLOWED = ['ADMIN', 'STOREKEEPER', 'MANAGER','GENERAL MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT']
  if (!ALLOWED.includes(req.userData.role)) {
    return res.status(500).json({ message: "Not allowed to create inventory" });
  }
  let path = "";
  let url = "";
  let stockObj = req.body;

  const id = req.params.id;
  stockObj._id = req.params.id;
  stockObj.updater = req.userData.userId;
  const inventory = new Inventory(stockObj);

  // wont allow update to quantities

  Inventory.updateOne({ _id: req.params.id }, inventory)
    .then((result) => {
      if (result.n > 0) {
        res.status(200).json({ message: "Update successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update inventory! " + error,
      });
    });
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }

  const id = req.params.id;

  async function getInventory() {
    return await Inventory.findById(id);
  }

  let stockObj = getInventory();

  async function updateQty() {
    // subtract qty being deleted from quantities
    const quant = await Quantity.findOne({
      name: stockObj.name,
      store: stockObj.store,
    });
    if (quant) {
      quant.qty = quant.qty - stockObj.qty;
      await quant.save();
    }
  }

  // console.log('params ', req.params)
  Inventory.deleteOne({ _id: req.params.id })
    .then((result) => {
      if (result.n > 0) {
        updateQty();
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        message: "Deleting inventory failed! " + error,
      });
    });
});

router.get("", checkAuth, (req, res, next) => {
  const ALLOWED = ['ADMIN', 'STOREKEEPER', 'SECRETARY', 'MANAGER','GENERAL MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT']
  if (!ALLOWED.includes(req.userData.role)) {
    return res.status(500).json({ message: "Not allowed to create inventory" });
  }

  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const inventoryQuery = Inventory.find()
    .sort({ createdAt: -1 })
    .populate("name")
    .populate("sender")
    .populate("receiver");
  if (pageSize && currentPage) {
    inventoryQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  inventoryQuery
    .then((documents) => {
      // console.log(documents[0])
      res.status(200).json({
        message: "Inventories fetched successfully!",
        inventory: documents,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching inventories failed! " + error,
      });
    });
});

router.get("/:id", (req, res, next) => {
  Inventory.findById(req.params.id)
    .populate("name")
    .populate("sender")
    .populate("receiver")
    .then((inventory) => {
      if (inventory) {
        res.status(200).json(inventory);
      } else {
        res.status(404).json({ message: "inventory not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching inventory failed! " + error,
      });
    });
});

module.exports = router;
