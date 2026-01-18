const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");
const Site = require("../models/site");

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
const puppeteer = require('puppeteer');


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
const clerkMiddleware = require("../middleware/clerk-check");
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
      "SECRETARY", "OPERATOR"
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

// New route with image upload support
router.post("/create", clerkMiddleware, upload.any(), async function (req, res) {
  console.log(req.body, 'req.body exp crea')
  try {
    const alloweds = [
      "ADMIN",
      "GENERAL MANAGER",
      "MANAGER",
      "SNR ACCOUNTANT",
      "ACCOUNTANT",
      "SECRETARY",
      "OPERATOR"
    ];

    if (!alloweds.includes(req.userData.role)) {
      return res.status(403).json({ message: "Not allowed to create Expense" });
    }

    let expenseObj = req.body;
    expenseObj.creator = req.userData.userId;
    expenseObj.status = "DRAFT";

    // Handle products array from JSON string
    if (typeof expenseObj.products === 'string') {
      expenseObj.products = JSON.parse(expenseObj.products);
    }

    // Add image paths to expense object
    console.log(req.files, 'req.files')
    if (req.files && req.files.length > 0) {
      const url = req.hostname.includes("torama.ng") ? "https://fido-api.torama.ng" : req.protocol + "://" + req.get("host");

      expenseObj.images = req.files.map(file => `${url}/expenseUploads/${file.filename}`);
      console.log(expenseObj.images, 'expenseObj.images')
    }

    const expense = new Expense(expenseObj);

    // Validate products
    expense.products.forEach((product) => {
      if (!product.name) throw new Error("Product name is required");
    });

    const result = await expense.save();
    console.log(result, 'saved')
    console.log(result.toObject(), 'savec.toObject()')
    res.status(201).json({
      message: "Expense added successfully",
      expense: { ...result.toObject(), id: result._id },
    });

  } catch (error) {
    // If there's an error, delete uploaded files
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    res.status(500).json({
      message: "Creating an expense failed! " + error.message,
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
    "SECRETARY",
    "OPERATOR",
  ];
  if (!alloweds.includes(req.userData.role)) {
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
      // const mailStat = await Mail.sendExpense(expenseObj, updater);
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

router.put(
  "/update-expense/:id",
  clerkMiddleware,
  upload.any(), // Support file uploads
  async (req, res) => {
    const alloweds = [
      "ADMIN",
      "GENERAL MANAGER",
      "MANAGER",
      "SNR ACCOUNTANT",
      "ACCOUNTANT",
      "SECRETARY",
      "OPERATOR",
    ];

    if (!alloweds.includes(req.userData.role)) {
      return res.status(403).json({ message: "Not allowed to update expense" });
    }

    console.log(req.userData, 'req.userData')
    console.log(req.body, 'req.body')
    const updater = req.userData.userId;
    const recId = req.params.id;
    const currExp = await Expense.findById(recId);
    if (!currExp) return res.status(404).json({ message: "Expense not found" });

    const {
      action,
      status,
      paidAmount,
      paymentDate,
      memo,
      bankAcct,
      noteText
    } = req.body;

    const url =
      req.hostname.includes("torama.ng")
        ? "https://fido-api.torama.ng"
        : req.protocol + "://" + req.get("host");

    let imagePath;
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      imagePath = `${url}/expenseUploads/${file.filename}`;
    }

    let updateQuery = { updater };
    let pushUpdates = {};
    let setUpdates = {};
    let log = currExp.log || [];

    if (action === "status" && status) {
      setUpdates = {
        status,
        statusHistory: [
          ...(currExp.statusHistory || []),
          {
            oldStatus: currExp.status,
            newStatus: status,
            updater,
          },
        ],
      };
      log.push({ updater, status, date: new Date(), products: currExp.products });
    }

    if (action === "payment") {
      const balance = currExp.balance ?? currExp.txn_amount;
      const amount = Number(paidAmount);
      const newBalance = balance - amount;

      if (newBalance < 0) {
        return res.status(400).json({ message: "Payment exceeds remaining balance" });
      }

      const paymentEntry = {
        paidAmount: amount,
        paymentDate: paymentDate || new Date(),
        memo,
        bankAcct,
        payer: req.userData.name,
        ...(imagePath && { image: imagePath }),
      };
      console.log(paymentEntry, 'paymentEntry')

      setUpdates = {
        balance: newBalance,
        status:
          newBalance === 0
            ? "PAID"
            : currExp.status === "APPROVED"
              ? "PART-PAY"
              : currExp.status,
      };

      pushUpdates = {
        payHistory: paymentEntry,
      };

      log.push({ updater, date: new Date(), paymentEntry });
    }

    if (action === "note") {

      // delete from currExp.notes array the note with no author or text or date
      currExp.notes = currExp.notes.filter(note => note.author && note.text && note.date);

      const note = {
        text: noteText,
        author: req.userData.name,
        date: new Date(),
        ...(imagePath && { image: imagePath }),
      };
      console.log(note, 'note')
      currExp.notes.push(note);
      log.push({ updater, date: new Date(), status: currExp.status, note });
      // save the expense
      const savedExpense = await Expense.findByIdAndUpdate(recId, {
        notes: currExp.notes,
        updater,
        log,
      });
      // console.log(savedExpense,'savedExpense')
      const updated = await Expense.findById(recId)
        .populate("vendor")
        .populate("creator", "name email role site image");
      // console.log(updated,'updated')

      return res.status(200).json({
        message: "Update successful",
        expense: {
          ...updated.toObject(),
          id: updated._id,
          txn_amount: updated.txn_amount,
          balance: updated.balance,
        },
      });



    }

    if (action === "edit") {
      let { title, category, site, vendor, products } = req.body;

      // Parse products if stringified
      if (typeof products === 'string') {
        try {
          products = JSON.parse(products);
        } catch (err) {
          return res.status(400).json({ message: "Invalid products data" });
        }
      }

      const txn_amount = Array.isArray(products)
        ? products.reduce((sum, p) => sum + (p.qty * p.price), 0)
        : currExp.txn_amount;

      const updatedFields = {
        title,
        category,
        site,
        vendor,
        products,
        txn_amount,
        balance: txn_amount,
        updater,
      };

      log.push({ updater, action: "edit", date: new Date(), changes: updatedFields });

      await Expense.findByIdAndUpdate(recId, {
        $set: { ...updatedFields, log },
      });

      const updated = await Expense.findById(recId)
        .populate("vendor")
        .populate("creator", "name email role site image");

      return res.status(200).json({
        message: "Edit successful",
        expense: {
          ...updated.toObject(),
          id: updated._id,
          txn_amount: updated.txn_amount,
          balance: updated.balance,
        },
      });
    }

    // Final update object
    try {
      await Expense.findByIdAndUpdate(recId, {
        $set: { ...setUpdates, updater, log },
        ...(Object.keys(pushUpdates).length > 0 && { $push: pushUpdates }),
      });

      const updated = await Expense.findById(recId)
        .populate("vendor")
        .populate("creator", "name email role site image");

      return res.status(200).json({
        message: "Update successful",
        expense: {
          ...updated.toObject(),
          id: updated._id,
          txn_amount: updated.txn_amount,
          balance: updated.balance,
        },
      });
    } catch (err) {
      console.error("Update error:", err);
      return res.status(500).json({ message: "Error updating expense", error: err });
    }
  }
);

router.get("/summary", checkAuth, async (req, res, next) => {
  // summary of expenses for product Rolls per month
  async function agg(productName) {
    // productName can be Rolls
    // Find the vendor
    const vendor = await Contact.findOne({ name: "FLEXPLAST TECH & SERVICES" });
    if (!vendor) {
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

router.get("/payHistSummary", checkAuth, async (req, res, next) => {
  // summary of expenses for product Rolls per month

  try {
    let user, userEmail;
    let role = "";

    if (req.userData) {
      userEmail = req.userData.email;
      role = req.userData.role;
      user = await User.find({ email: userEmail });
    }
    let response = [];

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 50); // Set to 50 days

    response = await getPayHistoryForVendorInRange('FLEXPLAST TECH & SERVICES', startDate, endDate)

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


router.delete("/:id", checkAuth, async (req, res) => {
  const delAlloweds = ['ADMIN', 'GENERAL MANAGER', 'MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT'];
  if (!delAlloweds.includes(req.userData.role)) {
    return res.status(403).json({ message: "Not allowed" });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid expense ID" });
  }

  try {
    const result = await Expense.deleteOne({ _id: req.params.id });
    if (result.deletedCount > 0) {
      return res.status(200).json({ message: "Deletion successful!" });
    } else {
      return res.status(404).json({ message: "Expense not found or not authorized!" });
    }
  } catch (error) {
    console.error("Deleting expense failed:", error);
    return res.status(500).json({
      message: "Deleting expense failed!",
      error: error.message,
    });
  }
});

router.delete("/delete/:id", clerkMiddleware, async (req, res) => {
  const allowedRoles = ['ADMIN', 'GENERAL MANAGER', 'MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT'];
  const user = req.userData;

  if (!user || !allowedRoles.includes(user.role)) {
    return res.status(403).json({ message: "Access denied. You do not have permission to delete expenses." });
  }

  const expenseId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(expenseId)) {
    return res.status(400).json({ message: "Invalid expense ID format." });
  }

  try {
    const expense = await Expense.findById(expenseId);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found." });
    }

    const deleteResult = await Expense.deleteOne({ _id: expenseId });

    if (deleteResult.deletedCount === 1) {
      console.log(`Expense ${expenseId} deleted by user ${user.email}`);
      return res.status(200).json({ message: "Expense deleted successfully." });
    }

    return res.status(500).json({ message: "Deletion failed. No record was removed." });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return res.status(500).json({
      message: "An error occurred while deleting the expense.",
      error: error.message,
    });
  }
});

router.get("", checkAuth, async (req, res) => {
  try {
    const { pagesize, page, imprest } = req.query;
    const pageSize = +pagesize;
    const currentPage = +page;
    const userData = req.userData;

    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);

    const sites = ["KPANSIA", "SWALI", "OKUTUKUTU", "YENEGWE", "OBUNNA", "KPANSIA E", "AKENFA", "MBIAMA"];
    let query = {};

    if (imprest) {
      query = {
        status: "APPROVED",
        expenseAccount: "Daily Imprest",
        updatedAt: { $gte: start, $lte: end },
      };
    } else {
      switch (userData.role) {
        case "ADMIN":
          query = {};
          break;
        case "GENERAL MANAGER":
        case "SNR ACCOUNTANT":
          query = { site: { $in: sites } };
          break;
        case "MANAGER":
          const user = await User.findOne({ email: userData.email });
          query = {
            $or: [
              { creator: user._id },
              { site: userData.site }
            ],
          };
          break;
        default:
          const defaultUser = await User.findOne({ email: userData.email });
          query = { creator: defaultUser._id };
          break;
      }
    }

    const expenses = await Expense.find(query, { log: 0, statusHistory: 0 })
      .sort({ createdAt: -1 })
      .populate("vendor", "name remarks phone email")
      .populate("creator", "name email role site image")
      .populate("products")
      .limit(pageSize);

    const expensesWithDate = expenses.map(e => ({
      ...e._doc,
      dateStr: moment(e.createdAt).format("DD/MM/YYYY"),
    }));

    return res.status(200).json({
      expense: expensesWithDate,
      message: "Expenses fetched successfully",
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "fetching expenses not successful", error: err.message });
  }
});

// for React Native Code
// GET /expense/list
router.get('/list', clerkMiddleware, async (req, res) => {
  try {
    // 1. Pagination defaults
    const pageSize = Number(req.query.pagesize) > 0 ? Number(req.query.pagesize) : 10;
    const currentPage = Number(req.query.page) > 0 ? Number(req.query.page) : 1;

    // 2. Normalize userData
    let userData = req.userData;
    if (userData.email) {
      userData = await User.findOne({ email: userData.email })
        .select('site role email _id')
        .lean();
    }

    // 3. Admin override
    if (['filatei@gtsng.com', 'filatei@gmail.com'].includes(userData.email)) {
      await User.updateOne({ email: userData.email }, { role: 'ADMIN' });
      userData.role = 'ADMIN';
    }

    // 4. Base query by role / imprest
    const { imprest, search, status } = req.query;
    let query = {};

    if (imprest) {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      query = {
        status: 'APPROVED',
        expenseAccount: 'Daily Imprest',
        updatedAt: { $gte: start, $lte: end },
      };
    } else {
      const SITES = await Site.find({}).select('name').lean();
      switch (userData.role) {
        case 'ADMIN':
          break;
        case 'GENERAL MANAGER':
        case 'SNR ACCOUNTANT':
          query.site = { $in: SITES };
          break;
        case 'MANAGER':
          query.$or = [
            { creator: userData._id },
            { site: userData.site }
          ];
          break;
        default:
          query.creator = userData._id;
      }
    }

    // 5. Status filter
    if (status && status !== 'ALL') {
      query.status = status;
    }

    // 5b. Site filter (NEW)
    if (req.query.site && req.query.site !== 'ALL') {
      if (query.site) {
        query.site = {
          $in: Array.isArray(query.site?.$in)
            ? query.site.$in.filter(s => s === req.query.site)
            : [req.query.site]
        };
      } else {
        query.site = req.query.site;
      }
    }


    if (req.query.startDate || req.query.endDate) {
      const dateQuery = {};
      if (req.query.startDate) dateQuery.$gte = new Date(req.query.startDate);
      if (req.query.endDate) dateQuery.$lte = new Date(req.query.endDate);
      query.createdAt = dateQuery;
    }

    // 6. Search filter, including vendor.name
    if (typeof search === 'string' && search.trim() !== '') {
      const term = search.trim();
      const regex = new RegExp(term, 'i');

      // 6a. Find vendor IDs whose name matches
      const matchingVendors = await Contact.find({ name: regex }).select('_id').lean();
      const vendorIds = matchingVendors.map(v => v._id);

      // 6b. Build the search clause
      const searchClause = {
        $or: [
          { title: regex },
          { site: regex },
          { 'products.name': regex },
          { expense_id: Number(term) || -1 },
          { vendor: { $in: vendorIds } }   // match by ID
        ]
      };

      query = Object.keys(query).length
        ? { $and: [query, searchClause] }
        : searchClause;
    }

    // 7. Count & fetch paginated expenses
    const totalItems = await Expense.countDocuments(query);
    const expenses = await Expense.find(query, { log: 0, statusHistory: 0 })
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .populate('vendor', 'name')
      .populate('creator', 'name email role site image')
      .populate('products')
      .lean();

    // 8. Map dateStr
    const expensesWithDate = expenses.map(e => ({
      ...e,
      dateStr: moment(e.createdAt).format('DD/MM/YYYY')
    }));

    // 9. Respond
    return res.json({
      message: 'Expenses fetched successfully',
      expenses: expensesWithDate,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
      currentPage,
    });

  } catch (err) {
    console.error('[/expense/list] error:', err);
    return res.status(500).json({
      message: 'Fetching expenses failed',
      error: err.message
    });
  }
});

// Backend route to get totals
router.get('/totals', async (req, res) => {
  try {
    const results = await Expense.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$txn_amount" },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "PENDING"] }, "$txn_amount", 0]
            }
          },
          approved: {
            $sum: {
              $cond: [{ $eq: ["$status", "APPROVED"] }, "$txn_amount", 0]
            }
          },
          paid: {
            $sum: {
              $cond: [{ $eq: ["$status", "PAID"] }, "$txn_amount", 0]
            }
          },
          draft: {
            $sum: {
              $cond: [{ $eq: ["$status", "DRAFT"] }, "$txn_amount", 0]
            }
          },
          validated: {
            $sum: {
              $cond: [{ $eq: ["$status", "VALIDATED"] }, "$txn_amount", 0]
            }
          }
        }
      }
    ]);

    res.status(200).json(results[0] || {
      total: 0,
      pending: 0,
      approved: 0,
      paid: 0,
      draft: 0,
      validated: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/weekly-totals', async (req, res) => {
  try {
    const now = new Date();
    const currentWeekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    currentWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const results = await Expense.aggregate([
      {
        $facet: {
          currentWeek: [
            {
              $match: {
                date: { $gte: currentWeekStart }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$txn_amount" },
                pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, "$txn_amount", 0] } },
                approved: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, "$txn_amount", 0] } },
                paid: { $sum: { $cond: [{ $eq: ["$status", "PAID"] }, "$txn_amount", 0] } },
                weekStart: { $first: currentWeekStart },
                weekEnd: { $first: new Date() }
              }
            }
          ],
          lastWeek: [
            {
              $match: {
                date: {
                  $gte: lastWeekStart,
                  $lt: currentWeekStart
                }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$txn_amount" },
                pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, "$txn_amount", 0] } },
                approved: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, "$txn_amount", 0] } },
                paid: { $sum: { $cond: [{ $eq: ["$status", "PAID"] }, "$txn_amount", 0] } },
                weekStart: { $first: lastWeekStart },
                weekEnd: { $first: currentWeekStart }
              }
            }
          ]
        }
      },
      {
        $project: {
          currentWeek: { $arrayElemAt: ["$currentWeek", 0] },
          lastWeek: { $arrayElemAt: ["$lastWeek", 0] }
        }
      }
    ]);

    res.json(results[0] || {
      currentWeek: {
        total: 0,
        pending: 0,
        approved: 0,
        paid: 0,
        weekStart: currentWeekStart,
        weekEnd: new Date()
      },
      lastWeek: {
        total: 0,
        pending: 0,
        approved: 0,
        paid: 0,
        weekStart: lastWeekStart,
        weekEnd: currentWeekStart
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  // await Mail.sendImprest(result, { name: userName, email: userEmail });
  if (result) {
    return res.status(200).json({ expense: result });
  } else {
    return res.status(500).json({ message: "Error Retrieving result" });
  }
});

router.get("/getByText", checkAuth, async (req, res, next) => {
  const alloweds = ['ADMIN', 'GENERAL MANAGER', 'MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT', 'SECRETARY', 'OPERATOR']

  if (!alloweds.includes(req.userData.role)) {
    return res.status(500).json({ message: "Not allowed" });
  }
  const limit = parseInt(req.query.limit) || 15; // number of records per page
  const offset = parseInt(req.query.offset) || 0; // offset


  try {
    const { searchTerm } = req.query;
    let payHist = []

    const totalCount = await countExpenses(searchTerm); // Step 1: Count total records
    const results = await searchExpenses(searchTerm, limit, offset); // Step 2: Fetch paged data

    return res.status(200).json({ results, totalCount, payHist }); // Step 3: Return both

  } catch (error) {
    console.error("An error occurred:", error);
    return res.status(500).json({ message: "Error Retrieving Search result" });
  }

});

router.get("/siteSummary", checkAuth, async (req, res, next) => {
  const alloweds = ['ADMIN', 'GENERAL MANAGER', 'MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT', 'SECRETARY', 'OPERATOR']

  if (!alloweds.includes(req.userData.role)) {
    return res.status(500).json({ message: "Not allowed" });
  }


  try {
    const totalExpenses = await Expense.aggregate([
      {
        $match: {
          status: { $nin: ["DRAFT", "DECLINED", 'VALIDATED', "REVIEWED"] } // Exclude expenses with status 'DRAFT' or 'DECLINED'
        }
      },

      {
        $group: {
          _id: "$site",
          totalAmount: { $sum: "$txn_amount" }
        }
      },
      // Optional: Sort by site name
      { $sort: { totalAmount: -1 } }
    ]);

    // console.log(totalExpenses, 'totalExpenses')

    return res.status(200).json({ totalExpenses }); // Step 3: Return both


  } catch (error) {
    console.error("An error occurred:", error);
    return res.status(500).json({ message: "Error Retrieving Search result" });
  }

});

router.get("/generatePayHistoryPDF", async (req, res, next) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30); // Set to 3 weeks ago
    const vendorName = 'FLEXPLAST TECH & SERVICES'

    const data = await getPayHistoryForVendorInRange(vendorName, startDate, endDate); // Adjust with actual function call
    const html = generateHTML(data);
    const pdfBuffer = await generatePDF(html);

    res.type('application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Server error generating PDF');
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
        { "vendor": { "$in": vendorIds } },
        { "title": { "$regex": searchTerm, "$options": "i" } },
        { "site": { "$regex": searchTerm, "$options": "i" } },
      ],
      "createdAt": { "$gte": oneYearAgo },

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


async function getPayHistoryForVendorInRange(vendorName, startDate, endDate) {
  try {
    const pipeline = [
      {
        $lookup: {
          from: 'contacts',
          localField: 'vendor',
          foreignField: '_id',
          as: 'vendorInfo'
        }
      },
      { $unwind: "$vendorInfo" },
      { $match: { "vendorInfo.name": vendorName, "date": { $gte: new Date(startDate), $lte: new Date(endDate) } } },
      // Allow for documents without payHistory or with an empty payHistory array
      {
        $addFields: {
          payHistory: {
            $ifNull: ["$payHistory", []] // If payHistory is null, replace it with an empty array
          }
        }
      },
      { $unwind: { path: "$payHistory", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$_id",
          txnAmount: { $first: "$txn_amount" },
          payHistory: {
            $push: {
              $cond: [
                { $eq: ["$payHistory", null] }, // If payHistory is null (for docs without payHistory)
                "$$REMOVE", // Do not include it in the array
                "$payHistory" // Otherwise, include payHistory in the array
              ]
            }
          },
          totalPaid: { $sum: "$payHistory.paidAmount" },
          expenseDate: { $first: "$date" }
        }
      },
      { $sort: { "expenseDate": 1 } },
      {
        $project: {
          _id: 0,
          invoiceId: "$_id",
          txnAmount: 1,
          payHistory: {
            $filter: { // Filter the payHistory array to remove any $$REMOVE entries added by the $group stage
              input: "$payHistory",
              as: "pay",
              cond: { $ne: ["$$pay", "$$REMOVE"] }
            }
          },
          totalPaid: 1,
          expenseDate: 1
        }
      }
    ];

    const result = await Expense.aggregate(pipeline).exec();
    // console.log(result, 'result');
    return result;
  } catch (error) {
    console.error('Error occurred:', error);
  }
}

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

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB'); // 'en-GB' uses day/month/year format
}

function formatNumber(number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
}

function generateHTML(data) {
  let totalInvoiceAmount = 0;
  let totalPaidAmount = 0;
  let totalBalance = 0;

  data.forEach(invoice => {
    totalInvoiceAmount += invoice.txnAmount;
    totalPaidAmount += invoice.totalPaid;
    totalBalance += invoice.txnAmount - invoice.totalPaid;
  });

  let html = `
    <html>
    <head>
      <style>
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid black; padding: 5px; text-align: left; }
        th { background-color: #f2f2f2; }
        tfoot { font-weight: bold; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Invoice Date</th>
            <th>Invoice Amount</th>
            <th>Total Paid</th>
            <th>Payment Date</th>
            <th>Payment Amount</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>`;

  // Generate table rows
  data.forEach(invoice => {
    const balance = formatNumber(invoice.txnAmount - invoice.totalPaid);
    const hasPayments = invoice.payHistory && invoice.payHistory.length > 0;
    if (!hasPayments) {
      html += `
        <tr>
          <td>${formatDate(invoice.expenseDate)}</td>
          <td>${formatNumber(invoice.txnAmount)}</td>
          <td>${formatNumber(invoice.totalPaid)}</td>
          <td>-</td>
          <td>-</td>
          <td>${balance}</td>
        </tr>`;
    } else {
      invoice.payHistory.forEach((payment, index) => {
        html += `
          <tr>
            <td>${index === 0 ? formatDate(invoice.expenseDate) : ''}</td>
            <td>${index === 0 ? formatNumber(invoice.txnAmount) : ''}</td>
            <td>${index === 0 ? formatNumber(invoice.totalPaid) : ''}</td>
            <td>${payment.paymentDate ? formatDate(payment.paymentDate) : ''}</td>
            <td>${formatNumber(payment.paidAmount)}</td>
            <td>${index === 0 ? balance : ''}</td>
          </tr>`;
      });
    }
  });

  // Add footer with totals
  html += `</tbody>
      <tfoot>
        <tr>
          <td>Totals</td>
          <td>${formatNumber(totalInvoiceAmount)}</td>
          <td>${formatNumber(totalPaidAmount)}</td>
          <td></td>
          <td></td>
          <td>${formatNumber(totalBalance)}</td>
        </tr>
      </tfoot>
    </table>
  </body>
  </html>`;

  return html;
}

async function generatePDF(html) {
  // const browser = await puppeteer.launch();
  const browser = await puppeteer.launch({ headless: true });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A3', printBackground: true });

  await browser.close();
  return pdf;
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
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
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

router.get("/get-expense/:id", clerkMiddleware, (req, res, next) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
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
    const alloweds = [
      "ADMIN",
      "GENERAL MANAGER",
      "MANAGER",
      "SNR ACCOUNTANT",
      "ACCOUNTANT",
      "SECRETARY", "OPERATOR"
    ];

    if (!alloweds.includes(req.userData.role)) {
      return res.status(403).json({ message: "Not allowed" });
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
            // let msent = await Mail.sendNote(note, expObj);
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

// router.put(
//   "/update-notes/:id",
//   clerkMiddleware,
//   upload.any(),
//   async function (req, res, next) {
//     const alloweds = [
//       "ADMIN",
//       "GENERAL MANAGER",
//       "MANAGER",
//       "SNR ACCOUNTANT",
//       "ACCOUNTANT",
//       "SECRETARY", "OPERATOR"
//     ];

//     if (!alloweds.includes(req.userData.role)) {
//       return res.status(403).json({ message: "Not allowed" });
//     }



//     let updater = req.userData.userId;
//     let myPath;
//     // console.log(req.files, "req.files");
//     // console.log(req.body, "req.body");
//     if (req.files) {
//       req.files.forEach((file) => {
//         if (hostname.includes("torama.ng")) {
//           url = "https://fido-api.torama.ng";
//         } else {
//           url = req.protocol + "://" + req.get("host");
//         }

//         myPath =
//           url +
//           "/expenseUploads" +
//           file.path.split("/var/www/uploads/expenses")[1];
//       });
//     }

//     // console.log(myPath, "myPath");

//     const note = req.body;
//     let recId = req.params.id;
//     await saveExpense();

//     async function saveExpense() {
//       try {
//         if (myPath) {
//           note.image = myPath;
//         }

//         let expObj = await Expense.findById(recId);
//         // send mail with Note image

//         let notes;
//         if (expObj) {
//           notes = expObj.notes;

//           notes.push(note);
//           log = expObj.log;

//           log.push({
//             updater: note.author,
//             status: expObj.status,
//             date: new Date(),
//             note,
//           });
//         } else {
//           return res.status(500).json({
//             message: "No expense Object to update! ",
//           });
//         }

//         Expense.findByIdAndUpdate(
//           { _id: recId },
//           { notes: notes, updater: updater, log: log }
//         )
//           .then(async (result) => {
//             // let msent = await Mail.sendNote(note, expObj);
//             const expense = await Expense.findById(recId).populate("vendor").populate("creator", "name email role site image")
//             return res.status(201).json({
//               message: " note with image updated successfully",
//               expense: {
//                 ...expense,
//                 id: expense._id,
//               },
//             });
//           })
//           .catch((error) => {
//             return res.status(500).json({
//               message: "Creating an Image upload failed! " + error,
//             });
//           });
//       } catch (err) {
//         return res.status(500).json({
//           message: "Error with update  " + err,
//         });
//       }
//     }
//   }
// );

router.delete('/notes/:expenseId/:noteIndex', checkAuth, async (req, res) => {
  const { expenseId, noteIndex } = req.params;
  // ...auth checks...
  const alloweds = ['ADMIN', 'GENERAL MANAGER', 'MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT'];
  if (!alloweds.includes(req.userData.role)) {
    return res.status(403).json({ message: "Not allowed" });
  }
  if (!mongoose.Types.ObjectId.isValid(expenseId)) {
    return res.status(400).json({ message: "Invalid expense ID" });
  }
  if (isNaN(noteIndex) || noteIndex < 0) {
    return res.status(400).json({ message: "Invalid note index" });
  }
  try {
    const expense = await Expense.findById(expenseId);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    expense.notes.splice(noteIndex, 1);
    await expense.save();
    res.json({ message: 'Note deleted', notes: expense.notes });

  } catch (error) {
    return res.status(500).json({ message: "Error with update  " + error });

  }

});

router.post("/mail", checkAuth, function (req, res, next) {
  let expenseObj = req.body;
  expenseObj.creator = req.userData.userId;
});

module.exports = router;
