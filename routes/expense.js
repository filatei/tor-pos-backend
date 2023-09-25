const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");

const Expense = require("../models/expense");
const Product = require("../models/product");
const Stockitem = require("../models/stockitem");
const Contact = require("../models/contact");
const Inventory = require("../models/inventory");
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
const HttpError = require("../utils/http-error");
const startOfDay = require("date-fns/startOfToday");

function logIncident(email, description) {
  const logObj = new Accesslog({ email: email, description: description });
  logObj
    .save(logObj)
    .then((result) => {
      console.log("access incident logged for user");
    })
    .catch((err) => {
      console.log("access logging error for user ", err);
    });
}

const checkAuth = require("../middleware/check-auth");
// const expense = require("../models/expense");
// const { th } = require("date-fns/locale");

const multerConfig = require('../config/multer-config');
const DIR = "/var/www/uploads/expenses/";
const upload = multerConfig(DIR);

router.post("", checkAuth, function (req, res, next) {

  try {

    const alloweds = [
      "ADMIN",
      "GENERAL MANAGER",
      "MANAGER",
      "SNR ACCOUNTANT",
      "ACCOUNTANT",
      "SECRETARY",
    ];
    if (!alloweds.includes(req.userData.role)) {
      return res.status(500).json({ message: "Not allowed to create Expense" });
    }

    let expenseObj = req.body;

    expenseObj.creator = req.userData.userId;
    expenseObj.status = "DRAFT";

    const expense = new Expense(expenseObj);
    expense.products.forEach((product) => {
      if (!product.name) throw new Error("Product name is required");
    });

    expense
      .save()
      .then((result) => {
        res.status(201).json({
          message: "Expense added successfully",
          expense: { ...result, id: result._id },
        });
      })
      .catch((error) => {
        res.status(500).json({
          message: "Creating a expense failed! " + error,
        });
      });

  } catch (error) {
    res.status(500).json({
      message: "Creating a expense failed! " + error,
    });

  }

});

router.put("/expenseAcct/:id", checkAuth, async (req, res, next) => {
  const alloweds = process.env.STOREALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Expense");
    return res.status(500).json({ message: "Not allowed to create Expense" });
  }

  const { expenseAccount } = req.body;

  const id = req.params.id;
  const updater = req.userData.userId;

  Expense.updateOne(
    { _id: req.params.id },
    { expenseAccount: expenseAccount, updater }
  )
    .then(async (result) => {
      if (result.n > 0) {
        const expense = await Expense.findById(req.params.id).populate(
          "vendor", "name remarks phone email"
        ).populate("creator", "name email role site image")
        res
          .status(200)
          .json({ message: "Update successful!", expense: expense });
      } else {
        res.status(401).json({ message: "Update Not successful!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update expense! " + error,
      });
    });
});

router.put("/:id", checkAuth, async (req, res, next) => {
  const alloweds = [
    "ADMIN",
    "GENERAL MANAGER",
    "MANAGER",
    "SNR ACCOUNTANT",
    "ACCOUNTANT",
  ];
  if (!alloweds.includes(req.userData.role)) {
    logIncident(req.userData.email, "Not allowed to create Expense");
    return res.status(500).json({ message: "Not allowed to update expense" });
  }

  let expenseObj = req.body;
  let status = expenseObj.status;
  let updater = req.userData.userId;
  // update statusHistory
  let statusHist;
  const currExp = await Expense.findById(req.params.id);
  statusHist = {
    oldStatus: currExp.status,
    newStatus: status,
    updater: updater,
    // date: new Date(),
  };

  if (currExp && currExp.statusHistory) {
    expenseObj.statusHistory = [...currExp.statusHistory, statusHist];
  } else {
    expenseObj.statusHistory = [...statusHist];
  }

  async function isOpen() {
    if (
      status === "OPEN" ||
      status === "APPROVED" ||
      status === "PAID" ||
      status === "DECLINED" ||
      status === "VALIDATED" ||
      status === "REVIEWED" ||
      status === "PART-PAY"
    ) {
      //  send mail
      const mailStat = await Mail.sendExpense(expenseObj, updater);
    }
  }

  isOpen()
    .then((sm) => {
      console.log("mailstat sent");
    })
    .catch((err) => {
      console.log(err, "send err");
    });

  const id = req.params.id;
  const oldExpense = await Expense.findById(id);
  expenseObj._id = id;
  expenseObj.updater = req.userData.userId;

  const expense = new Expense(expenseObj);
  if (status !== "PAID") {
    expense.balance = expense.balance || expense.txn_amount;
  }

  if (expense.balance < 0) {
    const message = "balance be not negative ";
    return res.status(500).json({
      message,
    });
  }

  expense.notes = oldExpense.notes;

  Expense.updateOne({ _id: req.params.id }, expense)
    .then(async (result) => {
      if (result.n > 0) {
        const expense = await Expense.findById(req.params.id).populate(
          "vendor").populate("creator", "name email role site image")
        res
          .status(200)
          .json({ message: "Update successful!", expense: expense });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update expense! " + error,
      });
    });
});

router.get("/summary", checkAuth, async (req, res, next) => {
  // summary of expenses for product Rolls per month
  async function agg(productName) {
    // productName can be Rolls
    // Find the vendor
    const vendor = await Contact.findOne({ name: "FLEXPLAST TECH & SERVICES" });
    if (!vendor) {
      console.log("Vendor not found");
      return [];
    }
    const vendorId = mongoose.Types.ObjectId(vendor._id); // Ensure it's an ObjectId

    const startDate = new Date();
    const currMonth = startDate.getMonth() - 12; //past 10 months from now
    startDate.setMonth(currMonth); // Subtract 12 months
    startDate.setDate(1); // Set the day to the first of the month
    startDate.setHours(0, 0, 0, 0); // Set the time to the start of the day
    const result = await Expense.aggregate([
      {
        $match: {
          status: "PAID",
          createdAt: { $gte: startDate },
          "products.name": productName,
          vendor: vendorId,
        },
      },
      {
        $unwind: "$products",
      },
      {
        $match: {
          "products.name": "Rolls",
        },
      },
      {
        $addFields: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
      },
      {
        $group: {
          _id: { Year: "$year", Month: "$month" },
          TotalQuantity: { $sum: "$products.qty" },
          TotalAmount: { $sum: "$txn_amount" },
        },
      },
      {
        $project: {
          _id: 0,
          Year: "$_id.Year",
          Month: "$_id.Month",
          TotalQuantity: 1,
          TotalAmount: 1,
        },
      },
      {
        $sort: {
          Year: 1,
          Month: 1,
        },
      },
    ]);

    return result;
  }

  try {
    let user, userEmail;
    let role = "";

    if (req.userData) {
      userEmail = req.userData.email;
      role = req.userData.role;
      user = await User.find({ email: userEmail });
    }
    let response = [];
    response = await agg("Rolls");

    return res.status(200).json({
      response: response,
      message: "Expense Summarized  Successfully",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "fetching Summary not successful" + err });
  }
});

router.get("/summaryAll", checkAuth, async (req, res, next) => {
  // summary of expenses group by product and vendor  per month

  try {
    let role = "";

    if (req.userData) {
      role = req.userData.role;
      if (role !== "ADMIN") {
        return;
      }
    }

    let response = [];
    response = await agg();

    return res.status(200).json({
      response: response,
      message: "Expense Summarized  Successfully",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "fetching Summary not successful" + err });
  }

  async function agg() {
    const startDate = new Date();
    const n = 1;
    const currMonth = startDate.getMonth() - n; //past n months from now
    startDate.setMonth(currMonth); // Subtract 12 months
    startDate.setDate(1); // Set the day to the first of the month
    startDate.setHours(0, 0, 0, 0); // Set the time to the start of the day

    const result = await Expense.aggregate([
      {
        $match: {
          status: "PAID",
          createdAt: { $gte: startDate },
        },
      },
      {
        $unwind: "$products",
      },
      {
        $lookup: {
          from: "contacts", // replace with your actual Vendor collection name
          localField: "vendor",
          foreignField: "_id",
          as: "vendorData",
        },
      },
      {
        $unwind: "$vendorData", // this will normalize the data, making sure vendorData is an object instead of an array
      },
      {
        $addFields: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
      },
      {
        $group: {
          _id: {
            Year: "$year",
            Month: "$month",
            Product: "$products.name",
            Vendor: "$vendorData.name", // assuming 'name' is the field in Vendor collection that you want to group by
          },
          TotalQuantity: { $sum: "$products.qty" },
          TotalAmount: { $sum: "$txn_amount" },
        },
      },
      {
        $project: {
          _id: 0,
          Year: "$_id.Year",
          Month: "$_id.Month",
          Product: "$_id.Product",
          Vendor: "$_id.Vendor",
          TotalQuantity: 1,
          TotalAmount: 1,
        },
      },
      {
        $sort: {
          Year: -1,
          Month: -1,
        },
      },
    ]);

    return result;
  }
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }

  deleteExpense();

  function deleteExpense() {
    Expense.deleteOne({ _id: req.params.id })
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
          message: "Deleting expense failed! " + error,
        });
      });
  }
});

router.get("", checkAuth, async (req, res, next) => {
  try {
    let pageSize = +req.query.pagesize;
    const currentPage = +req.query.page;
    const imprest = req.query.imprest;
    let user, userEmail;
    let role = "";

    if (req.userData) {
      userEmail = req.userData.email;
      role = req.userData.role;
      user = await User.find({ email: userEmail });
    }
    // get start of today


    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const directors = process.env.DIRECTORS;
    const generalManagers = process.env.GENERALMANAGERS;
    const managers = process.env.MANAGERS;
    const sites = [
      "KPANSIA",
      "SWALI",
      "OKUTUKUTU",
      "YENEGWE",
      "OBUNNA",
      "KPANSIA E",
      "AKENFA",
    ];

    const blockSites = ["OKUTUKUTU-BLOCKS", "AGADAGBA-BLOCKS"];
    let expenseQuery;

    if (imprest) {
      console.log(start, end, 'today')
      expenseQuery = await Expense.find({
        status: "APPROVED",
        expenseAccount: "Daily Imprest",
        createdAt: {
          $gte: start,
          $lte: end,
        },

      }, { log: 0, statusHistory: 0 })
        .sort({ createdAt: -1 })
        .populate("vendor", "name remarks phone email")
        .populate("creator", "name email role site image")
        .limit(pageSize);
    } else if (role === "ADMIN") {
      expenseQuery = await Expense.find({}, { log: 0, statusHistory: 0 })
        .sort({ createdAt: -1 })
        .populate("vendor", "name remarks phone email")
        .populate("creator", "name email role site image")
        .populate("products")
        .limit(pageSize);
    } else if (["GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
      expenseQuery = await Expense.find({
        site: { $in: sites }
      }, { log: 0, statusHistory: 0 })
        .sort({ createdAt: -1 })
        .populate("vendor", "name remarks phone email")
        .populate("creator", "name email role site image")
        .limit(pageSize);
    } else if (role === "MANAGER") {
      expenseQuery = await Expense.find({
        // if i own it, good. or if site is my site, good.
        $or: [{ creator: user[0]._id }, { site: req.userData.site }],

      }, { log: 0, statusHistory: 0 })
        .sort({ createdAt: -1 })
        .populate("vendor", "name remarks phone email")
        .populate("creator", "name email role site image")

        .limit(pageSize);
    } else {
      expenseQuery = await Expense.find({ creator: user[0]._id },
        { log: 0, statusHistory: 0 })
        .sort({ createdAt: -1 })
        .populate("vendor", "name remarks phone email")
        .populate("creator", "name email role site image")

        .limit(pageSize);
    }
    // expenseQuery.forEach(async (e) => {
    //   if (e.vendor.name === "SWALI") {
    //     e.products.forEach(async pp => {
    //       const prod = await Stockitem.findById(pp._id);
    //     })

    //   }
    // });

    if (expenseQuery) {
      return res.status(200).json({
        expense: expenseQuery,
        message: "Expenses fetched Successfully",
      });
    } else {
      return res
        .status(500)
        .json({ message: "fetching expenses not successful" });
    }
  } catch (err) {
    console.log(err, 'error')
    return res
      .status(500)
      .json({ message: "fetching expenses not successful" + err });
  }
});

router.get("/mail/mailImprest", checkAuth, async (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to see Receipts");
    return res.status(500).json({ message: "Not allowed" });
  }
  const userName = req.userData.name;
  const userEmail = req.userData.email;

  const { searchTerm } = req.query;
  // get array
  let records;
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const result = await Expense.find({
    createdAt: { $gte: startOfToday },
    expenseAccount: "Daily Imprest",
  }).sort({ createdAt: -1 });
  // mail result
  await Mail.sendImprest(result, { name: userName, email: userEmail });
  if (result) {
    return res.status(200).json({ expense: result });
  } else {
    return res.status(500).json({ message: "Error Retrieving result" });
  }
});

router.get("/getByText", checkAuth, async (req, res, next) => {
  const alloweds = ['ADMIN', 'GENERAL MANAGER', 'MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT', 'SECRETARY']

  if (!alloweds.includes(req.userData.role)) {
    return res.status(500).json({ message: "Not allowed" });
  }
  const limit = parseInt(req.query.limit) || 15; // number of records per page
  const offset = parseInt(req.query.offset) || 0; // offset


  try {
    const { searchTerm } = req.query;
    let payHist = []
    // if (req.userData.role === 'ADMIN') {
    //    payHist = await payHistory(searchTerm)
    // }
    const totalCount = await countExpenses(searchTerm); // Step 1: Count total records
    const results = await searchExpenses(searchTerm, limit, offset); // Step 2: Fetch paged data

    return res.status(200).json({ results, totalCount, payHist }); // Step 3: Return both

  } catch (error) {
    console.error("An error occurred:", error);
    return res.status(500).json({ message: "Error Retrieving Search result" });
  }

});

const countExpenses = async (searchTerm) => {
  // Same query logic as in searchExpenses, but we just count the records
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const contacts = await Contact.find({
    "name": { "$regex": searchTerm, "$options": "i" }
  }).exec();
  const vendorIds = contacts.map(contact => contact._id);

  return await Expense.countDocuments({
    "$or": [
      { "products": { "$elemMatch": { "name": { "$regex": searchTerm, "$options": "i" } } } },
      { "vendor": { "$in": vendorIds } }
    ],
    "createdAt": { "$gte": oneYearAgo }
  });
};

const searchExpenses = async (searchTerm, limit, offset) => {
  try {
    // Calculate date one year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Search for vendor IDs whose name matches the vendorSearchTerm
    const contacts = await Contact.find({
      "name": { "$regex": searchTerm, "$options": "i" }
    }).exec();
    const vendorIds = contacts.map(contact => contact._id);

    // Search for expenses that match either the product name or vendor ID, and are less than a year old
    const expenses = await Expense.find({
      "$or": [
        { "products": { "$elemMatch": { "name": { "$regex": searchTerm, "$options": "i" } } } },
        { "vendor": { "$in": vendorIds } }
      ],
      "createdAt": { "$gte": oneYearAgo }
    }).sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('vendor', 'name remarks phone email')
      .populate('creator', 'name email role site image')
      .exec();
    return expenses;

  } catch (error) {
    console.error("An error occurred:", error);
  }
};

async function payHistory(vendor) {
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 1);

  const aggregatePipeline = [
    {
      $lookup: {
        from: 'contacts', // Assuming 'contacts' is the name of the collection where vendor data is stored
        localField: 'vendor',
        foreignField: '_id',
        as: 'vendorData'
      }
    },
    {
      $unwind: '$vendorData' // Flatten the array 
    },
    {
      $match: {
        'vendorData.name': {
          $regex: vendor,
          $options: 'i'
        },
        'createdAt': { '$gte': twoMonthsAgo }
      }
    },
    {
      $unwind: '$payHistory'
    },
    {
      $match: {
        'payHistory.date': { '$gte': twoMonthsAgo }
      }
    },
    {
      $project: {
        payDate: '$payHistory.date',
        paidAmount: '$payHistory.paidAmount',
        memo: '$payHistory.memo',
      }
    },
    // sort by payDate
    {
      $sort: {
        payDate: -1
      }
    }
  ];

  try {
    const results = await Expense.aggregate(aggregatePipeline)
    return results

  } catch (error) {
    console.error("An error occurred:", error);
    return []

  }

}

router.get("/expense/:id", (req, res, next) => {
  // this is used for expense_id, not _id
  const expId = req.params.id;
  Expense.find({ expense_id: expId })
    .populate("creator")
    .then((expense) => {
      if (expense) {
        res.status(200).json({ expense });
      } else {
        const error = new HttpError("expense not found!", 404);
        return next(error);
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching expense failed! " + error,
      });
    });

});

router.get("/:id", (req, res, next) => {
  console.log(req.params.id, "id")
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log('Invalid ObjectId');
    // Handle error as needed
    return res.status(404).json({ message: "invalid object id " });
  }
  Expense.findById(id)
    .populate("vendor")
    .populate("creator", "name email role site image")
    .then((expense) => {
      if (expense) {
        res.status(200).json({ expense });
      } else {
        res.status(404).json({ message: "expense not found!" });
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({
        message: "Fetching expense failed! " + error,
      });
    });
});

router.put(
  "/notes/:id",
  checkAuth,
  upload.any(),
  async function (req, res, next) {
    const alloweds = process.env.ALLOWEDS;

    if (!alloweds.includes(req.userData.email)) {
      return res.status(500).json({ message: "Not allowed" });
    }

    let updater = req.userData.userId;
    let myPath;
    if (req.files) {
      req.files.forEach((file) => {
        if (hostname.includes("torama.ng")) {
          url = "https://fido-api.torama.ng";
        } else {
          url = req.protocol + "://" + req.get("host");
        }

        myPath =
          url +
          "/expenseUploads" +
          file.path.split("/var/www/uploads/expenses")[1];
      });
    }

    const note = req.body;
    let recId = req.params.id;
    await saveExpense();

    async function saveExpense() {
      try {
        if (myPath) {
          note.image = myPath;
        }

        let expObj = await Expense.findById(recId);
        // send mail with Note image

        let notes;
        if (expObj) {
          notes = expObj.notes;

          notes.push(note);
          log = expObj.log;

          log.push({
            updater: note.author,
            status: expObj.status,
            date: new Date(),
            note,
          });
        } else {
          return res.status(500).json({
            message: "No expense Object to update! ",
          });
        }

        Expense.findByIdAndUpdate(
          { _id: recId },
          { notes: notes, updater: updater, log: log }
        )
          .then(async (result) => {
            let msent = await Mail.sendNote(note, expObj);
            const expense = await Expense.findById(recId).populate("vendor").populate("creator", "name email role site image")
            return res.status(201).json({
              message: " note with image updated successfully",
              expense: {
                ...expense,
                id: expense._id,
              },
            });
          })
          .catch((error) => {
            return res.status(500).json({
              message: "Creating an Image upload failed! " + error,
            });
          });
      } catch (err) {
        return res.status(500).json({
          message: "Error with update  " + err,
        });
      }
    }
  }
);

router.post("/mail", checkAuth, function (req, res, next) {
  let expenseObj = req.body;
  expenseObj.creator = req.userData.userId;
});

module.exports = router;
