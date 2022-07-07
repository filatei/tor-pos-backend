const express = require("express");
const FidoOrder = require("../models/fidoorder");
const moment = require("moment");
const Customer = require("../models/customer");
const PayMethod = require("../models/paymethod");
const Terminal = require("../models/terminal");
const User = require("../models/user");
const _ = require("lodash");
const XLSX = require('xlsx');

const router = express.Router();
const Path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();
const tokens = require(`${homedir}/.token.json`);
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
// const Utils = require("../utils");
const Summary = require("../summary/recsummary");
const mail = require("../mail");


const ObjectId = require('mongoose').Types.ObjectId;

var multer = require("multer");
const DIR = "/var/www/uploads/fidoorderimages/";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(DIR)) {
        fs.mkdirSync(DIR, { recursive: true });
      }
    } catch (err) {
      throw err;
    }
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    let ext = Path.extname(file.originalname);
    if (!ext) {
      ext = ".png";
    }
    const fileName =
      new Date().getTime() +
      "-" +
      file.originalname.toLowerCase().split(" ").join("-") +
      ext;
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

const Accesslog = require("../models/accesslog");

// Validator function
function isValidObjectId(id){
     
  if(ObjectId.isValid(id)){
      if((String)(new ObjectId(id)) === id)
          return true;       
      return false;
  }
  return false;
}

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
const Mail = require("nodemailer/lib/mailer");

router.post("", checkAuth, upload.single("image"), async (req, res, next) => {
  try {

    if (!req.userData.role) {
      return res.status(401).json({ message: "Not allowed to create Orders" });
    }

    let url = "";
    let shopObj = req.body;
    // console.log(shopObj, 'shopObj')

    if (!shopObj.customer || shopObj.customer === undefined) {
      return res
        .status(204)
        .json({ message: "check your data. empty customer?" });
    }

    if (req.file) {
      if (hostname.includes("torama.ng")) {
        url = "https://api.torama.ng" +
        "/uploads/fidoorderimages" 
      } else {
        url = req.protocol + "://" + req.get("host");
      }
      const fPath = url + "/" + req.file.path;
      shopObj.image = fPath.replace('/var/www/','');


      // if (hostname.includes("torama.ng")) {
      //   url =
      //     "https://api.torama.ng" +
      //     "/uploads/fidoorderimages" 
      // } else {
      //   url = req.protocol + "://" + req.get("host");
      // }
      // shopObj.image = url + '/' + req.file.path;
      // console.log(url , shopObj.image, 'url and shopobj.image')
    }

    // const dirPath = Path.join(__dirname, "../uploads/printqueue/");
    // let printQueue = dirPath + new Date().getTime() + ".json";

    shopObj.creator = req.userData.userId;
    if (shopObj.action_taken === "PRODUCT RELEASED") {
      shopObj.status = "PAID";
    } else {
      shopObj.status = "NOT PAID";
    }

    if (shopObj.customer && typeof shopObj.customer === "object") {
      shopObj.customer = shopObj.customer._id;
    }

    if (!shopObj.teller_id) {
      delete shopObj.teller_id;
    }
    // let prods = [];
    shopObj.products = JSON.parse(req.body.products);
    // shopObj.receipt = JSON.parse(req.body.receipt);
    const geoLocation = JSON.parse(req.body.geoLocation);
    shopObj.geoLocation = {
      latitude: geoLocation.latitude,
      longitude: geoLocation.longitude,
    };
    Object.entries(shopObj).forEach(([key, value]) => {
      if (
        !value ||
        value === undefined ||
        value === null ||
        value === "null" ||
        value === "undefined"
      ) {
        delete shopObj[key];
      }
    });

    saveOrder(shopObj);

    function saveOrder(shopObj) {
      const fidoorder = new FidoOrder(shopObj);

      fidoorder
        .save()
        .then(async (result) => {
          console.log(result, 'result')
          res.status(201).json({
            message: "FidoOrder added successfully",
            fidoorder: {
              ...result,
              id: result.id,
              paidAmount: result.paidAmount,
            },
          });
          // sendMail(result);
        })
        .catch((error) => {
          res.status(401).json({
            message: "Creating a fidoorder failed! " + error,
          });
        });
    }
    } catch (error) {
      console.log(error)
    }
  
});



router.get("/events", checkAuth, async (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to see produces");
    return res.status(401).json({ message: "Not allowed" });
  }

  try {
    // const yesterdayStart = moment()
    //   .subtract(14, "days")
    //   .startOf("day")
    //   .toDate();
    // const yesterdayEnd = moment().subtract(0, "days").endOf("day").toDate();
    // // start of today
    // var start = moment().startOf("day").toDate();

    // // end today
    // var end = moment(start).endOf("day").toDate();

    // let order = await FidoOrder.find({}, { trans_date: 1, _id: 1 }).lean();

    let summary = await FidoOrder.aggregate([
      // {
      //   $match: {
      //     action_taken: "PRODUCT RELEASED",
      //   },
      // },

      {
        $group: {
          _id: {
            year: { $year: "$trans_date" },
            month: { $month: "$trans_date" },
            day: { $dayOfMonth: "$trans_date" },
          },
          myCount: { $sum: 1 },
          paidAmount: {
            $sum: "$paidAmount",
          },
        },
      },

      {
        $project: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1,
          myCount: 1,
          paidAmount: 1,
        },
      },
    ]);
    summary = summary.map((s) => {
      const sDate =
        s._id.year +
        "-" +
        s._id.month.toLocaleString("en-US", {
          minimumIntegerDigits: 2,
          useGrouping: false,
        }) +
        "-" +
        s._id.day.toLocaleString("en-US", {
          minimumIntegerDigits: 2,
          useGrouping: false,
        });
      return {
        title: s.myCount + ", N" + s.paidAmount.toLocaleString(),
        date: sDate,
      };
    });

    if (summary) {
      return res.status(200).json({ events: summary });
    } else {
      return res.status(500).json({ message: "Empty Events" });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error with order events try block" + err });
  }
});

router.put("/:id", checkAuth, upload.single("image"), (req, res, next) => {

  const ALLOWEDS = ['ADMIN', 'GENERAL MANAGER', 'MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT','SECRETARY', "SUPERVISOR", 'SECURITY', 'POS OFFICER'];

  if ( !ALLOWEDS.includes(req.userData.role) ) {
    return res.status(500).json({ message: "Not allowed" });
  }

  let path = "";
  let url = "";
  let shopObj = req.body;
  const price = req.body.price;
  const status = req.body.status;
  const taxRate = req.body.taxRate;
  const description = req.body.description;
  const name = req.body.name;
  // const updatedAt = req.body.updatedAt;
  const updater = req.userData.userId;
  const id = req.params.id;
  shopObj._id = req.params.id;
  shopObj.updater = req.userData.userId;

  const fidoorder = new FidoOrder(shopObj);
  if (req.file && req.file.filename && req.file.filename.length > 0) {
    if (hostname.includes("torama.ng")) {
      path =
        "https://api.torama.ng" +
        "/uploads/fidoorderimages/" +
        req.file.filename;
    } else {
      url = req.protocol + "s://" + req.get("host");
      path = url + "/uploads/fidoorderimages/" + req.file.filename;
    }
    fidoorder.image = path;
    FidoOrder.updateOne({ _id: req.params.id }, fidoorder)
      .then((result) => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          message: "Couldn't update fidoorder! " + error,
        });
      });
  } else {
    FidoOrder.updateOne(
      { _id: req.params.id },
      {
        name: name,
        price: price,
        description: description,
        taxRate: taxRate,
        status: status,
        updaters: shopObj.updaters,
      }
    )
      .then((result) => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          message: "Couldn't update fidoorder! " + error,
        });
      });
  }
});

router.put(
  "/notes/:id",
  checkAuth,
  upload.single("image"),
  async function (req, res, next) {
    const alloweds = ['ADMIN','GENERAL MANAGER','MANAGER', 'SECRETARY', 'SUPERVISOR', 'SECURITY', "OFFICER", "SNR ACCOUNTANT"];

    if (!req.userData.role) {
      // logIncident(req.userData.email, "Not allowed to create notes");
      return res.status(500).json({ message: "Not allowed" });
    }

    let updater = req.userData.userId;
    const note = req.body;
    if (req.file && req.file.filename && req.file.filename.length > 0) {
      if (hostname.includes("torama.ng")) {
        path =
          "https://api.torama.ng" +
          "/uploads/fidoorderimages/" +
          req.file.filename;
      } else {
        url = req.protocol + "://" + req.get("host");
        path = url + "/uploads/fidoorderimages/" + req.file.filename;
      }
      note.image = path;
    }
    let recId = req.params.id;
    try {
      let orderObj = await FidoOrder.findById(recId);
      // send mail with Note image
      // let msent = await Mail.sendNote(note, expObj);

      let notes = orderObj.notes || [];
      if (notes && notes?.length) {
        notes.push(note);
      } else {
        notes = [note];
      }

      log = orderObj.log || [];

      log.push({
        updater: note.author,
        status: orderObj.status,
        date: new Date(),
        note,
      });
      FidoOrder.findByIdAndUpdate(
        { _id: recId },
        { notes: notes, updater: updater, log: log }
      )
        .then((result) => {
          res.status(201).json({
            message: " note with image updated successfully",
            order: {
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
    } catch (err) {
      res.status(500).json({
        message: "Error with update in try block " + err,
      });
    }
  }
);

router.delete("/:id", checkAuth, async (req, res, next) => {

  if (!['ADMIN'].includes(req.userData.role) ) {
    return res.status(500).json({ message: "Not allowed" });
  }

  let filePath;

  let ids = JSON.parse(req.params.id);
  if (typeof ids === 'object') {
    ids.forEach(id => {
      console.log(id, 'deleting')
      FidoOrder.findById(id)
      .then((fidoorder) => {
        if (fidoorder && fidoorder.image) {
          filePath = "uploads/" + fidoorder.image.split("/uploads/")[1];
        }
      })
      .catch((err) => {
        return res
          .status(401)
          .json({ message: "fidoorder not found in db!" + err });
      });
  
      FidoOrder.deleteOne({ _id: id })
      .then((result) => {
        if (result.n > 0) {
          // delete fidoorder.image
          if (filePath) {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(err);
              }
              console.log("related file deleted");
            });
          }
  
          return res.status(200).json({ message: "Deletion successful!" });
        } else {
          return res
            .status(401)
            .json({ message: "deletion failed ...id may not exist!" });
        }
      })
      .catch((error) => {
        console.error(error);
        return res.status(500).json({
          message: "Deleting fidoorder failed! " + error,
        });
      });
    })
  } else {
    const del = await FidoOrder.deleteOne({ _id: ids })
    if (del) {
      return res.status(200).json({ message: "Deletion successful!" });
    } else {
      return res
      .status(401)
      .json({ message: "deletion failed ...id may not exist!" });
    }
  }
  
});

router.get("", checkAuth, async (req, res, next) => {
  // if you are an ordinary user, you only see orders created in your site or by you
  try {
    let pageSize = +req.query.pagesize;
    if (!pageSize) pageSize = 400;
    const role = req.userData.role;
    const userId = req.userData.userId
    const site = req.userData.site
    let currentPage = +req.query.page;
    if (!currentPage) currentPage = 1;
    let orders;

    if (['ADMIN','GENERAL MANAGER', 'SNR ACCOUNTANT'].includes(role)) {
      orders = await FidoOrder.find()
                          .lean()
                          .sort({ createdAt: -1 })
                          .populate("customer")
                          .populate("creator")
                          .populate("terminal_id")
                          .skip(pageSize * (currentPage - 1))
                          .limit(pageSize);
      
    } else {
      orders = await FidoOrder.find({$or: [{ site: site }, { creator: userId }]})
                          .lean()
                          .sort({ createdAt: -1 })
                          .populate("customer")
                          .populate("creator")
                          .populate("terminal_id")
                          .skip(pageSize * (currentPage - 1))
                          .limit(pageSize);
    }
    return res.status(200).json({
      message: "Orders fetched successfully!",
      fidoorders: orders,
    });
  } catch (error) {
    res.status(500).json({
      message: "Fetching fidoorders failed! " + error,
    });
  }
  
});

router.post("/eodOrders", checkAuth, async (req, res, next) => {
  // if you are an ordinary user, you only see orders created in your site or by you
  try {
    const alloweds = req.userData.role;

  // console.log(req.userData.site)
  if (!['ADMIN', 'GENEAL MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT',  'MANAGER'].includes(req.userData.role)) {
    return res.status(500).json({ message: "Not allowed" });
  }

  const yesterdayStart = moment().subtract(1, "days").startOf("day").toDate();
  const yesterdayEnd = moment().subtract(0, "days").endOf("day").toDate();
  // start of today
  var start = moment().startOf("day").toDate();

  // end today
  var end = moment(start).endOf("day").toDate();

    
    const role = req.userData.role;
    const userId = req.userData.userId
    const site = req.userData.site
    
    let orders = req.body;
    console.log(orders, 'orders')

    // orders = JSON.parse(orders)

    // if (['ADMIN','GENERAL MANAGER'].includes(role)) {
    //   orders = await FidoOrder.find({createdAt: { $gte: start, $lte: end }})
    //                       .lean()
    //                       .sort({ createdAt: -1 })
    //                       .populate("customer")
    //                       .populate("creator")
    //                       .populate("terminal_id")
      
    // } else {
    //   orders = await FidoOrder.find({createdAt: { $gte: start, $lte: end }},{$or: [{ site: site }, { creator: userId }]})
    //                       .lean()
    //                       .sort({ createdAt: -1 })
    //                       .populate("customer")
    //                       .populate("creator")
    //                       .populate("terminal_id")
    // }
    if (orders && orders.length) {
      const mailOut =  await mail.sendEodOrders(orders, req.userData);
      await json2excel(orders, req.userData.site);
      console.log(orders.length)
      return res.status(200).json({
        message: "Orders Sent successfully!",
        fidoorders: orders,
      });
    } else {
      return res.status(200).json({
        message: " Nill Orders. Not Sent!",
        fidoorders: orders,
      });
    }
    
    
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: "Fetching fidoorders failed! " + error,
    });
  }
  
 

  
});

router.get("/ordersbyuser", checkAuth, async (req, res, next) => {
  try {
    const userId = req.userData.userId; 
    const site = req.userData.site; 
    console.log(userId, 'userid');

    // start of today
    var start = moment().startOf("day").toDate();

    // end today
    var end = moment(start).endOf("day").toDate();

    // by user today
    const orders =  await FidoOrder.find({createdAt: { $gte: start, $lte: end },$or: [{ site: site }, { creator: userId }]}) .lean()
    .sort({createdAt:-1})
    .limit(400)
    .populate('creator')
    .populate('customer')
    .populate('terminal_id')
    res.status(200).json({message: 'Orders fetched successfully', fidoorders:orders})

  } catch (error) {
    console.log(error)
    return res.status(500).json({message: 'Error fetching orders - ' + error})
  }
})

router.get("/bydate", checkAuth, async (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to see Receipts");
    return res.status(500).json({ message: "Not allowed" });
  }
  //  given a date, return all receipts for day

  try {
    const { date } = req.query;
    let ddate = date.split("T")[0];
    var start = moment(ddate).startOf("day");

    // end day
    var end = moment(ddate).endOf("day");
    let dayData = await FidoOrder.find({
      createdAt: { $gte: start, $lt: end },
    })
      .lean()
      .sort({ createdAt: -1 })
      .populate("customer")
      .populate("creator")
      .populate("terminal_id");
    if (dayData) {
      return res.status(200).json({ records: dayData });
    } else {
      return res.status(500).json({ message: "empty day data" });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error with  daily try block " + err });
  }
});

router.get("/summary", checkAuth, async (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  // console.log(req.userData.site)
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to see Receipts");
    return res.status(500).json({ message: "Not allowed" });
  }

  try {
    const yesterdayStart = moment()
      .subtract(7, "days")
      .startOf("day")
      .toDate();
    const yesterdayEnd = moment().subtract(0, "days").endOf("day").toDate();
    // start of today
    var start = moment().startOf("day").toDate();

    // end today
    var end = moment(start).endOf("day").toDate();

    const { recSummary } = req.query;
    const site = req.userData.site;

    if (recSummary) {
      // if (!['ADMIN', 'MANAGER', 'GENERAL MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT'].includes(req.userData.role) ) {
      //   return;
      // }

      let aggData = await Pipeline(yesterdayStart, yesterdayEnd, site);

      // bring out the ._id
      aggData = aggData.map((a) => {
        return {
          ...a._id,
          totalSalesAmount: a.totalSalesAmount.toLocaleString(),
          totalQty: a.totalQty.toLocaleString(),
        };
      });
      // console.log(aggData, 'aggData', yesterdayStart, yesterdayEnd)


      if (aggData) {
        return res.status(200).json({ records: aggData });
      } else {
        return res
          .status(500)
          .json({ message: "Error with fidoOrder summary" });
      }
    }
  } catch (err) {
    console.log(err)
    return res
      .status(500)
      .json({ message: "Server Error with fidoOrder summary try block" + err });
  }
});

router.get("/:id", async (req, res, next) => {

  try {
    const id = req.params.id;

    //  return blank object if id is wrong
    if ( ! isValidObjectId(id) ) {
      console.log('invalid id')
      return res.status(200).json({});
    } else {
      console.log('valid id... proceeding')
    }
    const fidoOrder = await FidoOrder.findById(id)
    .populate("creator")
    .populate("updater")
    .populate("customer")
    .populate("terminal_id")
    if (fidoOrder) {
      res.status(200).json(fidoOrder);
    } else {
      console.log('no order')
    }
  
  } catch (error) {
    console.log(error, 'catch error')
    // res.status(400).json({
    //   message: "CatchError: Fetching fidoorder failed! " + error,
    // });
  }

  
});


async function Pipeline(start, end, site) {
  const pipeline = [
    {
      $match: {
        // action_taken: "PRODUCT RELEASED",
        orderType: "NORMAL",
        createdAt: { $gte: start, $lte: end },
        // site: site
      },
    },
    {
      $unwind: {
        path: "$products",
      },
    },
    {
      $group: {
        _id: {
          date: {$dateToString:{format: "%d-%m-%Y", date: "$createdAt"}},
         
          product: "$products.name",
          site: "$terminal_location",
        },
        totalSalesAmount: {
          $sum: "$txn_amount",
        },
        totalQty: {
          $sum: "$products.qty",
        },
      },
    },
    {
      $sort: {
        "_id.date": -1,
        "_id.site": 1,
        "_id.product": 1,

        totalQty: -1,
        "_id.site": 1,
      },
    },
  ];

  // return pipeline;
  const summary = await FidoOrder.aggregate(pipeline);
  // console.log(summary, "summary ");
  return summary;
}

async function json2excel(orders, site) { 
  const today= new Date().toLocaleDateString('en-GB').replace(/\//g,'_');

  const worksheet = XLSX.utils.json_to_sheet(orders);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook,worksheet,'orders')

  // generate buffer
  XLSX.write(workbook, {bookType:'xlsx', type:'buffer'})

  // generate binary
  XLSX.write(workbook, {bookType:'xlsx', type:'binary'})

  // generate buffer
  XLSX.writeFile(workbook, `/tmp/${site}-order-${today}.xlsx`)


}


module.exports = router;
