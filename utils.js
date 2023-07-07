var multer = require("multer");
const DIR = "/var/www/uploads/torama/recuploads2/";
const moment = require("moment");
const path = require("path");
const Recupload = require("./models/recupload");
const FidoOrder = require("./models/fidoorder");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();
const Accesslog = require("./models/accesslog");
const { uniqueId } = require("lodash");

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "application/pdf": "pdf",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

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
      file.originalname.toLowerCase().split(" ").join("-") +
      "." +
      MIME_TYPE_MAP[file.mimetype];

    cb(null, fileName);
  },
});

// Multer Mime Type Validation
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 3,
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
    const myDir = "/var/www/uploads/expenses/" + userid + "/";
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
    let fileName;
    if (path.extname(file.originalname)) {
      fileName =
        req.userData.userId +
        "-" +
        new Date().getTime() +
        file.originalname.toLowerCase(file.originalname).split(" ").join("-") +
        path.extname(file.originalname);
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

const storage22 = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId;
    const myDir = "/var/www/uploads/produceexpenses/" + userid + "/";
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
    let fileName =
      req.userData.userId +
      "-" +
      new Date().getTime() +
      file.originalname.toLowerCase().split(" ").join("-") +
      "." +
      MIME_TYPE_MAP[file.mimetype];

    cb(null, fileName);
  },
});

var upload22 = multer({
  storage: storage22,
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
    const myDir = "/var/www/uploads/qaqc/" + userid + "/";
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
    fileName =
      req.userData.userId +
      "-" +
      new Date().getTime() +
      file.originalname.toLowerCase().split(" ").join("-") +
      "." +
      MIME_TYPE_MAP[file.mimetype];

    cb(null, fileName);
  },
});

const storage4 = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId;
    const myDir = "/var/www/uploads/cashdeposit/" + userid + "/";
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
    let fileName;
    fileName =
      req.userData.userId +
      "-" +
      file.originalname.toLowerCase().split(" ").join("-") +
      new Date().getTime() +
      "." +
      MIME_TYPE_MAP[file.mimetype];

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
    const myDir = "/var/www/uploads/dailyreports/" + userid + "/";
    try {
      if (!fs.existsSync(myDir)) {
        fs.mkdirSync(myDir, { recursive: true });
      }
    } catch (err) {
      throw err;
    }
    cb(null, myDir);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.originalname +
        "-" +
        new Date().getTime() +
        "." +
        MIME_TYPE_MAP[file.mimetype]
    ); //Appending extension
  },
});

var upload5 = multer({
  storage: storage5,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
  fileFilter: (req, file, cb) => {
    console.log(file.mimetype, MIME_TYPE_MAP[file.mimetype], "mimetype");
    if (MIME_TYPE_MAP[file.mimetype]) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(
        new Error("Only .png or .jpg  or .pdf or .xls or .xlsx format allowed!")
      );
    }
  },
});

const storage6 = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId;
    const myDir = "/var/www/uploads/liability/" + userid + "/";
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
    console.log(path.extname(file.originalname), "ext name");
    const extName = MIME_TYPE_MAP[file.mimetype];
    fileName =
      req.userData.userId +
      "-" +
      new Date().getTime() +
      "-" +
      file.originalname.toLowerCase().split(" ").join("-") +
      "." +
      extName;

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
    const myDir = "/var/www/uploads/produce/" + userid + "/";
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
    const extName = MIME_TYPE_MAP[file.mimetype];
    let fileName;
    fileName =
      req.userData.userId +
      "-" +
      new Date().getTime() +
      file.originalname.toLowerCase().split(" ").join("-") +
      "." +
      extName;

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

const storage8 = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId;
    const myDir = "/var/www/uploads/gens/" + userid + "/";
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
    const extName = MIME_TYPE_MAP[file.mimetype];
    let fileName;
    fileName =
      req.userData.userId +
      "-" +
      new Date().getTime() + '-' +
      file.originalname.toLowerCase().split(" ").join("-") +
      "." +
      extName;

    cb(null, fileName);
  },
});

var upload8 = multer({
  storage: storage8,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
  fileFilter: (req, file, cb) => {
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

const storageCall = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId;
    const myDir = "/var/www/uploads/calls/" + userid + "/";
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

var uploadCall = multer({
  storage: storageCall,
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
    console.log(site, dayInt, monthInt, yearInt, product)
    
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

async function dayRecAgg(obj) {
  try {
    const { site, monthInt, yearInt, product, dayInt } = obj;
    const ddate = new Date(yearInt + '-' + monthInt + '-' + dayInt);
    const start = moment(ddate).startOf("day").toDate();
        // end day
    const end = moment(ddate).endOf("day").toDate();

    console.log(site, start, end, 'date start end rec')
    var error;
    var records;
    return await Recupload.aggregate([
      { $unwind: "$products" },

      {
        $match: {
          $and: [
            {
              "terminal_location": site,
              "createdAt": {$gte: start, $lte: end},
              "action_taken": "PRODUCT RELEASED",
              "products.name": product
            },
          ],
        },
      },
      
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
      // {
      //   $match: {
      //     $and: [
      //       {
      //         "_id.site": site,
      //         "_id.day": dayInt,
      //         "_id.month": monthInt,
      //         "_id.year": yearInt,
      //         "_id.product": product,
      //         "_id.action": "PRODUCT RELEASED",
      //       },
      //     ],
      //   },
      // },

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

async function dayOrderAgg(obj) {
  try {
    let { site, monthInt, yearInt, product, dayInt } = obj;
    var error;
    var records;
    
    const tdate = new Date(yearInt +'-'+monthInt+'-'+dayInt);
    const start = moment(tdate).startOf("day").toDate();
        // end day
    const end = moment(tdate).endOf("day").toDate();
    console.log( site, start, end, "tdate start end order")


    return await FidoOrder.aggregate([
      {
          '$unwind': {
            'path': '$products'
          }
        },
        {
          $match: {
            $and: [
              {
                "site": site,
                "createdAt": {$gte: start, $lte: end},
                "orderType": "NORMAL",
                "products.name": product
              },
            ],
          },
        },
       {
        '$lookup': {
          'from': 'customers', 
          'localField': 'customer', 
          'foreignField': '_id', 
          'as': 'customer'
        }
      },
       {
        '$unwind': {
          'path': '$customer'
        }
      }, 
      
      {
        '$group': {
          '_id': {
            'day': {
              '$dayOfMonth': '$createdAt'
            }, 
            'month': {
              '$month': '$createdAt'
            }, 
            'year': {
              '$year': '$createdAt'
            }, 
            'site': '$site', 
            'product': '$products.name', 
            'orderType': '$orderType', 
            'customer': '$customer.name'
          }, 
          'totalSalesAmount': {
            '$sum': '$txn_amount'
          }, 
          'totalQty': {
            '$sum': '$products.qty'
          }, 
          'count': {
            '$sum': 1
          }
        }
      }, 

      // {
      //   $match: {
      //     $and: [
      //       {
      //         "_id.site": site,
      //         "_id.day": dayInt,
      //         "_id.month": monthInt,
      //         "_id.year": yearInt,
      //         "_id.product": product,
      //         "_id.orderType": "NORMAL",
      //       },
      //     ],
      //   },
      // },
      
      

      {
        $sort: {
          totalQty: -1,
        },
      },
      // { $limit: 200 },
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
function getDateOfISOWeek(w, y) {
  var simple = new Date(y, 0, 1 + (w - 1) * 7);
  var dow = simple.getDay();
  var ISOweekStart = simple;
  if (dow <= 4)
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
}

async function weekOrderAgg(obj) {
  try {

    const { site, yearInt, product, weekInt, date } = obj;
    const ddate = getDateOfISOWeek(weekInt, yearInt);
    //  date is start date of week
    
    const dayInt = 1;
    const tdate = new Date(ddate);

    const dayEndInt = new Date(ddate).getDate() + 6;
    const monthInt = new Date(ddate).getMonth() + 1;
    // console.log(date, ddate, dayEndInt, monthInt, ' indate wkdate rec')
    
    const tdate2 = new Date(yearInt + '-' + monthInt + '-' + dayEndInt);
    const start = moment(tdate).startOf("day").toDate();
        // end day
    const end = moment(tdate2).endOf("day").toDate();

    return await FidoOrder.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          $and: [
            {
             "createdAt": {$gt: start, $lte: end},
              "site": site,
              "products.name": product,
              "orderType": "NORMAL",
            },
          ],
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
        },
      },

      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            week: { $week: "$createdAt" },
            customer: "$customer.name",
            site: "$site",
            product: "$products.name",
            orderType: "$orderType",
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
              "_id.week": weekInt,
              "_id.site": site,
              "_id.product": product,
              "_id.orderType": "NORMAL",
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

async function weekRecAgg(obj) {
  try {
    const { site, yearInt, product, weekInt, date } = obj;
    const ddate = getDateOfISOWeek(weekInt, yearInt);
    //  date is start date of week
    
    const dayInt = 1;
    const tdate = new Date(ddate);

    const dayEndInt = new Date(ddate).getDate() + 6;
    const monthInt = new Date(ddate).getMonth() + 1;
    console.log(date, ddate, dayEndInt, monthInt, ' indate wkdate rec')

    
    const tdate2 = new Date(yearInt + '-' + monthInt + '-' + dayEndInt);

    console.log(
      ddate,
      yearInt,
      weekInt,
      site,
      product,
      dayEndInt,
      tdate2,
      "  isodate, yearint, weekint, site product, dayEnd, tdate2, utils"
    );
    const start = moment(tdate).startOf("day").toDate();
        // end day
    const end = moment(tdate2).endOf("day").toDate();

    return await Recupload.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          $and: [
            {
             "createdAt": {$gt: start, $lte: end},
              "terminal_location": site,
              "products.name": product,
              "action_taken": "PRODUCT RELEASED",
            },
          ],
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
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
              "_id.week": weekInt,
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

async function monthRecAgg(obj) {
  try {
    const { site, yearInt, product, monthInt } = obj;
    const dayInt = 1;
    const dayEndInt = 31;
    const tdate = new Date(yearInt +'-'+monthInt+'-'+dayInt);
    const tdate2 = new Date(yearInt +'-'+monthInt+'-'+dayEndInt);
    const start = moment(tdate).startOf("day").toDate();
        // end day
    const end = moment(tdate2).endOf("day").toDate();
    console.log(obj, ' in month');
    return await Recupload.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          $and: [
            {
              "terminal_location": site,
              "createdAt": {$gte: start, $lte: end},
              "products.name": product,
              "action_taken": "PRODUCT RELEASED",
            },
          ],
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
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

async function monthOrderAgg(obj) {
  try {
    const { site, yearInt, product, monthInt } = obj;
    const dayInt = 1;
    const dayEndInt = 31;
    const tdate = new Date(yearInt +'-'+monthInt+'-'+dayInt);
    const tdate2 = new Date(yearInt +'-'+monthInt+'-'+dayEndInt);
    const start = moment(tdate).startOf("day").toDate();
        // end day
    const end = moment(tdate2).endOf("day").toDate();
    console.log( site, start, end, "tdate start end order")

    return await FidoOrder.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          $and: [
            {
              "site": site,
              "createdAt": {$gte: start, $lte: end},
              "products.name": product,
              "orderType": "NORMAL",
            },
          ],
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
        },
      },

      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
            customer: "$customer.name",
            site: "$site",
            orderType: "$orderType",
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
              "_id.orderType": "NORMAL",
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

async function yearOrderAgg(obj) {
  try {
    const { site, yearInt, product } = obj;
    const monthInt = 1;
    const dayInt = 1;
    const dayEndInt = 31;
    const monthEndInt = 12;
    
    const ddate = new Date(yearInt + '-' + monthInt + '-' + dayInt);
    const ddate2 = new Date(yearInt + '-' + monthEndInt + '-' + dayEndInt);
    const start = moment(ddate).startOf("day").toDate();
        // end day
    const end = moment(ddate2).endOf("day").toDate();

    return await FidoOrder.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          $and: [
            {
              "site": site,
              "createdAt": {$gte: start, $lte: end},
              
              "orderType": "NORMAL",
              "products.name": product
            },
          ],
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
        },
      },

      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            customer: "$customer.name",
            site: "$site",
            orderType: "$orderType",
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
              "_id.year": yearInt,
              "_id.product": product,
              "_id.orderType": "NORMAL",
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

async function yearRecAgg(obj) {
  try {
    const { site, yearInt, product } = obj;
    console.log(obj, 'yearRecAgg')
    const monthInt = 1;
    const dayInt = 1;
    const dayEndInt = 31;
    const monthEndInt = 12;
    
    const ddate = new Date(yearInt + '-' + monthInt + '-' + dayInt);
    const ddate2 = new Date(yearInt + '-' + monthEndInt + '-' + dayEndInt);
    const start = moment(ddate).startOf("day").toDate();
        // end day
    const end = moment(ddate2).endOf("day").toDate();



    return await Recupload.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          $and: [
            {
              "terminal_location": site,
              "createdAt": {$gte: start, $lte: end},
              "action_taken": "PRODUCT RELEASED",
              "products.name": product
            },
          ],
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
        },
      },

      {
        $group: {
          _id: {

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
      // {
      //   $match: {
      //     $and: [
      //       {
      //         "_id.site": site,
      //         "_id.year": yearInt,
      //         "_id.product": product,
      //         "_id.action": "PRODUCT RELEASED",
      //       },
      //     ],
      //   },
      // },

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
  upload22,
  upload3,
  upload4,
  upload5,
  upload6,
  upload7,
  upload8,
  uploadCall,
  logIncident,
  dayAgg,
  weekAgg,
  monthAgg,
  dayOrderAgg,
  weekOrderAgg,
  monthOrderAgg,
  yearOrderAgg,
  yearRecAgg,
  monthRecAgg,
  weekRecAgg,
  dayRecAgg
};
