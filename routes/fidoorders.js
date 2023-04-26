const express = require("express");
const FidoOrder = require("../models/fidoorder");
const moment = require("moment");
const Customer = require("../models/customer");
const PayMethod = require("../models/paymethod");
const Terminal = require("../models/terminal");
const User = require("../models/user");
const _ = require("lodash");
const XLSX = require('xlsx');
const Utils = require("../utils");
const fns = require('date-fns');

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
let PRODUCTNAME = { "INCENTIVE": "INCENTIVE","Pure Water": "PUREWATER", "19L Dispenser Refill": "DISPENSER", 
                  "19L Dispenser Replace":"DISPENSER", "75cl Crate":"CRATE75CL", "50cl Crate":"CRATE50CL", 
                  "Nylon Waste":"WASTES", "Cement":"CEMENT", "9-inch Block":"BLOCK", "6-inch Block":"BLOCK" };

const ObjectId = require('mongoose').Types.ObjectId;

const Flutterwave = require('flutterwave-node-v3');
let flw;
if (hostname.includes('torama.ng')) {
   flw = new Flutterwave(tokens.FLW_PUBLIC_KEY, tokens.FLW_SECRET_KEY);

} else {
   flw = new Flutterwave(tokens.FLW_PUBLIC_KEY_TEST, tokens.FLW_SECRET_KEY_TEST);
}



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
const { deleteModel } = require("mongoose");
const { setMinutes } = require("date-fns");

router.post("", checkAuth, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.userData.role) {
      return res.status(401).json({ message: "Not allowed to create Orders" });
    }

    let url = "";
    let transactionId;
    let shopObj = req.body;
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

    shopObj.creator = req.userData.userId;
   

    if (shopObj.customer && typeof shopObj.customer === "object") {
      shopObj.customer = shopObj.customer._id;
    }

    if (!shopObj.teller_id) {
      delete shopObj.teller_id;
    }

    shopObj.products = JSON.parse(req.body.products);
    const geoLocation = JSON.parse(req.body.geoLocation);
    shopObj.geoLocation = {
      latitude: geoLocation.latitude,
      longitude: geoLocation.longitude,
    };

  if (shopObj.response) {
    shopObj.response_frontend = JSON.parse(shopObj.response);
    transactionId = shopObj.response_frontend.transaction_id;
  }
  
  if (transactionId) {
    flw.Transaction.verify({ id: transactionId })
    .then((response) => {
      shopObj.response_backend = response;
      
        if (
            response.data.status === "successful"
            && response.data.amount === shopObj.response_frontend.amount
            && response.data.currency === shopObj.response_frontend.currency) {
              console.log(response, 'backend response')
              shopObj.charged_amount = response.data.charged_amount;
              shopObj.amount_settled = response.data.amount_settled;
              shopObj.status = 'PAID'
              saveOrder(shopObj);
              
            // Success! Confirm the customer's payment
        } else {
            shopObj.status = 'NOT PAID';
            saveOrder(shopObj)
            // Inform the customer their payment was unsuccessful
        }
    })
    .catch(err => {
      console.log(err)
      return res.status(500).json({
        message: err
      })
    });
  } else {
    if (!shopObj.customer || shopObj.customer === undefined) {
      return res
        .status(204)
        .json({ message: "check your data. empty customer?" });
    }
    if (shopObj.paymentMethod === 'FLUTTERWAVE') {
      shopObj.status = 'NOT PAID'
    } else if (shopObj.action_taken === "PRODUCT RELEASED") {
      shopObj.status = "PAID";
    } else { 
      shopObj.status = "NOT PAID";
    }

    if (req.file) {
      if (hostname.includes("torama.ng")) {
        url = "https://fido-api.torama.ng"  
      } else {
        url = req.protocol + "://" + req.get("host");
      }
      const fPath = url + "/" + req.file.path;
      shopObj.image = fPath.replace('/var/www/','');

    }
    saveOrder(shopObj);
  }

    function saveOrder(shopObj) {
      const fidoorder = new FidoOrder(shopObj);

      fidoorder
        .save()
        .then(async (result) => {
          const res2 = await FidoOrder.findById(result._doc._id).lean()
          .populate('customer')
          .populate('creator')
          .populate('terminal_id')

          res.status(201).json({
            message: "FidoOrder added successfully",
            fidoorder: {
              ...res2,
              id: res2.id,
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
      res.status(500).json({
        message: "Creating a fidoorder failed! " + error,
      });
    }
  
});

router.put("/:id", checkAuth, upload.single("image"), async (req, res, next) => {

  const ALLOWEDS = ['ADMIN', 'GENERAL MANAGER', 'MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT','SECRETARY', "SUPERVISOR", 'SECURITY', 'POS OFFICER'];

  if ( !ALLOWEDS.includes(req.userData.role) ) {
    return res.status(500).json({ message: "Not allowed " + req.userData.role});
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
  shopObj.updater = updater;
  const order = await FidoOrder.findById(id);
  const updaters = order.updaters;
  const today = new Date().toLocaleString('en-GB', {timeZone: 'Africa/Lagos'})
  updaters.push({name: req.userData.name, date: today})
  shopObj.updaters = updaters;

  const fidoorder = new FidoOrder(shopObj);
  if (req.file && req.file.filename && req.file.filename.length > 0) {
    if (hostname.includes("torama.ng")) {
      path =
        "https://fido-api.torama.ng" +
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
        updater,
        updaters: updaters,
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
    const alloweds = ['ADMIN','GENERAL MANAGER','MANAGER', 'SECRETARY', 'POS OFFICER', 'SUPERVISOR', 'SECURITY', "OFFICER", "SNR ACCOUNTANT"];

    if (!req.userData.role) {
      // logIncident(req.userData.email, "Not allowed to create notes");
      return res.status(500).json({ message: "Not allowed" });
    }

    let updater = req.userData.userId;
    const note = req.body;

    if (req.file && req.file.filename && req.file.filename.length > 0) {
      if (hostname.includes("torama.ng")) {
        path =
          "https://fido-api.torama.ng" +
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

  if (!['ADMIN', 'GENERAL MANAGER', 'SNR ACCOUNTANT', 'MANAGER', 'ACCOUNTANT'].includes(req.userData.role) ) {
    return res.status(500).json({ message: "Not allowed" });
  }

  let ids = JSON.parse(req.params.id);
  let qualifiedForDeletion
  

  if (typeof ids === 'object') {
    //  delete many
    //  filter the ids if object and remove ids of orders that are beyond paid
  

    const orders = await FidoOrder.find({_id: {$in: ids}}).lean();
    if ( orders && orders.length ) {
      qualifiedForDeletion = orders.filter(o => ['PAID'].includes(o.status) ).map(oo => oo._id);
    }

    if (qualifiedForDeletion && qualifiedForDeletion.length) {
      const deleted = await FidoOrder.deleteMany( {_id: { $in: qualifiedForDeletion }} )
      console.log('deleted', deleted)
      if (deleted.n) {
        return res.status(200).json({ message: " multipleDeletion successful!" });
      } else {
        return res.status(401).json({ message: " multi deletion failed ...!" });
      }
    }
    
  } else {
    const order = await FidoOrder.findById(ids)

    if(order && !['PAID', 'DELIVERED', 'LOADED' ].includes(order.status)  ) {
      // if(order && order.status !== 'PAID') {
        return res
      .status(401)
      .json({ message: "deletion failed ...Status already beyond PAID!" });
    }
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
    console.log('here')
    let pageSize = +req.query.pagesize;
    if (!pageSize) pageSize = 100;
    const role = req.userData.role;
    console.log(role, 'role')
    const userId = req.userData.userId
    const site = req.userData.site
    let currentPage = +req.query.page;
    if (!currentPage) currentPage = 1;
    let orders;

    // if (['ADMIN','GENERAL MANAGER'].includes(role)) {
    //   orders = await FidoOrder.find()
    //                       .lean()
    //                       .sort({ createdAt: -1 })
    //                       .populate("customer")
    //                       .populate("creator")
    //                       .populate("terminal_id")
    //                       .skip(pageSize * (currentPage - 1))
    //                       .limit(pageSize);
      
    // } else {
      orders = await FidoOrder.find({$or: [{ site: site }, { creator: userId }]})
                          .lean()
                          .sort({ createdAt: -1 })
                          .populate("customer")
                          .populate("creator")
                          .populate("updater")
                          .populate("terminal_id")
                          .skip(pageSize * (currentPage - 1))
                          .limit(pageSize);
                          
    // }
    return res.status(200).json({
      message: "Orders fetched successfully!",
      fidoorders: orders,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: "Fetching fidoorders failed! " + error,
    });
  }
  
});

router.get("/getByOrderId", checkAuth, async (req, res, next) => {
  // if you are an ordinary user, you only see orders created in your site or by you
  try {
    const {searchTerm} = req.query;
    console.log(searchTerm, 'searchTerm')
    let pageSize = +req.query.pagesize;
    if (!pageSize) pageSize = 100;
    const role = req.userData.role;
    const userId = req.userData.userId
    const site = req.userData.site
    let currentPage = +req.query.page;
    if (!currentPage) currentPage = 1;
    let orders;
    // to be completed
      orders = await FidoOrder.find({ fidoOrderId: parseInt(searchTerm)} )
                          .lean()
                          .populate("customer")
                          .populate("creator")
                          .populate("updater")
                          .populate("terminal_id")
                          
    return res.status(200).json({
      message: "Order by id fetched successfully!",
      fidoorders: orders,
    });
  } catch (error) {
    res.status(500).json({
      message: "Fetching fidoorder by id failed! " + error,
    });
  }
  
});

router.post("/eodOrders", checkAuth, async (req, res, next) => {
  // if you are an ordinary user, you only see orders created in your site or by you
  
  return res.status(401).json({
    message: " Not Sent! Automated",
  });
  
  try {
    const allowed = ['ADMIN', 'GENEAL MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT',  'MANAGER'];

    if (!allowed.includes(req.userData.role)) {
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
      // await json2excel(orders, req.userData.site);
      // const mailOut =  await mail.sendEodOrders(orders, req.userData);

      return res.status(200).json({
        message: "Orders Sent successfully!",
        // fidoorders: orders,
      });
    } else {
      return res.status(401).json({
        message: " Null Orders. Not Sent!",
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

    // start of today
    var start = moment().startOf("day").toDate();

    // end today
    var end = moment(start).endOf("day").toDate();

    // by user today
    let orders =  await FidoOrder.find({trans_date: { $gte: start, $lte: end },$or: [{ site: site }, { creator: userId }]}) .lean()
    .sort({trans_date:-1})
    .populate('creator')
    .populate('updater')
    .populate('customer')
    .populate('terminal_id')

    orders = orders.map((o) => {
      if (!o.acquirer) {
        o.acquirer = 'CASH';
      }
      return o;
    })
    // const products = orders.map(o=>o.products );
    // const sites = orders.map(o=>o.site );
    // console.log(orders[0], products[0], sites[0])

    res.status(200).json({message: 'Orders fetched successfully', fidoorders:orders})

  } catch (error) {
    console.log(error)
    return res.status(500).json({message: 'Error fetching orders - ' + error})
  }
})

router.get("/bydate", checkAuth, async (req, res, next) => {
 
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
  try {
    const alloweds = req.userData.role;
    const allowedStaff = ['ADMIN', 'GENEAL MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT', 'MANAGER', 'SECRETARY', 'POS OFFICER', 'SUPERVISOR'];

    if (!allowedStaff.includes(alloweds)) {
      return 
      // res.status(500).json({ message: "Not allowed to summarise " + req.userData.role});
    }

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
    const site = req.userData.site;

    if (recSummary) {
      // if (!['ADMIN', 'MANAGER', 'GENERAL MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT'].includes(req.userData.role) ) {
      //   return;
      // }

      let aggData = await Pipeline(yesterdayStart, yesterdayEnd, site);
      // console.log(aggData, 'summary aggData')

      // bring out the ._id
      // await FidoOrder.populate(aggData, {path: "customer"});
      aggData = aggData.map((a) => {
        return {
          ...a._id,
          totalSalesAmount: a.totalSalesAmount.toLocaleString(),
          totalQty: a.totalQty.toLocaleString(),
        };
      });

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

router.get("/summaryByCustomer", checkAuth, async (req, res, next) => {
  try {

    const allowedStaff = ['ADMIN', 'GENEAL MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT', 'MANAGER', 'SECRETARY', 'POS OFFICER', 'SUPERVISOR'];
    if (!allowedStaff.includes(req.userData.role)) {
      return;
    }
    

    let { type, date, day, month, year,  site, product} = req.query;
    let product2;
    let new2OldProducts = 
      {
        'Pure Water': "Fido Pure Water",
        '75cl Crate': "75Cl Crate",
        '60cl Crate': "60Cl Crate",
        'Nylon Waste': "Nylon Wastes",
        '19L Dispenser Refill': "19L Dispenser",
        '19L Dispenser Replace': "19L Dispenser",
        'INCENTIVE': "INCENTIVE",
        '50cl Crate': "50Cl Crate",
        'FIAFIA WATER': "FIAFIA WATER"
      };
      const cutOffDate = new Date(2022,06,01);
      let aggData, aggObject2;
    // console.log(type, day, month, year, site,  new2OldProducts[product]);

      if (new Date(date) < new Date(cutOffDate))  {
        //  format products and then use RecUploads
        product2 = new2OldProducts[product] // Recuploads stored products in old format

      }

    // CUTOFF DATE  = 01/07/2022 -> JULY 1, 2022. ANY DATE PRIOR, USE RECUPLOADS
    /*
    { name: "Fido Pure Water" },
    { name: "19L Dispenser" },
    { name: "50Cl Crate" },
    { name: "75Cl Crate" },
    { name: "Cones" },
    { name: "Nylon Wastes" },
    { name: "60Cl Crate" },
    { name: "6inch Block" },
    { name: "9inch Block" },
    { name: "Tile" },
    */
    // const yesterdayStart = moment()
    //   .subtract(1, "days")
    //   .startOf("day")
    //   .toDate();
    // const yesterdayEnd = moment().subtract(0, "days").endOf("day").toDate();
    // // start of today
    // var start = moment().startOf("day").toDate();

    // // end today
    // var end = moment(start).endOf("day").toDate();

    // const site = req.userData.site;
     
    if (date) {
      if (type ==='yearly') {
        let yearInt = parseInt(year);
        let aggObject = {
          yearInt,
          site,
          product,
        };
        
        if (year < 2022 ) {
          // if (new Date(date) < new Date(cutOffDate) ) {
            aggObject2 = {
            yearInt,
            site,
            product: product2,
          };
          
          aggData = await Utils.yearRecAgg(aggObject2);

          // if (year === 2022) {
          //   // year the shopping system was introduced
          //   let aggData2 = await Utils.yearOrderAgg(aggObject);
          //   //  merge two array
          //   console.log
          //   aggData = sumArrayOfObjects(aggData, aggData2)

          // } else {
          //   aggData = await Utils.yearRecAgg(aggObject2);
          // }
        } else {
          aggData = await Utils.yearOrderAgg(aggObject);
        }
        
        // aggData = aggData.filter(a => a._id.product === product);
        aggData = aggData.map((a) => {

          return {
            ...a._id,
            totalSalesAmount: a.totalSalesAmount,
            totalQty: a.totalQty,
          };
        });

        if (aggData) {
          return res.status(200).json({
            message: "top sales for week",
            records: aggData,
          });
        }
        return res.status(500).json({ message: "aggregate error: " });
      }

      if (type ==='monthly') {

        let yearInt = parseInt(year);
        let monthInt = parseInt(month);
        const aggObject = {
          yearInt,
          monthInt,
          site,
          product,
        };

        if (new Date(date) < new Date(cutOffDate)) {
          aggObject2 = {
            yearInt,
            monthInt,
            site,
            product: product2,
          };
         

          aggData = await Utils.monthRecAgg(aggObject2);
          // console.log('in monthly agg2', aggData)
        } else {
          aggData = await Utils.monthOrderAgg(aggObject);
        }
  
        // console.log(aggData)
        // aggData = aggData.filter(a => a._id.product === product);
        aggData = aggData.map((a) => {

          return {
            ...a._id,
            totalSalesAmount: a.totalSalesAmount,
            totalQty: a.totalQty,
          };
        });

        if (aggData) {
         
          return res.status(200).json({
            message: "top  sales for week",
            records: aggData,
          });
        }
  
        return res.status(500).json({ message: "aggregate error: " });
      }

      if (type ==='weekly') {

          const weekInt = fns.format(new Date(date), 'ww');
          let yearInt = parseInt(year);
          const aggObject = {
            weekInt: weekInt-1,
            yearInt,
            site,
            date,
            product,
          };
    
          // let aggData = await Utils.weekOrderAgg(aggObject);

          if (new Date(date) < new Date(cutOffDate)) {
            aggObject2 = {
              yearInt,
              weekInt: weekInt-1,
              site,
              date,
              product: product2,
            };
           
  
            aggData = await Utils.weekRecAgg(aggObject2);
            // console.log('in weekly agg2', aggData)
          } else {
            aggData = await Utils.weekOrderAgg(aggObject);
          }
          // console.log(aggData)
          // aggData = aggData.filter(a => a._id.product === product);
          aggData = aggData.map((a) => {

            return {
              ...a._id,
              totalSalesAmount: a.totalSalesAmount,
              totalQty: a.totalQty,
            };
          });

          if (aggData) {
           
            return res.status(200).json({
              message: "top  sales for week",
              records: aggData,
            });
          }
    
          return res.status(500).json({ message: "aggregate error: " });
      }

      if (type =='daily') {
        let ddate = new Date(date);
        var start = moment(ddate).startOf("day").toDate();
        // end day
        var end = moment(ddate).endOf("day").toDate();
        let yearInt = parseInt(year);
        let monthInt = parseInt(month);

        const aggObject = {
          dayInt: parseInt(day),
          yearInt,
          monthInt,
          site,
          product,
        };

        if (new Date(date) < new Date(cutOffDate)) {
          aggObject2 = {
            yearInt,
            monthInt,
            dayInt: parseInt(day),
            site,
            product: product2,
          };
         

          aggData = await Utils.dayRecAgg(aggObject2);
          console.log('in day agg2', aggData[0])
        } else {
          // aggData = await PipelineCustomer(start, end, site,product);
          aggData = await Utils.dayOrderAgg(aggObject);
          console.log('in day agg', aggData[0])
        }


        // let aggData = await PipelineCustomer(start, end, site,product);
        // console.log(aggData, 'summary aggData by customer')

        // bring out the ._id
        // aggData = aggData.filter(a => a.product === product);
        aggData = aggData.map((a) => {

          return {
            ...a._id,
            totalSalesAmount: a.totalSalesAmount,
            totalQty: a.totalQty,
          };
        });

        if (aggData) {
          return res.status(200).json({ records: aggData });
        } else {
          return res
            .status(500)
            .json({ message: "Error with fidoOrder summary" });
        }
      }
     
    } else {
      console.log ('date needed')
      throw error;
    }
    
  } catch (err) {
    console.log(err)
    return res
      .status(500)
      .json({ message: "Server Error with fidoOrder summary try block" + err });
  }
});

router.get('/todaySummary', checkAuth, async(req,res, next) => {

  
  try {
    const role = req.userData.role; 
    const allowed = ['ADMIN', 'GENERAL MANAGER', 'MANAGER', 'SNR ACCOUNTANT', 'ACCOUNTANT', 'SECRETARY',  'SUPERVISOR'];
    if (!allowed.includes(role)) {
      return;
    }

    // start of today
    var start = moment().startOf("day").toDate();

    // end today
    var end = moment(start).endOf("day").toDate();
    let summary = null;
    let summ = [];
    let orders
    const topStaff=['ADMIN', 'SNR ACCOUNTANT', 'GENERAL MANAGER'];
    let sites = ['AKENFA', 'SWALI', 'KPANSIA', 'YENEGWE', 'OKUTUKUTU', 'KPANSIA E', 'OBUNNA']

    if (topStaff.includes(role)) {
      sites.forEach( async site =>  {
        orders = await FidoOrder.find({trans_date: { $gte: start, $lte: end }, site: site })
        .lean()
        .sort({trans_date:-1})
        .populate('creator')
        .populate('updater')
        .populate('customer')
        .populate('terminal_id')
        // console.log(orders, 'orders')
        if (orders && orders.length) {
          summary = await summarizeSiteOrders(orders,site)
          summ = [...summ, summary]
         

        }
       
        
      })
      

    } else {
      // get today orders for this site
      let site = req.userData.site; 
     orders = await FidoOrder.find({trans_date: { $gte: start, $lte: end }, site: site })
     .lean()
     .sort({trans_date:-1})
     .populate('creator')
     .populate('updater')
     .populate('customer')
     .populate('terminal_id')
     if (orders && orders.length) {
      summary = await summarizeSiteOrders(orders,site)
      summ = [...summ, summary]

     }
    }

    setTimeout(() => {
      return res.status(200).json({message: 'Orders fetched successfully', summaries: summ})
      
      }, 1000);
 
  } catch (error) {
    console.log(error)
    return res.status(500).json({message: 'Error summarizing today orders - ' + error})
  }
  finally {
    // console.log(summ, 'SUMMARIES 3')

   
  }

})

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

async function summarizeSiteOrders(orders, site) {
    if (orders && orders.length) {
      let header = Object.keys(orders[0]);

      let orderRow
      let orderArr = [];
      let sn = 1;
      let bankVal;
      //  combine acquirer and payment method
      

      orders.forEach(row => {
      let products = []

      header.forEach(field => {
        if( field === 'fidoOrderId' ) {
          orderRow = {...orderRow, "ORDER ID": row[field]}
        }

        if( field === 'customer' ) {
          if ( row[field] && row[field].name)
            orderRow = {...orderRow, CUSTOMER: row[field].name}
        }

        if( field === 'orderType' ) {
          orderRow = {...orderRow, orderType: row[field]}
        }

        if( field === 'action_taken' ) {
          orderRow = {...orderRow, "ACTION TAKEN": row[field]}
        }

        if( field === 'trans_date' ) {
          orderRow = {...orderRow, "INVOICE DATE": new Date(row[field]).toLocaleDateString('en-GB')}
        }

        if( field === 'creator' ) {
          if ( row[field] && row[field].name)
            orderRow = {...orderRow, USER: row[field].name}
        }


        if( field === 'paidAmount' ) {
          orderRow = {...orderRow, AMT_PAID: row[field]}
        }

        if( field === 'txn_amount' ) {
          orderRow = {...orderRow, AMT_TOTAL: row[field], AMOUNT: row[field]}
        }

        if( field === 'terminal_location' ) {
          orderRow = {...orderRow, LOCATION: row[field]}
        }

        if( (field == 'paymentMethod')  ) {
          orderRow = {...orderRow, "PAYMENT METHOD": row[field] }
        }

        if( (field == 'PAYBANK')  ) {
          orderRow = {...orderRow, "PAYBANK": row[field] }
        }



        if( field === 'teller_id' ) {
          orderRow = {...orderRow, "TELLER NO": row[field]}
        }

        if( field === 'date_teller' ) {
          orderRow = {...orderRow, "TELLER DATE": row[field]}
        }

        if( field === 'acquirer' ) {
          orderRow = {...orderRow, "BANK": row[field] + ' (NGN)'}
        }

        if( field === 'amt_teller' ) {
          orderRow = {...orderRow, "TELLER AMOUNT": row[field]}
        }

        if( field === 'auth_id' ) {
          orderRow = {...orderRow, "AUTH_ID": row[field]}
        }

        if( field === 'rrn' ) {
          orderRow = {...orderRow, "RRN": row[field]}
        }

        if( field === 'tx_ref' ) {
          orderRow = {...orderRow, "TX_REF": row[field]}
        }

        if( field === 'transfer_from_account_name' ) {
          orderRow = {...orderRow, "transfer_from_account_name": row[field]}
        }

        if( field === 'transfer_from_bank' ) {
          orderRow = {...orderRow, "transfer_from_bank": row[field]}
        }

        if( field === 'company' ) {
          orderRow = {...orderRow, "COMPANY": row[field]}
        }

        if ( field === 'status' ) {
          orderRow = {...orderRow, STATUS: row[field]}
        }

        if( field === 'products' ) {
          // create new products object to convert multiple products to multiple orders
          row[field].map(p => {
            products = [...products, {name: p.name , qty:p.qty, price: p.price}]

          })
        }
      })
      // convert multiple products to multiple orders
      products.map(p => {
        orderArr.push({SN: sn, ...orderRow, PRODUCT: PRODUCTNAME[p.name] , QTY:p.qty, RATE: p.price, AMT_TOTAL:p.qty*p.price,
        AMOUNT:p.qty*p.price, 
        AMT_PAID:p.qty*p.price})
        sn = sn + 1;
      })

    
    })
    orderArr = orderArr.map(o => {
      if (o['PAYMENT METHOD'] !== 'CASH') {
        return {...o, 'PAYMENT METHOD':o['PAYMENT METHOD'] + '-' + o['BANK'] }

      }
      else {
        return {...o, 'PAYMENT METHOD': o['BANK']}
      }
    })
    // console.log(orderArr, 'orderArr')

    const productSummary = summarize(orderArr,'PRODUCT');
    const paymentSummary = summarize(orderArr,'PAYMENT METHOD');
    // const bankSummary = summarize(orderArr,'BANK');
    summary = {productSummary, paymentSummary, site };

  } else {
    summary = {}
  }
  return summary;
}

async function Pipeline(start, end, site) {
  const pipeline = [
    {
      $match: {
        // action_taken: "PRODUCT RELEASED",
        orderType: "NORMAL",
        trans_date: { $gte: start, $lte: end },
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
          date: {$dateToString:{format: "%d-%m-%Y", date: "$trans_date"}},
         
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

async function PipelineCustomer(start, end, site,  product) {
  // to redo and return totals per customer per site per date
  const pipeline = [
    {
      $match: {
        // action_taken: "PRODUCT RELEASED",
        orderType: "NORMAL",
        trans_date: { $gte: start, $lte: end },
        site: site,
       
      },
    },
    {
      $unwind: {
        path: "$products",
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
      $unwind: {
        path: "$customer",
      },
    },
    
    {
      $group: {
        _id: {
          date: {$dateToString:{format: "%d-%m-%Y", date: "$trans_date"}},
         
          product: "$products.name",
          site: "$site",
          customer: "$customer.name"
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
        // "_id.customer": -1,
        // "_id.date": -1,
        // "_id.site": 1,
        // "_id.product": 1,

        totalQty: -1,
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
    //         "_id.orderType": "NORMAL",
    //       },
    //     ],
    //   },
    // },

    {$project: {
      
      site:"$_id.site",
      date:"$_id.date",
      customer:"$_id.customer",
      product:"$_id.product",
      totalQty: "$totalQty",
      totalSalesAmount: "$totalSalesAmount"

    }}
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

function summarize(orderArr, val) {
  const summaryByProdct = [{name:val,qty:null,amount:null}]
  const grpArr = _groupBy(orderArr, val);
  Object.keys(grpArr).map(k => {
    const QTY = sumToField(grpArr[k],'QTY' );
    const AMT = sumToField(grpArr[k],'AMOUNT' );
    summaryByProdct.push({name:k, qty:QTY, amount:AMT});
  })
  return summaryByProdct;
}

function sumArrayOfObjects(a, b ) {
  // utility function to sum to object values (without the id)
  const sumItem = ({  ...a }, b) => ({
    
    ...Object.keys(a)
      .reduce((r, k) => ({ ...r, [k]: a[k] + b[k] }), {})
  });

  const sumObjectsByKey = (...arrs) => [...
    [].concat(...arrs) // combine the arrays
    .reduce((m, o) => // retuce the combined arrays to a Map
      m.set(o.id, // if add the item to the Map
        m.has(o.id) ? sumItem(m.get(o.id), o) : { ...o } // if the item exists in Map, sum the current item with the one in the Map. If not, add a clone of the current item to the Map
      )
    , new Map).values()]

    return sumObjectsByKey;
}

_groupBy = (array, key) => {
  return _.groupBy(array, key);
};

function sumToField(arr,field){
  let sum = 0;
  arr.map(a => {
    sum += a[field]
  })
  return sum;
}

function todayAggregate() {
  db.collection.aggregate([
    {
      "$match": {
        "$expr": {
          "$and": [
            {
              "$gte": [
                "$$NOW",
                "$start_date"
              ]
            },
            {
              "$lte": [
                "$$NOW",
                {
                  "$dateAdd": {
                    "startDate": "$start_date",
                    "unit": "week",
                    "amount": "$type_quantity"
                  }
                }
              ]
            }
          ]
        }
      }
    }
  ])
}

module.exports = router;
