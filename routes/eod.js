require("dotenv").config();
const express = require("express");
const Eod = require("../models/eod");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");
const e = require("express");
const Accesslog = require("../models/accesslog");

const os = require("os");
const HOSTNAME = os.hostname();

const multerConfig = require("../config/multer-config");
const DIR = "/var/www/uploads/eodimages/";
const upload = multerConfig(DIR);

router.get("", checkAuth, (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to see eod");
    return res.status(500).json({ message: "Not allowed" });
  }
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.currentpage;
  const sort = req.query.sort;

  let eodQuery = Eod.find()
    .sort({ date: -1 })
    .populate("terminal_id")
    .limit(150);
  // if (pageSize && currentPage) {
  //   eodQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  // }

  eodQuery
    .then((documents) => {
      res.status(200).json({
        eods: documents,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching eods failed! " + error,
      });
    });
});

router.post("", checkAuth, upload.single("image"), (req, res, next) => {
  const alloweds = ["ADMIN", "SECRETARY", "GENERAL MANAGER", "MANAGER", "SNR ACCOUNTANT", "ACCOUNTANT"]

  if (!alloweds.includes(req.userData.role)) {
    return res.status(500).json({ message: "Not allowed" });
  }

  const DOMAIN = process.env.DOMAIN || req.protocol + "://" + req.get("host");
  let eodObj = req.body;
  console.log(eodObj, "eodobjj");
  

  let imagePath = "";

  if (req.file?.path) {
      console.log(req.file.path, "req.file.path")
      const url = HOSTNAME.includes("torama.ng")
        ? "https://fido-api.torama.ng"
        : DOMAIN;
      imagePath =
        url +
        "/eoduploads/" +
        req.file.path.split("/var/www/uploads/eodimages")[1];
    }
  
  eodObj.creator = req.userData.userId;
  // eodObj.terminal_id = eodObj.terminal_id._id;
  eodObj.image = imagePath;
  console.log(eodObj, "eodobj");

  const eod = new Eod(eodObj);
  //  console.log(eod);
  eod
    .save()
    .then((result) => {
      // console.log(result)
      res.status(201).json({
        message: "Eod added successfully",
        eod: {
          ...result,
          id: result._id,
        },
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "creating eods failed! " + error,
      });
    });
});

router.put("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    return res.status(500).json({ message: "Not allowed" });
  }

  let eodObj = req.body;
  eodObj._id = req.params.id;
  eodObj.updater = req.userData.userId;
  const eod = new Eod(eodObj);

  Eod.updateOne({ _id: req.params.id }, eod)
    .then((result) => {
      if (result.n > 0) {
        res.status(200).json({ message: "Update successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update eod! " + error,
      });
    });
});

router.delete("/:id", checkAuth, async (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    return res.status(500).json({ message: "Not allowed" });
  }

  Eod.deleteOne({ _id: req.params.id })
    .then((result) => {
      if (result.n > 0) {
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Deleting eod failed! " + error,
      });
    });
});

router.get("/summary", checkAuth, async (req, res, next) => {
  const alloweds = req.userData.role === "ADMIN";

  if (!alloweds) {
    logIncident(req.userData.email, "Not allowed to see eod summary");
    return res.status(500).json({ message: "Not allowed to see eod summary" });
  }

  const { startDate } = req.query;
  // const eodData = await Eod.find().populate("terminal_id");
  // console.log("eodDate - ", eodData);
  // get terminal_id from bank
  let terminalId;
  const monthInt = new Date(startDate).getMonth() + 1;
  const yearInt = new Date(startDate).getFullYear();
  console.log(monthInt, yearInt, "monthint yearint");
  const summary = await Eod.aggregate([
    // show cardTotals per month for the year for each bank
    {
      $lookup: {
        from: "terminals",
        localField: "terminal_id",
        foreignField: "_id",
        as: "terminal",
      },
    },
    {
      $unwind: "$terminal",
    },

    {
      $group: {
        _id: {
          year: { $year: "$date" },
          bank: "$terminal.bank",
          company: { $toUpper: "$terminal.company" },
        },
        totalSalesAmount: {
          $sum: "$cardTotal",
        },
      },
    },
    {
      $project: {
        "_id.year": 1,
        "_id.bank": 1,
        "_id.company": 1,

        totalSalesAmount: 1,
      },
    },

    {
      $sort: {
        "_id.bank": 1,
        "_id.company": 1,
        "_id.year": -1,
      },
    },
  ]);
  console.log(summary);

  if (summary) {
    console.log("monthly agg of eod");
    return res.status(200).json({
      message: "monthly sales per bank for " + yearInt,
      records: summary,
    });
  }
  return res.status(500).json({ message: " eod aggregate error: " });
});

router.get("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to see eod");
    return res.status(500).json({ message: "Not allowed" });
  }
  Eod.findById(req.params.id)
    .populate("terminal_id")
    .then((eod) => {
      if (eod) {
        // console.log(eod)
        res.status(200).json({ eod: eod });
      } else {
        res.status(404).json({ message: "eod not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching eod failed!",
      });
    });
});

module.exports = router;
