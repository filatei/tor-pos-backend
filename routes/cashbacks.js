// const express = require("express");
// const CashBack = require("../models/cashback");
// const User = require("../models/user");
// const router = express.Router();
// const path = require("path");
// const fs = require("fs");
// const os = require("os");
// const hostname = os.hostname();
// var multer = require("multer");
// const DIR = "/var/www/uploads/cashbackimages/";

// const MIME_TYPE_MAP = {
//   "image/png": "png",
//   "image/jpeg": "jpeg",
//   "image/jpg": "jpg",
//   "application/pdf": "pdf",
//   "application/vnd.ms-excel": "xls",
//   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
// };
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, DIR);
//   },
//   filename: (req, file, cb) => {
//     const fileName =
//       new Date().getTime() +
//       "-" +
//       file.originalname.toLowerCase().split(" ").join("-") +
//       "." +
//       MIME_TYPE_MAP[file.mimetype];
//     cb(null, fileName);
//   },
// });

// // Multer Mime Type Validation
// var upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 1024 * 1024 * 1,
//   },
//   fileFilter: (req, file, cb) => {
//     if (
//       file.mimetype == "image/gif" ||
//       file.mimetype == "image/png" ||
//       file.mimetype == "image/jpg" ||
//       file.mimetype == "image/jpeg"
//     ) {
//       cb(null, true);
//     } else {
//       cb(null, false);
//       return cb(new Error("Only .gif, .png, .jpg and .jpeg format allowed!"));
//     }
//   },
// });

// const checkAuth = require("../middleware/check-auth");
// const Accesslog = require("../models/accesslog");

// router.post("", checkAuth, upload.single("image"), async (req, res, next) => {
//   let myPath = "";
//   let url = "";
//   let prodObj = req.body;
//   const role = req.userData.role;
//   const alloweds = ["ADMIN", "MANAGER", "GENERAL MANAGER", "SNR ACCOUNTANT"];
//   if (!alloweds.includes(role)) {
//     return res.status(500).json({
//       message: "Creating a cashback failed! " + error,
//     });
//   }

//   prodObj.price = parseFloat(prodObj.price);
//   prodObj.taxRate = parseFloat(prodObj.taxRate) || 0;

//   if (req.file) {
//     if (hostname.includes("torama")) {
//       url = "https://fido-api.torama.ng";
//     } else {
//       url = req.protocol + "://" + req.get("host");
//     }

//     myPath = url + "/" + req.file.path.split("/var/www/")[1];
//     prodObj.paymentProofImage = myPath;
//     console.log(myPath, "myPath");
//   }

//   prodObj.creator = await User.findOne({ userId: req.userData.userId })._id;

//   const cashback = new CashBack(prodObj);

//   cashback
//     .save()
//     .then((result) => {
//       res.status(201).json({
//         message: "CashBack added successfully",
//         cashback: { ...result, id: result._id },
//       });
//     })
//     .catch((error) => {
//       res.status(500).json({
//         message: "Creating a cashback failed! " + error,
//       });
//     });
// });

// router.put("/:id", checkAuth, upload.single("image"), (req, res, next) => {
//   try {
//     const role = req.userData.role;
//     const alloweds = [
//       "ADMIN",
//       "MANAGER",
//       "GENERAL MANAGER",
//       "SNR ACCOUNTANT",
//       "ACCOUNTANT",
//       "SECRETARY",
//     ];
//     if (!alloweds.includes(role)) {
//       return res.status(500).json({
//         message: "Not Authorized to update cashback! " ,
//       });
//     }
//     let myPath = "";
//     let url = "";
//     let prodObj = req.body;

//     const id = req.params.id;
//     prodObj._id = req.params.id;
//     prodObj.updatedBy = req.userData.userId;
//     const cashback = new CashBack(prodObj);
//     if (req.file) {
//       if (hostname.includes("torama")) {
//         url = "https://fido-api.torama.ng";
//       } else {
//         url = req.protocol + "://" + req.get("host");
//       }

//       myPath = url + "/" + req.file.path.split("/var/www/")[1];
//       cashback.paymentProofImage = myPath;
//       CashBack.updateOne({ _id: req.params.id }, cashback)
//         .then((result) => {
//             if (result.n > 0) {
//                 console.log(result, "result1")
//             res.status(200).json({ message: "Update successful!" });
//           } else {
//             res.status(401).json({ message: "Not authorized!" });
//           }
//         })
//         .catch((error) => {
//           res.status(500).json({
//             message: "Couldn't udpate cashback! " + error,
//           });
//         });
//     } else {
//       ;
//       CashBack.updateOne({ _id: req.params.id }, cashback)
//         .then((result) => {
//             if (result.n > 0) {
//                 console.log(result, "result2")
//             res.status(200).json({ message: "Update successful!" });
//           } else {
//             res.status(401).json({ message: "Not authorized!" });
//           }
//         })
//         .catch((error) => {
//           res.status(500).json({
//             message: "Couldn't update cashback! " + error,
//           });
//         });
//     }
//   } catch (err) {
//     console.log(err);
//   }
// });

// router.delete("/:id", checkAuth, (req, res, next) => {
//   const alloweds = process.env.DELALLOWEDS;

//   if (!alloweds.includes(req.userData.email)) {
//     return res.status(500).json({ message: "Not allowed" });
//   }

//   let filePath;
//   CashBack.findById(req.params.id)
//     .then((cashback) => {
//       if (cashback && cashback.icon) {
//         filePath = "uploads/" + cashback.icon.split("/uploads/")[1];
//         console.log(filePath);
//       }
//     })
//     .catch((err) => {
//       return res
//         .status(401)
//         .json({ message: "cashback not found in db!" + err });
//     });
//   CashBack.deleteOne({ _id: req.params.id })
//     .then((result) => {
//       if (result.n > 0) {
//         // delete cashback.icon
//         if (filePath) {
//           fs.unlink(filePath, (err) => {
//             if (err) {
//               console.error(err);
//             } else {
//               console.log("related file deleted");
//             }
//           });
//         }
//         res.status(200).json({ message: "Deletion successful!" });
//       } else {
//         res.status(401).json({ message: "Not authorized!" });
//       }
//     })
//     .catch((error) => {
//       console.error(error);
//       res.status(500).json({
//         message: "Deleting cashback failed! " + error,
//       });
//     });
// });

// router.get("", (req, res, next) => {
//   const pageSize = +req.query.pagesize;
//   const currentPage = +req.query.page;
//   const cashbackQuery = CashBack.find().populate("customerId");
//   if (pageSize && currentPage) {
//     cashbackQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
//   }
//   cashbackQuery
//     .then((documents) => {
//       // console.log(documents, 'cashbacks')
//       res.status(200).json({
//         message: "CashBacks fetched successfully!",
//         cashbacks: documents,
//       });
//     })
//     .catch((error) => {
//       res.status(500).json({
//         message: "Fetching cashbacks failed! " + error,
//       });
//     });
// });

// router.get("/:id", (req, res, next) => {
//   CashBack.findById(req.params.id)
//     .populate("customerId")
//     .then((cashback) => {
//       if (cashback) {
//         res.status(200).json(cashback);
//       } else {
//         res.status(404).json({ message: "cashback not found!" });
//       }
//     })
//     .catch((error) => {
//       res.status(500).json({
//         message: "Fetching cashback failed! " + error,
//       });
//     });
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const CashBack = require('../models/cashback'); // your cashback model

// Multer Configuration
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// PUT Route
router.put('/:id', upload.single('paymentProofImage'), async (req, res) => {
    const { id } = req.params;
    console.log(req.file?.path, "req.file.path")

  try {
    const updatedCashback = await CashBack.findByIdAndUpdate(
      id,
      {
        ...req.body,
        paymentProofImage: req?.file?.path
      },
      { new: true } // returns the updated document
    );
      console.log(updatedCashback, "updatedCashback")

    if (!updatedCashback) {
      return res.status(404).json({ message: 'Cashback not found.' });
    }
      return res.status(200).json({ record: updatedCashback, message: 'Cashback updated successfully.'});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;

