var multer = require("multer");
const DIR = "./uploads/recuploads/";
const moment = require("moment");
const path = require("path");
const Recupload = require("./models/recupload");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();
const Accesslog = require("./models/accesslog");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId;
    const myDir = DIR + userid + "/";
    try {
      if (!fs.existsSync(myDir)) {
        fs.mkdirSync(myDir, { recursive: true });
      }
    } catch (err) {
      throw err;
    }
    cb(null, myDir);
  },
  filename: (req, file, cb) => {
    const fileName =
      req.userData.userId +
      "-" +
      new Date().getTime() +
      file.originalname.toLowerCase().split(" ").join("-");

    cb(null, fileName);
  },
});

// Multer Mime Type Validation
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10,
  },
  fileFilter: (req, file, cb) => {
    // console.log(file.mimetype)
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/jpg" ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .png or .jpg format allowed!"));
    }
  },
});

const storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId;
    const myDir = "uploads/expenses/" + userid + "/";
    try {
      if (!fs.existsSync(myDir)) {
        fs.mkdirSync(myDir, { recursive: true });
      }
    } catch (err) {
      throw err;
    }
    cb(null, myDir);
  },
  filename: (req, file, cb) => {
    console.log(path.extname(file.originalname));
    let fileName;
    if (path.extname(file.originalname)) {
      fileName =
        req.userData.userId +
        "-" +
        new Date().getTime() +
        file.originalname.toLowerCase(file.originalname).split(" ").join("-") +
        path.extname(file.originalname);
      console.log(fileName);
    } else {
      fileName =
        req.userData.userId +
        "-" +
        new Date().getTime() +
        file.originalname.toLowerCase().split(" ").join("-") +
        ".png";
      console.log(fileName);
    }

    cb(null, fileName);
  },
});

var upload2 = multer({
  storage: storage2,
  limits: {
    fileSize: 1024 * 1024 * 10,
  },
  fileFilter: (req, file, cb) => {
    // console.log(file.mimetype)
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/jpg" ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .png or .jpg or pdf format allowed!"));
    }
  },
});

const storage3 = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId;
    const myDir = "uploads/qaqc/" + userid + "/";
    try {
      if (!fs.existsSync(myDir)) {
        fs.mkdirSync(myDir, { recursive: true });
      }
    } catch (err) {
      throw err;
    }
    cb(null, myDir);
  },
  filename: (req, file, cb) => {
    console.log(path.extname(file.originalname));
    let fileName;
    if (path.extname(file.originalname)) {
      fileName =
        req.userData.userId +
        "-" +
        new Date().getTime() +
        file.originalname.toLowerCase(file.originalname).split(" ").join("-") +
        path.extname(file.originalname);
      console.log(fileName);
    } else {
      fileName =
        req.userData.userId +
        "-" +
        new Date().getTime() +
        file.originalname.toLowerCase().split(" ").join("-") +
        ".png";
      console.log(fileName);
    }

    cb(null, fileName);
  },
});

const storage4 = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId;
    const myDir = "uploads/cashdeposit/" + userid + "/";
    try {
      if (!fs.existsSync(myDir)) {
        fs.mkdirSync(myDir, { recursive: true });
      }
    } catch (err) {
      throw err;
    }
    cb(null, myDir);
  },
  filename: (req, file, cb) => {
    console.log(path.extname(file.originalname));
    let fileName;
    if (path.extname(file.originalname)) {
      fileName =
        req.userData.userId +
        "-" +
        file.originalname.toLowerCase(file.originalname).split(" ").join("-") +
        path.extname(file.originalname);
      console.log(fileName);
    } else {
      fileName =
        req.userData.userId +
        "-" +
        new Date().getTime() +
        file.originalname.toLowerCase().split(" ").join("-") +
        ".png";
      console.log(fileName);
    }

    cb(null, fileName);
  },
});

var upload3 = multer({
  storage: storage3,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
  fileFilter: (req, file, cb) => {
    // console.log(file.mimetype)
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/jpg" ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .png or .jpg or pdf format allowed!"));
    }
  },
});

var upload4 = multer({
  storage: storage4,
  limits: {
    fileSize: 1024 * 1024 * 1,
  },
  fileFilter: (req, file, cb) => {
    // console.log(file.mimetype)
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/jpg" ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .png or .jpg  or .pdf format allowed!"));
    }
  },
});

const storage5 = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId;
    const myDir = "uploads/dailyreports/" + userid + "/";
    try {
      if (!fs.existsSync(myDir)) {
        fs.mkdirSync(myDir, { recursive: true });
      }
    } catch (err) {
      throw err;
    }
    cb(null, myDir);
  },
  filename: (req, file, cb) => {
    console.log(path.extname(file.originalname));
    let fileName;
    if (path.extname(file.originalname)) {
      fileName =
        req.userData.userId +
        "-" +
        file.originalname.toLowerCase(file.originalname).split(" ").join("-") +
        path.extname(file.originalname);
      console.log(fileName);
    } else {
      fileName =
        req.userData.userId +
        "-" +
        new Date().getTime() +
        file.originalname.toLowerCase().split(" ").join("-");
      console.log(fileName);
    }

    cb(null, fileName);
  },
});

var upload5 = multer({
  storage: storage5,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
  fileFilter: (req, file, cb) => {
    console.log(file.mimetype, "mimetype");
    if (
      file.mimetype.includes("excel") ||
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/jpg" ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(
        new Error("Only .png or .jpg  or .pdf or .xls format allowed!")
      );
    }
  },
});

const storage6 = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId;
    const myDir = "uploads/liability/" + userid + "/";
    try {
      if (!fs.existsSync(myDir)) {
        fs.mkdirSync(myDir, { recursive: true });
      }
    } catch (err) {
      throw err;
    }
    cb(null, myDir);
  },
  filename: (req, file, cb) => {
    console.log(path.extname(file.originalname));
    let fileName;
    if (path.extname(file.originalname)) {
      fileName =
        req.userData.userId +
        "-" +
        file.originalname.toLowerCase(file.originalname).split(" ").join("-") +
        path.extname(file.originalname);
      console.log(fileName);
    } else {
      fileName =
        req.userData.userId +
        "-" +
        new Date().getTime() +
        file.originalname.toLowerCase().split(" ").join("-") +
        ".jpg";
      console.log(fileName);
    }

    cb(null, fileName);
  },
});

var upload6 = multer({
  storage: storage6,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
  fileFilter: (req, file, cb) => {
    console.log(file.mimetype, "mimetype");
    if (
      file.mimetype.includes("excel") ||
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/jpg" ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(
        new Error("Only .png or .jpg  or .pdf or .xls format allowed!")
      );
    }
  },
});

const storage7 = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId;
    const myDir = "uploads/produce/" + userid + "/";
    try {
      if (!fs.existsSync(myDir)) {
        fs.mkdirSync(myDir, { recursive: true });
      }
    } catch (err) {
      throw err;
    }
    cb(null, myDir);
  },
  filename: (req, file, cb) => {
    console.log(path.extname(file.originalname));
    let fileName;
    if (path.extname(file.originalname)) {
      fileName =
        req.userData.userId +
        "-" +
        file.originalname.toLowerCase(file.originalname).split(" ").join("-") +
        path.extname(file.originalname);
      console.log(fileName);
    } else {
      fileName =
        req.userData.userId +
        "-" +
        new Date().getTime() +
        file.originalname.toLowerCase().split(" ").join("-") +
        ".jpg";
      console.log(fileName);
    }

    cb(null, fileName);
  },
});

var upload7 = multer({
  storage: storage7,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
  fileFilter: (req, file, cb) => {
    console.log(file.mimetype, "mimetype");
    if (
      file.mimetype.includes("excel") ||
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/jpg" ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(
        new Error("Only .png or .jpg  or .pdf or .xls format allowed!")
      );
    }
  },
});

const logIncident = (email, description) => {
  const logObj = new Accesslog({ email: email, description: description });
  logObj
    .save(logObj)
    .then((result) => {
      console.log("access incident logged for user", result);
    })
    .catch((err) => {
      console.log("access logging error for user ", err);
    });
};

async function dayAgg(obj) {
  try {
    const { site, monthInt, yearInt, product, dayInt } = obj;
    var error;
    var records;
    return await Recupload.aggregate([
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
            day: { $dayOfMonth: "$createdAt" },
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
            customer: "$customer.name",
            site: "$terminal_location",
            product: "$products.name",
            action: "$action_taken",
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
              "_id.day": dayInt,
              "_id.month": monthInt,
              "_id.year": yearInt,
              "_id.product": product,
              "_id.action": "PRODUCT RELEASED",
            },
          ],
        },
      },

      {
        $sort: {
          "_id.year": 1,
          "_id.month": -1,
          "_id.day": -1,
          totalQty: -1,
        },
      },
      // { $limit: 2 },
    ]);
  } catch (err) {
    return { error: err };
  }
}

async function weekAgg(obj) {
  try {
    const { site, yearInt, product, weekInt } = obj;
    const weekNo = parseInt(weekInt);

    console.log(
      yearInt,
      weekInt,
      weekNo,
      site,
      product,
      "  yearint, weekint, weekNo, site product utils"
    );
    return await Recupload.aggregate([
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
            year: { $year: "$createdAt" },
            week: { $week: "$createdAt" },
            customer: "$customer.name",
            site: "$terminal_location",
            product: "$products.name",
            action: "$action_taken",
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
              "_id.year": yearInt,
              "_id.week": weekNo,
              "_id.site": site,
              "_id.product": product,
              "_id.action": "PRODUCT RELEASED",
            },
          ],
        },
      },

      {
        $sort: {
          totalQty: -1,
        },
      },
      // { $limit: 10 },
    ]);
  } catch (error) {
    return { error: error };
  }
}

async function monthAgg(obj) {
  try {
    const { site, yearInt, product, monthInt } = obj;

    return await Recupload.aggregate([
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
            action: "$action_taken",
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
              "_id.action": "PRODUCT RELEASED",
            },
          ],
        },
      },

      { $sort: { "_id.year": 1, "_id.month": -1, totalQty: -1 } },
      // { $limit: 200 },
    ]);
  } catch (err) {
    return { error: err };
  }
}

module.exports = {
  upload,
  upload2,
  upload3,
  upload4,
  upload5,
  upload6,
  upload7,
  logIncident,
  dayAgg,
  weekAgg,
  monthAgg,
};
