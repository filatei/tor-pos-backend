require("dotenv").config();
const express = require("express");
const Eod = require("../models/eod");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");
const e = require("express");

router.get("", (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to see eod");
    return res.status(500).json({ message: "Not allowed" });
  }
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.currentpage;
  const sort = req.query.sort;

  let eodQuery = Eod.find().sort({ date: -1 }).populate("terminal_id");
  if (pageSize && currentPage) {
    eodQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }

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

router.get("/:id", (req, res, next) => {
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

router.post("", checkAuth, (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    return res.status(500).json({ message: "Not allowed" });
  }
  let eodObj = req.body;
  console.log(eodObj, "eodobj");

  eodObj.creator = req.userData.userId;
  eodObj.terminal_id = eodObj.terminal_id._id;

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

router.delete("/:id", (req, res, next) => {
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

module.exports = router;
