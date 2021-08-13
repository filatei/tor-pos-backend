require("dotenv").config();
const express = require("express");
const Recupload = require("../models/recupload");
const Customer = require("../models/customer");
const router = express.Router();
const moment = require("moment");

const fs = require("fs");
const mime = require("mime");
const Accesslog = require("../models/accesslog");

var sanitize = require("mongo-sanitize");

const env = process.env.NODE_ENV || "development";

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

router.get("", (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;

  let coyQuery = Recupload.find()
    .sort({ updatedAt: -1 })
    .populate("customer")
    .populate("creator")
    .populate("updater");

  const today = moment().startOf("day");

  // condition for today results
  let cond1 = {
    createdAt: {
      $gte: today.toDate(),
      $lte: moment(today).endOf("day").toDate(),
    },
  };
  /**
   * Given date, we want to return an object
   * SummaryObj:
   * {site:
   * { name: '', date:''
   *   products:[
   * {
   *   name: '', totalQty: '', totalAmt: '', totaldeclineqty:'', totaldeclineamt:''
   * }
   * ],
   * paytypes: { POS: '', TELLER: ''...POSDELINES:'', TOramadelcines:'', paystackdeclines: ''
   * },
   * sales: { total sales: '', totaldeclines: '', gross: ''}
   *
   * }
   * }
   */
  Recupload.aggregate([
    { $unwind: "$products" },
    { $match: { action_taken: "PRODUCT RELEASED" } },
    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
          year: { $year: "$createdAt" },
          site: "$terminal_location",
          // action_taken: "$action_taken",
          product: "$products.name",
        },
        totalqty: { $sum: { $toInt: "$products.qty" } },
        totalamt: {
          $sum: {
            $multiply: [
              { $toInt: "$products.qty" },
              { $toInt: "$products.price" },
            ],
          },
        },
      },
    },

    { $sort: { "_id.site": 1, "_id.product": -1 } },
    {
      $group: {
        _id: {
          month: "$_id.month",
          day: "$_id.day",
          year: "$_id.year",
          site: "$_id.site",
        },
        products: {
          $push: {
            name: "$_id.product",
            totalqty: "$totalqty",
            totalamt: "$totalamt",

            // action:"$_id.action_taken"
          },
        },
      },
    },
    {
      $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1, "_id.site": 1 },
    },
  ]).then((result) => {
    // console.log(result)
    res.status(200).json({
      message: "Summaries",
      records: result,
    });
  });

  /**
   * compute sum of all txn_amounts per site given
   * @param {*} site
   * @param {*} receipts
   */
  function computeTotal(site, receipts, action) {
    let sum = 0;
    const rc = receipts.filter(
      (r) =>
        r.terminal_location == site &&
        new Date(r.createdAt).toDateString() === new Date().toDateString() &&
        r.action_taken === action
    );
    rc.forEach((rrr) => {
      sum += rrr.txn_amount;
    });
    return sum;
  }

  let fetchedRecords;
  if (pageSize && currentPage) {
    coyQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  coyQuery
    .then((documents) => {
      // console.log(documents.count)
      fetchedRecords = documents;
      // compute summaries

      const kptotToday = computeTotal(
        "KPANSIA",
        fetchedRecords,
        "PRODUCT RELEASED"
      );
      const obtotToday = computeTotal(
        "OBUNNA",
        fetchedRecords,
        "PRODUCT RELEASED"
      );
      const swtotToday = computeTotal(
        "SWALI",
        fetchedRecords,
        "PRODUCT RELEASED"
      );
      const oktotToday = computeTotal(
        "OKUTUKUTU",
        fetchedRecords,
        "PRODUCT RELEASED"
      );
      const ygtotToday = computeTotal(
        "YENEGWE",
        fetchedRecords,
        "PRODUCT RELEASED"
      );
      const kptotDecToday = computeTotal(
        "KPANSIA",
        fetchedRecords,
        "PRODUCT NOT RELEASED"
      );
      const obtotDecToday = computeTotal(
        "OBUNNA",
        fetchedRecords,
        "PRODUCT NOT RELEASED"
      );
      const swtotDecToday = computeTotal(
        "SWALI",
        fetchedRecords,
        "PRODUCT NOT RELEASED"
      );
      const oktotDecToday = computeTotal(
        "OKUTUKUTU",
        fetchedRecords,
        "PRODUCT NOT RELEASED"
      );
      const ygtotDecToday = computeTotal(
        "YENEGWE",
        fetchedRecords,
        "PRODUCT NOT RELEASED"
      );

      let result = {
        kpansia: kptotToday,
        kpansiadec: kptotDecToday,

        swali: swtotToday,
        swalidec: swtotDecToday,

        okutukutu: oktotToday,
        okutukutudec: oktotDecToday,
        yenegwe: ygtotToday,
        yenegwedec: ygtotDecToday,
        obunna: obtotToday,
        obunnadec: obtotDecToday,
      };
      // console.log(result, 'result')
      // res.status(200).json({
      //   message: "Summaries",
      //   records: result
      // });

      // return Recupload.countDocuments();
    })
    .catch((error) => {
      //   res.status(500).json({
      //     message: "Fetching records failed!" + error
      //   });
    });
});

router.get("/misc", (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const site = req.query.site;
  const idate = req.query.idate;
  const today = moment().startOf("day");
  let coyQuery;

  // condition for today results
  let cond1 = {
    createdAt: {
      $gte: today.toDate(),
      $lte: moment(today).endOf("day").toDate(),
    },
  };
  // if (idate) {
  //   coyQuery = Recupload.find(cond1).sort({createdAt:-1}).
  //   populate('customer').populate('creator').populate('updater')

  // } else {

  // }

  coyQuery = Recupload.find()
    .sort({ createdAt: -1 })
    .populate("customer")
    .populate("creator")
    .populate("updater");

  let fetchedRecords;
  if (pageSize && currentPage) {
    coyQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  coyQuery
    .then((documents) => {
      //  console.log(documents.count)
      fetchedRecords = documents;
      return Recupload.countDocuments();
    })
    .then((count) => {
      res.status(200).json({
        message: "records fetched successfully!",
        records: fetchedRecords,
        maxCount: count,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching companies failed!",
      });
    });
});
router.get("/getByText", (req, res, next) => {
  let stan = req.query.stan;
  // get array
  let records;
  Recupload.find()
    .populate("customer")
    .then((rec) => {
      records = rec.filter((r) =>
        r.customer.name.toLowerCase().includes(stan.toLowerCase())
      );
      Recupload.find({ $text: { $search: stan } })
        .then((record) => {
          if (record) {
            res.status(200).json([...record, ...records]);
          } else {
            res.status(404).json({ message: "record not found!" });
          }
        })
        .catch((error) => {
          res.status(500).json({
            message: "Fetching record failed!" + error,
          });
        });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching record failed!" + error,
      });
    });
});
router.get("/:id", (req, res, next) => {
  Recupload.findById(req.params.id)
    .populate("customer")
    .populate("creator")
    .populate("updater")
    .then((record) => {
      if (record) {
        res.status(200).json(record);
      } else {
        res.status(404).json({ message: "record not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching record failed!" + error,
      });
    });
});

module.exports = router;
