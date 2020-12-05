require("dotenv").config();
const express = require("express");
// const mongoose = require("mongoose");
// const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
// const homedir = os.homedir();
const { validationResult, check } = require("express-validator");
const Award = require("../models/award");
const router = express.Router();
const HttpError = require("../models/http-error");
const checkAuth = require("../middleware/check-auth");
const fileUpload = require("../middleware/file-upload");
const Recupload = require("../models/recupload");
const Utils = require("../utils");
const { getHeapSnapshot } = require("v8");
const { getDefaultSettings } = require("http2");

router.get("", async (req, res, next) => {
  let awards;
  try {
    awards = await Award.find().sort({ rank: 1 });
  } catch (err) {
    return res.status(500).json({
      message: "Fetching awards failed, please try again later." + err,
    });
  }
  res.json({ awards: awards });
});

router.get("/top20ForMonth", async (req, res, next) => {
  try {
    const { site, month, year, product } = req.query;
    let monthInt = parseInt(month);
    let yearInt = parseInt(year);

    // console.log("query params", site.trim(), month, year, product);
    Recupload.aggregate([
      { $unwind: "$products" },
      { $unwind: "$products.name" },
      { $unwind: "$products.qty" },
      { $unwind: "$products.price" },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },

      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
            customer: "$customer.name",
            site: "$terminal_location",
            product: "$products.name",
          },

          totalSalesAmount: {
            $sum: {
              $multiply: [
                { $toInt: "$products.price" },
                { $toInt: "$products.qty" },
              ],
            },
          },
          totalQty: { $sum: "$products.qty" },
        },
      },
      {
        $match: {
          $and: [
            {
              "_id.site": site,
              "_id.month": monthInt,
              "_id.year": yearInt,
              "_id.product": product,
            },
          ],
        },
      },

      { $sort: { "_id.year": 1, "_id.month": -1, totalQty: -1 } },
      { $limit: 10 },
    ]).exec((err, result) => {
      if (err) {
        console.log("error ", err);
        return res.status(500).json({ message: "aggregate error: " + err });
      }
      if (result) {
        // console.log("result ", result);
        return res.status(200).json({
          message: "top 10 sales for month",
          records: result,
        });
      }
    });
  } catch (err) {
    return res.status(500).json({
      message: "Fetching records failed, please try again later." + err,
    });
  }
});

router.get("/:id", async (req, res, next) => {
  if (!req.params.id) {
    return;
  }
  const awardId = req.params.id;
  console.log(awardId, req.params);
  let award;
  try {
    award = await Award.findById(awardId);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Something went wrong, could not find a award." + err });
    // const error = new HttpError(
    //   "Something went wrong, could not find a award.",
    //   500
    // );
    // return next(error);
  }

  if (!award) {
    return res
      .status(400)
      .json({ message: "could not find a award for id." + awardId });

    // const error = new HttpError(
    //   "Could not find award for the provided id.",
    //   404
    // );
    // return next(error);
  }

  res.json({ award: award.toObject({ getters: true }) });
});

router.post(
  "",
  checkAuth,
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("qty").not().isEmpty(),
    check("year").not().isEmpty(),
    check("location").not().isEmpty(),
    check("rank").not().isEmpty(),
  ],
  async (req, res, next) => {
    const alloweds = process.env.DIRECTORS;

    if (!alloweds.includes(req.userData.email)) {
      Utils.logIncident(req.userData.email, "Not allowed to create Award");
      return res.status(500).json({ message: "Not allowed" });
    }
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({
        message:
          "Invalid inputs passed, please check your data." +
          JSON.stringify(errors),
      });
    }
    let filePath;
    let fileName;
    if (req.file) {
      fileName = req.file.path;

      if (hostname.includes("torama.ng")) {
        url = "https://api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }
      filePath = url + "/" + fileName;
    }

    const {
      name,
      location,
      rank,
      year,
      prize,
      description,
      qty,
      category,
      remarks,
    } = req.body;

    if (!rank || !name || !qty || !location || !year) {
      // const error = new HttpError("Creating Award failed, blank Data.", 500);
      return res
        .status(500)
        .json({ message: "Creating Award failed, blank Data" });
    }

    const createdAward = new Award({
      name,
      rank: parseInt(rank.trim()),
      location,
      remarks,
      year,
      prize,
      description,
      qty: parseInt(qty.trim()),
      category,
      image: filePath,
      creator: req.userData.userId,
    });

    try {
      await createdAward.save();
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Creating Award failed, please try again" + err });
    }
    res
      .status(201)
      .json({ award: createdAward, message: "Award Added Successfully" });
  }
);

router.put(
  "/:id",
  checkAuth,
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("qty").not().isEmpty(),
    check("year").not().isEmpty(),
    check("location").not().isEmpty(),
    check("rank").not().isEmpty(),
  ],
  async (req, res, next) => {
    const alloweds = process.env.DIRECTORS;

    if (!alloweds.includes(req.userData.email)) {
      Utils.logIncident(req.userData.email, "Not allowed to update Awards");
      return res.status(500).json({ message: "Not allowed" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        message:
          "Invalid inputs passed, please check your data." +
          JSON.stringify(errors),
      });
    }
    // console.log("reqbody", req.body);
    let filePath;

    if (req.file) {
      const fileName = req.file.path;

      if (hostname.includes("torama.ng")) {
        url = "https://api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }
      filePath = url + "/" + fileName;
    }

    const newAward = { ...req.body };
    const awardId = req.params.id;
    let award;
    try {
      award = await Award.findById(awardId);
      console.log(award);
    } catch (err) {
      return res.status(500).json({
        message: "Something went wrong, could not find award." + err,
      });
    }

    if (award && award.creator.toString() !== req.userData.userId) {
      const error = new HttpError(
        "You are not allowed to edit this place.",
        401
      );
      return next(error);
    }

    award.name = newAward.name;
    award.rank = newAward.rank;
    award.category = newAward.category;
    award.location = newAward.location;
    award.year = newAward.year;
    award.qty = newAward.qty;
    award.prize = newAward.prize;
    award.remarks = newAward.remarks;
    if (filePath) {
      award.image = filePath;
    }

    console.log(award, "again");

    try {
      const saveRes = await award.save();
      res.status(200).json({
        award: award,
        message: "award updated successfully: " + saveRes,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Could not update award - " + err });
    }
  }
);

router.put(
  "/images/:id",
  checkAuth,
  fileUpload.any(""),
  async (req, res, next) => {
    const alloweds = process.env.DIRECTORS;

    if (!alloweds.includes(req.userData.email)) {
      Utils.logIncident(req.userData.email, "Not allowed to update Awards");
      return res.status(500).json({ message: "Not allowed" });
    }

    const awardId = req.params.id;
    let award;
    try {
      award = await Award.findById(awardId);
      console.log(award);
    } catch (err) {
      return res.status(500).json({
        message: "Something went wrong, could not find award." + err,
      });
    }

    let filePath;
    if (req.files) {
      req.files.forEach((file) => {
        const fileName = file.filename;
        if (hostname.includes("torama.ng")) {
          url = "https://api.torama.ng";
        } else {
          url = req.protocol + "://" + req.get("host");
        }
        filePath = url + "/uploads/awards/" + fileName;

        if (award && award.images && typeof award.images === "object") {
          award.images.push({
            imageId: new Date().getTime(),
            imagePath: filePath,
            description: req.body.description,
          });
        } else {
          award.images = [];
          award.images.push({
            imageId: new Date().getTime(),
            imagePath: filePath,
            description: req.body.description,
          });
        }
      });
    }

    try {
      const saveRes = await award.save();
      res.status(200).json({
        award: award,
        message: "award updated successfully: " + saveRes,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Could not update award - " + err });
    }
  }
);

router.delete("/:id", async (req, res, next) => {
  const alloweds = ["filatei@torama.ng"];
  if (!alloweds.includes(req.userData.email)) {
    return res.status(500).json({ message: "Not allowed" });
  }

  Award.deleteOne({ _id: req.params.id })
    .then((result) => {
      if (result.n > 0) {
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Deleting award failed! " + error,
      });
    });
});

module.exports = router;
