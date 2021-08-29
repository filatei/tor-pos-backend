const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");
const _ = require("lodash");
const Produce = require("../models/produce");
const Summary = require("../summary/recsummary");

const Accesslog = require("../models/accesslog");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();
const tokens = require(`${homedir}/.token.json`);
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const moment = require("moment");
const Mail = require("../mail");
const Utils = require("../utils");

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

router.post("", checkAuth, function (req, res, next) {
  const alloweds = process.env.PRODUCERS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Produce");
    return res.status(500).json({ message: "Not allowed to create Produce" });
  }

  let produceObj = req.body;

  produceObj.creator = req.userData.userId;
  produceObj.status = "DRAFT";

  const produce = new Produce(produceObj);

  produce
    .save()
    .then((result) => {
      res.status(201).json({
        message: "Produce added successfully",
        produce: { ...result, id: result._id },
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Creating a produce failed! " + error,
      });
    });
});

router.put("/:id", checkAuth, async (req, res, next) => {
  const alloweds = process.env.PRODUCERS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to Update Produce");
    return res.status(500).json({ message: "Not allowed to Update Produce" });
  }
  const id = req.params.id;
  let produceObj = req.body;
  let status = produceObj.status;
  let updater = req.userData.userId;

  let mailStat;

  produceObj._id = id;
  produceObj.updater = updater;
  const produce = new Produce(produceObj);

  Produce.updateOne({ _id: req.params.id }, produce)
    .then((result) => {
      if (result.n > 0) {
        res
          .status(200)
          .json({ message: "Update successful!", produce: result });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update produce! " + error,
      });
    });
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }

  deleteProduce();

  function deleteProduce() {
    Produce.deleteOne({ _id: req.params.id })
      .then((result) => {
        if (result.n > 0) {
          res.status(200).json({ message: "Deletion successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        console.error(error, "catch err");
        res.status(500).json({
          message: "Deleting produce failed! " + error,
        });
      });
  }
});

router.get("", async (req, res, next) => {
  try {
    const pageSize = +req.query.pagesize;
    const currentPage = +req.query.page;
    const imprest = req.query.imprest;
    // const userEmail = req.userData.email;
    // const user = await User.find({ email: userEmail });
    const directors = process.env.DIRECTORS;
    const generalManagers = process.env.GENERALMANAGERS;
    const managers = process.env.MANAGERS;
    const sites = [
      "KPANSIA",
      "SWALI",
      "OKUTUKUTU",
      "OKUTUKUTU-BLOCKS",
      "AGADAGBA-BLOCKS",
      "YENEGWE",
      "OBUNNA",
      "KPANSIA E",
    ];

    const blockSites = ["OKUTUKUTU-BLOCKS", "AGADAGBA-BLOCKS"];

    let produceQuery = await Produce.find()
      .lean()
      .populate("operator")
      .populate("manager")
      .populate("site")
      .populate("product")
      .populate("creator")
      .populate("updater")
      .sort({ createdAt: -1 })
      .limit(pageSize);

    produceQuery = produceQuery.map((ppp) => {
      if (ppp.site.name === "OKUTUKUTU-BLOCKS") {
        return { ...ppp, siteName: "OK-Blocks" };
      }
      if (ppp.site.name === "AGADAGBA-BLOCKS") {
        return { ...ppp, siteName: "Agada-Blocks" };
      }
    });

    if (produceQuery) {
      return res.status(200).json({
        produce: produceQuery,
        message: "Produces fetched Successfully",
      });
    } else {
      return res
        .status(500)
        .json({ message: "fetching produces not successful" });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "fetching produces not successful" + err });
  }
});

router.get("/summary", checkAuth, async (req, res, next) => {
  const alloweds = process.env.PRODUCERS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to see produces");
    return res.status(500).json({ message: "Not allowed" });
  }

  try {
    const yesterdayStart = moment()
      .subtract(14, "days")
      .startOf("day")
      .toDate();
    const yesterdayEnd = moment().subtract(0, "days").endOf("day").toDate();
    // start of today
    var start = moment().startOf("day").toDate();

    // end today
    var end = moment(start).endOf("day").toDate();

    const { recSummary } = req.query;
    if (recSummary) {
      let aggData = await Summary.producePipeline(yesterdayStart, yesterdayEnd);

      // bring out the ._id
      aggData = aggData.map((a) => {
        return {
          ...a._id,
          dateProduced: a._id.day + "/" + a._id.month + "/" + a._id.year,
          totalCement: a.totalCement.toLocaleString(),
          totalQty: a.totalQty.toLocaleString(),
          site: a._id.site === "OKUTUKUTU-BLOCKS" ? "OK_BLOCKS" : "AG_BLOCKS",
        };
      });

      const gb = _.groupBy(aggData, "dateProduced");
      // console.log(gb);
      const keys = Object.keys(gb);

      if (gb) {
        return res.status(200).json({ records: gb });
      } else {
        return res.status(500).json({ message: "Error with produce summary" });
      }
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error with produce summary try block" + err });
  }
});

router.get("/getByText", checkAuth, async (req, res, next) => {
  // const alloweds = process.env.ALLOWEDS;
  // if (!alloweds.includes(req.userData.email)) {
  //   logIncident(req.userData.email, "Not allowed to see Receipts");
  //   return res.status(500).json({ message: "Not allowed" });
  // }
  // const { searchTerm } = req.query;
  // // get array
  // let records;
  // const result = await Produce.aggregate([
  //   { $match: { $text: { $search: searchTerm } } },
  // ])
  //   .sort({ createdAt: -1 })
  //   .limit(200);
  // if (result) return res.status(200).json({ produce: result });
  // Produce.find({ $text: { $search: searchTerm } })
  //   .sort({ updatedAt: -1 })
  //   .populate("vendor")
  //   .populate("creator")
  //   .populate("updater")
  //   .limit(200)
  //   .then((record) => {
  //     if (record) {
  //       res.status(200).json({ produce: record });
  //     } else {
  //       res.status(404).json({ message: "record not found!" });
  //     }
  //   })
  //   .catch((error) => {
  //     res.status(500).json({
  //       message: "Fetching record failed!" + error,
  //     });
  //   });
});

router.get("/produce/:id", (req, res, next) => {
  // const expId = req.params.id;
  // Produce.find({ produce_id: expId })
  //   .populate("creator")
  //   .populate("updater")
  //   .populate("manager")
  //   .populate("product")
  //   .populate("site")
  //   .then((produce) => {
  //     if (produce) {
  //       res.status(200).json({ produce });
  //     } else {
  //       const error = new HttpError("produce not found!", 404);
  //       return next(error);
  //     }
  //   })
  //   .catch((error) => {
  //     res.status(500).json({
  //       message: "Fetching produce failed! " + error,
  //     });
  //   });
});

router.get("/:id", async (req, res, next) => {
  try {
    let produce = await Produce.findById(req.params.id)
      .lean()
      .populate("creator")
      .populate("updater")
      .populate("manager")
      .populate("operator")
      .populate("product")
      .populate("site");

    // console.log(produce, "produce");
    if (produce?.site?.name === "OKUTUKUTU-BLOCKS") {
      produce = { ...produce, siteName: "OK-Blocks" };
    }
    if (produce?.site?.name === "AGADAGBA-BLOCKS") {
      produce = { ...produce, siteName: "Agada-Blocks" };
    }
    if (produce) {
      res.status(200).json({ produce: produce });
    } else {
      res.status(404).json({ message: "produce not found!" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Fetching produce failed! " + error,
    });
  }
});

router.put(
  "/notes/:id",
  checkAuth,
  Utils.upload7.any(),
  async function (req, res, next) {
    const alloweds = process.env.PRODUCERS;

    if (!alloweds.includes(req.userData.email)) {
      logIncident(req.userData.email, "Not allowed to create notes");
      return res.status(500).json({ message: "Not allowed" });
    }

    let updater = req.userData.userId;
    let myPath;
    if (req.files) {
      let fileName;
      req.files.forEach((file) => {
        if (file.originalname == "blob") {
          fileName =
            "uploads/produce/" + req.userData.userId + "/" + file.filename;
        } else {
          fileName =
            "uploads/produce/" + req.userData.userId + "/" + file.filename;
        }

        if (hostname.includes("torama.ng")) {
          url = "https://api.torama.ng";
        } else {
          url = req.protocol + "://" + req.get("host");
        }

        myPath = url + "/" + fileName;
      });
    }
    const note = req.body;

    let recId = req.params.id;
    if (myPath) {
      note.image = myPath;
    }

    let produceObj = await Produce.findById(recId);
    let notes = produceObj.notes;
    notes.push(note);
    // console.log(notes);
    log = produceObj.log;
    log.push({
      updater: note.author,
      status: produceObj.status,
      date: new Date(),
      note,
    });
    Produce.findByIdAndUpdate(
      { _id: recId },
      { notes: notes, updater: updater, log: log }
    )
      .then((result) => {
        res.status(201).json({
          message: " note with image updated successfully",
          produce: {
            ...result,
            id: result._id,
          },
        });
      })
      .catch((error) => {
        res.status(500).json({
          message: "Creating an Image upload failed! " + error,
        });
      });
  }
);

module.exports = router;
