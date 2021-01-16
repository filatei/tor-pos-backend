const express = require("express");
const Message = require("../models/message");
const Accesslog = require("../models/accesslog");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const Mail = require("../mail.js");
var multer = require("multer");
const DIR = "./uploads/messageimages/";
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
  const alloweds = process.env.STOREALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Message");
    return res.status(500).json({ message: "Not allowed to create message" });
  }
  try {
    const { subject, body, sender, to, cc } = req.body;
    const obj = req.body;
    obj.creator = req.userData.userId;
    // console.log(stockObj, 'message route')
    const message = new Message(obj);
    // message.image = path || null;

    const invSave = await message.save();
    //   Mail.sendMessage(invSave);
    res.status(201).json({
      message: "Message added successfully",
      message: { ...invSave, id: invSave._id },
    });
  } catch (err) {
    if (err) {
      res.status(500).json({
        message: "Creating an message failed! " + err,
      });
    }
  }
});

router.put("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to update message");
    return res.status(500).json({ message: "Not allowed to create message" });
  }
  let path = "";
  let url = "";
  let stockObj = req.body;

  const id = req.params.id;
  stockObj._id = req.params.id;
  stockObj.updater = req.userData.userId;
  const message = new Message(stockObj);

  // wont allow update to quantities

  Message.updateOne({ _id: req.params.id }, message)
    .then((result) => {
      if (result.n > 0) {
        res.status(200).json({ message: "Update successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update message! " + error,
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

  async function getMessage() {
    return await Message.findById(id);
  }

  let stockObj = getMessage();

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
  Message.deleteOne({ _id: req.params.id })
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
        message: "Deleting message failed! " + error,
      });
    });
});

router.get("", checkAuth, (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to see message");
    return res.status(500).json({ message: "Not allowed to see message" });
  }

  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const messageQuery = Message.find()
    .sort({ updatedAt: -1 })
    .populate("sender")
    .populate("to")
    .populate("cc")
    .populate("creator");
  if (pageSize && currentPage) {
    messageQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  messageQuery
    .then((documents) => {
      // console.log(documents[0])
      res.status(200).json({
        message: "Messages fetched successfully!",
        message: documents,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching messages failed! " + error,
      });
    });
});

router.get("/:id", (req, res, next) => {
  Message.findById(req.params.id)
    .populate("sender")
    .populate("to")
    .populate("cc")
    .populate("creator")
    .then((message) => {
      if (message) {
        res.status(200).json(message);
      } else {
        res.status(404).json({ message: "message not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching message failed! " + error,
      });
    });
});

module.exports = router;
