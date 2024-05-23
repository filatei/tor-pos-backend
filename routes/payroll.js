const express = require("express");
const mongoose = require("mongoose");

const Payroll = require("../models/payroll");
const Site = require("../models/site");
const People = require("../models/people");
const router = express.Router();
const fs = require("fs");
const path = require('path');
const os = require("os");
const hostname = os.hostname();
const csv = require("fast-csv");
const Mail = require("../mail");
const Payrollgrpbyyrmonthstatus = require("../models/payrollgrpbyyrmonthstatus");
const payrollAggregations = require("../utils/payroll-aggregations");
const xlsx = require('xlsx');

const ALLOWED_SHEET_NAMES = ['LOADERS', 'BAGGERS', 'REGULAR'];
const UPLOAD_DIR = '/var/www/uploads'; // Ensure this directory exists and is writable

// const ALLOWED_PAY_TYPES = ['MONTH-END', 'MID-MONTH', 'OTHER'];
const monthOrder = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];


const monthToNumber = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};

var multer = require("multer");

const allowedExtensions = ["xls", "xlsx"];
const MIME_TYPE_MAP = {
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',

};

const multerConfig = require("../config/multer-config");
const DIR = "/var/www/uploads/payrollimages/";
const upload2 = multerConfig(DIR);

const csvDIR = "/tmp/csv/";
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

const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId;
    try {
      if (!fs.existsSync(csvDIR)) {
        fs.mkdirSync(csvDIR, { recursive: true });
      }
    } catch (err) {
      throw err;
    }
    cb(null, csvDIR);
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
    fileSize: 1024 * 1024 * 10,
  },
  fileFilter: (req, file, cb) => {
    // console.log(file.mimetype)
    if (file.mimetype in MIME_TYPE_MAP) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error(`Only ${allowedExtensions} format allowed!`));
    }
  },
});

var csvUpload = multer({
  storage: csvStorage,
  limits: {
    fileSize: 1024 * 1024 * 10,
  },
  fileFilter: (req, file, cb) => {
    // console.log(file.mimetype)
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "text/csv" ||
      file.mimetype == "application/xls" ||
      file.mimetype == "application/vnd.ms-excel" ||
      file.mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .png or .jpg or csv format allowed!"));
    }
  },
});

function getBusinessDatesCount(startDate, endDate) {
  const s = new Date(startDate);
  const e = new Date(endDate);

  let count = 0;
  const curDate = new Date(s.getTime());
  while (curDate <= e) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0) count++;
    curDate.setDate(curDate.getDate() + 1);
  }
  // alert(count);
  return count;
}

const checkAuth = require("../middleware/check-auth");
const e = require("express");
const { get } = require("lodash");

router.post("", checkAuth, async (req, res, next) => {
  try {
    const { role, userId } = req.userData;

    if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
      return res.status(500).json({
        message: "Fetching payrolls failed! Not Allowed ",
      });
    }

    let payObj = req.body;
    if (!payObj.payStartDate || !payObj.payEndDate) {
      return res.status(500).json({
        message: " Pay Start Date and End Date required",
      });
    }

    payObj.creator = req.userData.userId;
    payObj.year = +payObj.year;
    payObj.status = "UNPAID";
    payObj.grossPay = +payObj.grossPay || 0;
    payObj.deductions = +payObj.deductions || 0;
    payObj.payeeTax = +payObj.payeeTax;
    payObj.bagsBagged = +payObj.bagsBagged;
    payObj.bagsLoaded = +payObj.bagsLoaded;
    payObj.salaryAdvance = +payObj.salaryAdvance;
    payObj.daysAbsent = +payObj.daysAbsent;

    if (payObj.daysAbsent) {
      const totalDays = getBusinessDatesCount(
        payObj.payStartDate,
        payObj.payEndDate
      );
      payObj.totalWorkDaysInMonth = totalDays;
      payObj.deductions += (payObj.daysAbsent / totalDays) * payObj.baseSalary;
    }

    if (payObj.bagsBagged && payObj.payType === "MONTH-END") {
      payObj.grossPay += payObj.bagsBagged * 2.5;
    }

    if (payObj.bagsBagged && payObj.payType === "MID-MONTH") {
      payObj.grossPay += payObj.bagsBagged * 0.5;
    }

    if (payObj.bagsLoaded && payObj.payType === "MONTH-END") {
      payObj.grossPay += payObj.bagsLoaded * 2;
    }

    if (payObj.bagsLoaded && payObj.payType === "MID-MONTH") {
      payObj.grossPay += payObj.bagsLoaded * 0.5;
    }

    if (payObj.baseSalary) {
      payObj.grossPay += +payObj.baseSalary;
    }

    payObj.netPay =
      payObj.grossPay -
      payObj.deductions -
      payObj.payeeTax -
      payObj.salaryAdvance;

    if (payObj.netPay <= 0) {
      return res.status(500).json({
        message:
          "netPay is zero or negative: " + payObj.netPay + " " + payObj.type,
      });
    }

    Object.entries(payObj).forEach(([key, value]) => {
      if (
        !value ||
        value === undefined ||
        value === null ||
        value === "null" ||
        value === "undefined"
      ) {
        delete payObj[key];
      }
    });

    payObj.payeeMonthYrType =
      payObj.payee + payObj.month + payObj.year + payObj.payType;

    payObj.remarks = "PAY ADD - " + payObj.payeeMonthYrType;

    // console.log(dObj);
    let prl = new Payroll(payObj);
    const saved = await prl.save();

    if (saved) {
      const mail = await Mail.sendPayrollMail(saved);

      return res.status(201).json({
        message: "payroll Uploaded successfully",
      });
    } else {
      return res.status(500).json({
        message: "Creating a Payroll failed!",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Try error! " + error,
    });
  }
});

router.post("/deleteAll", checkAuth, async (req, res, next) => {
  const { role, userID } = req.userData;

  if (role !== "ADMIN") {
    return res.status(500).json({ message: "Only Admin Allowed to Delete" });
  }

  const { ids } = req.body;
  //  if status is PAID, dont delete
  const payrolls = await Payroll.find({ _id: { $in: ids } });
  const allowedIds = payrolls
    .filter((p) => p.status !== "PAID")
    .map((pp) => pp._id);

  try {
    const deleted = await Payroll.deleteMany({ _id: { $in: allowedIds } });
    if (!deleted) {
      return res.status(500).json({
        message: " Deleting payroll failed! No Payroll with such IDs ",
      });
    }
    const len = ids.length;

    if (deleted.n > 0) {
      console.log(deleted, "deleted out of ", len);

      return res.status(200).json({
        message: `Deleted Successfully: ${deleted.deletedCount} records out of ${len}`,
      });
    } else {
      return res.status(401).json({
        message: ` ${deleted.deletedCount} records out of ${len} affected. Make sure status is not PAID`,
      });
    }
  } catch (error) {
    console.error(error, "catch err");
    return res.status(500).json({
      message: "TryCatch: Deleting payroll failed! " + error,
    });
  }
});

router.post("/updatePayStatus", checkAuth, async (req, res, next) => {
  const { role, userId } = req.userData;

  if (role !== "ADMIN") {
    return res.status(500).json({ message: "Only Admin Allowed to update" });
  }

  const { ids } = req.body;
  const { status } = req.query;
  try {
    const updateAll = await Payroll.updateMany(
      { _id: { $in: ids } },
      { status: status, updater: userId }
    );
    if (!updateAll) {
      return res.status(500).json({
        message: " Updating payrolls failed! No Payroll with such IDs ",
      });
    }

    if (updateAll.n > 0) {
      return res.status(200).json({
        message: `updated Successfully: ${updateAll.nModified} records`,
      });
    } else {
      return res.status(401).json({
        message: " zero record updated! ",
      });
    }
  } catch (error) {
    console.error(error, "catch err");
    return res.status(500).json({
      message: "TryCatch: updating payroll failed! " + error,
    });
  }
});

router.post(
  "/csv",
  checkAuth,
  csvUpload.any(),
  async function (req, res, next) {
    let insertedIDs = [];
    try {
      const { role, userId } = req.userData;

      if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
        return res.status(500).json({
          message: "Fetching payrolls failed! Not Allowed ",
        });
      }

      let saveCounter = 0;
      const { csvUpload } = req.query;
      let exceptions = [];

      if (csvUpload === "1") {
        if (req.userData.role !== "ADMIN") {
          return res.status(500).json({
            message: "Only ADMIN users can upload CSV",
          });
        }

        const oldPayrollsCount = await Payroll.countDocuments();

        let inserted, fPath;
        let prl = [];

        if (req.files) {
          fPath = req.files[0].path;
        }

        fs.createReadStream(fPath)
          .pipe(csv.parse({ headers: true }))
          .on("error", (error) => {
            console.error(error);
            return res
              .status(500)
              .json({ message: "fs createReadStream error! " + error });
          })
          .on("data", async (row) => {
            if (row["PAY TYPE"]) {
              row.payType = row["PAY TYPE"].trim();
            }

            if (!row.payType) {
              return res.status(500).json({
                message: `Pay Type (MONTH-END or MID-MONTH)  Required `,
              });
            }

            let personId;
            if (row["ID"]) {
              personId = row["ID"].trim();
              row.personId = personId;
            }

            if (!personId) {
              return res.status(500).json({
                message: "Person ID is required",
              });
            }

            const payee = await People.findOne({ people_id: personId });
            console.log(payee, "payee");

            // update payee with status ACTIVE if not active
            if (payee && !payee?.status) {
              const payeeUpdateStatus = await People.updateOne(
                { _id: payee._id },
                { status: "ACTIVE" }
              );
            }

            if (payee && payee._id) {
              row.payee = payee._id;
              row.jobName = payee.jobName;
            } else {
              console.log("ID not in db");
              throw Error("ID not in db");
              return res.status(500).json({
                message: "ID not in People DB for ID " + personId,
              });
            }

            const today = new Date();
            const months = [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ];
            if (row["PAY START DATE"]) {
              const dt = row["PAY START DATE"].split("/");
              row.payStartDate = new Date(dt[2], dt[1] - 1, dt[0]);
            } else {
              //
            }

            if (row["PAY END DATE"]) {
              const dt = row["PAY END DATE"].split("/");
              row.payEndDate = new Date(dt[2], dt[1] - 1, dt[0]);

              const months = [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ];
              row.month = months[row.payEndDate.getMonth()];
              row.year = row.payEndDate.getFullYear();
            } else {
              //
            }

            if (!row.month) {
              return res.status(500).json({
                message: `Pay Month  Required include field 'PAY START DATE' and 'PAY END DATE' `,
              });
            }

            if (!row.year) {
              return res.status(500).json({
                message: `Pay YEAR  Required include field 'PAY START DATE' and 'PAY END DATE' `,
              });
            }

            if (row["FIRST NAME"]) {
              row.name = row["FIRST NAME"].trim();
              row.fname = row["FIRST NAME"].trim();
            }

            if (row["MIDDLE NAME"]) {
              row.mname = row["MIDDLE NAME"].trim();
              row.name = row.name + " " + row.mname;
            }
            if (row["LAST NAME"]) {
              row.lname = row["LAST NAME"].trim();
              row.name = row.name + " " + row.lname;
            }

            row.grossPay = 0;
            row.netPay = 0;
            row.deductions = 0;

            if (row["EMPLOYEE TYPE"]) {
              row.empType = row["EMPLOYEE TYPE"].trim();
            }

            if (row["BASE SALARY"]) {
              row.baseSalary = +row["BASE SALARY"];
            }

            if (row["DEDUCTION"]) {
              row.deductions = +row["DEDUCTION"];
            }
            if (row["PAYEE TAX"]) {
              row.payeeTax = +row["PAYEE TAX"];
              row.deductions += row.payeeTax;
            }

            if (row["SALARY ADV"]) {
              row.salaryAdvance = +row["SALARY ADV"];
              row.deductions += row.salaryAdvance;
            }

            if (row["DAYS WORKED"]) {
              row.daysAbsent = 0;
              if (row["DAYS ABS"]) {
                row.daysAbsent = +row["DAYS ABS"];
              }

              row.daysWorked = +row["DAYS WORKED"];
              const totalDays = row.daysAbsent + row.daysWorked;
              row.totalWorkDaysInMonth = totalDays;

              if (!row.baseSalary) {
                const thisPerson = await People.findById(row.payee);
                row.baseSalary = +thisPerson.baseSalary;
              }

              if (!row.baseSalary) {
                return res.status(500).json({
                  message: `Person ${thisPerson.name} has no baseSalary set`,
                });
              }
              row.grossPay = row.baseSalary;

              row.deductions += (row.daysAbsent / totalDays) * row.baseSalary;
            }

            if (row["BANK ACCOUNT"]) {
              row.bankAccount = row["BANK ACCOUNT"]?.trim();
              const bankUpdate = await People.updateOne(
                { name: row.name },
                { bankAccount: row.bankAccount }
              );
              // if (bankUpdate) {
              //   console.log("updated bank account of", row.name, bankUpdate);
              // }
            }

            if (row["ACCOUNT NUMBER"]) {
              row.bankAccount = row["ACCOUNT NUMBER"]?.trim();
              const bankUpdate = await People.updateOne(
                { name: row.name },
                { bankAccount: row.bankAccount }
              );
              // if (bankUpdate) {
              //   // console.log("updated bank account of", row.name, bankUpdate);
              // }
            }

            if (row["COMPANY"]) {
              row.company = row["COMPANY"];
            }

            if (row["LOCATION"]) {
              if (row["LOCATION"] === "KPANSIA-E") {
                row["LOCATION"] = "KPANSIA E";
              }

              if (row["LOCATION"] === "AGADAGBA") {
                row["LOCATION"] = "AGADAGBA-BLOCKS";
              }

              const site = await Site.findOne({ name: row["LOCATION"].trim() });
              if (site) {
                row.site = site._id;
              } else {
                return res.status(500).json({ message: "SITE not Valid" });
              }
            }

            if (row["BAGS BAGGED"]) {
              // bagger
              row.bagsBagged = parseFloat(row["BAGS BAGGED"].replace(/,/g, ""));
              if (row.payType == "MONTH-END")
                row.grossPay = row.bagsBagged * 3.5;
              if (row.payType == "MID-MONTH")
                row.grossPay += row.bagsBagged * 0.5;
            }

            if (row["QTY"]) {
              // bagger
              row.bagsBagged = parseFloat(row["QTY"].replace(/,/g, ""));
              if (row.payType == "MONTH-END")
                row.grossPay += row.bagsBagged * 3.5;
              if (row.payType == "MID-MONTH")
                row.grossPay += row.bagsBagged * 0.5;
            }

            if (row["BAGS LOADED"]) {
              row.bagsLoaded = parseFloat(row["BAGS LOADED"].replace(/,/g, ""));

              if (row.payType === "MONTH-END") {
                row.grossPay += row.bagsLoaded * 3.5;
              } else if (row.payType === "MID-MONTH") {
                row.grossPay += row.bagsLoaded * 0.5;
              }
            }
            if (row.grossPay > 0) {
              row.netPay = row.grossPay - row.deductions;
            } else {
              row.netPay = 0;
            }

            row.creator = req.userData.userId;

            row.payeeMonthYrType =
              row.payee + row.month + row.year + row.payType;
            row.remarks = "via CSV Upload - " + row.payeeMonthYrType;
            row.status = "UNPAID";

            if (row.netPay === 0) {
              if (!row.bagsLoaded && !row.bagsBagged && !row["DAYS WORKED"]) {
                return res.status(500).json({
                  message: `Payee must have one of BagsLoaded or BagsBagged or Days Worked `,
                });
              }
              exceptions.push(row);
            } else {
              row.netPay = row.netPay.toFixed(2);
              row.grossPay = row.grossPay.toFixed(2);
              row.deductions = row.deductions.toFixed(2);
              if (payee.status === "ACTIVE" || !payee.status) {
                prl.push(row);
              } else {
                // exceptions.push(row);
                console.log(payee, "Status not active");
                const mail = await Mail.sendPayrollNotActive(
                  payee,
                  req.userData.userId
                );


              }
            }
          })
          .on("end", async (rowCount) => {
            setTimeout(async () => {
              console.log(`Parsed ${rowCount} rows ${prl.length}`);

              if (exceptions.length) {
                return res.status(500).json({
                  message:
                    "Error uploading Payroll " +
                    exceptions.length +
                    " exceptions !",
                });
              }

              for (let p of prl) {
                try {
                  // const { MongoError } = require('mongodb')
                  const payroll = new Payroll(p);
                  inserted = await payroll.save();
                  // console.log(inserted, 'inserted')
                  if (inserted) {
                    insertedIDs.push(inserted);
                  }
                } catch (error) {
                  console.log(
                    "message",
                    error._message,
                    "errors ",
                    error.errors,
                    p.name
                  );
                  // delete all inserted ids
                  insertedIDs.forEach((i) => {
                    console.log("deleting...", i._id, i.name);

                    Payroll.deleteOne({ _id: i._id })
                      .then(function () {
                        console.log("Data deleted"); // Success
                      })
                      .catch(function (error) {
                        console.log(error); // Failure
                      });
                  });

                  return res.status(500).json({
                    message: "Error adding Payroll " + error + " " + p.name,
                  });
                }
              }

              const newPayrollsCount = await Payroll.countDocuments();
              const diff = newPayrollsCount - oldPayrollsCount;
              console.log(
                newPayrollsCount,
                oldPayrollsCount,
                "before after rowcounts"
              );
              fs.unlink(fPath, (err) => {
                if (err) console.log(err);
                else {
                  console.log(`\nDeleted file: ${fPath}`);
                }
              });

              if (diff > 0) {
                console.log("exceptions", exceptions);
                const mail = await Mail.sendPayrollCsvMail(
                  prl,
                  req.userData.userId
                );
                return res.status(200).json({
                  message: `${insertedIDs.length} records Uploaded  from csv,   exceptions:  ${exceptions.length} `,
                  exceptions: exceptions,
                });
              } else {
                return res.status(500).json({ message: "csv not uploaded" });
              }
            }, 2000);
          });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Try error! " + error });
    }
  }
);

router.post(
  "/csvValidate",
  checkAuth,
  csvUpload.any(),
  async function (req, res, next) {
    const { role, userId } = req.userData;
    if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
      return res.status(500).json({
        message: "Fetching payrolls failed! Not Allowed ",
      });
    }

    try {
      let saveCounter = 0;
      const { csvUpload } = req.query;
      const oldPayrollsCount = await Payroll.countDocuments();
      console.log("csvValidate in Payroll");

      let inserted, fPath;
      let prl = [];
      let exceptions = [];

      if (req.files) {
        fPath = req.files[0].path;
      }

      fs.createReadStream(fPath)
        .pipe(csv.parse({ headers: true }))
        .on("error", (error) => {
          console.error(error);
          return res
            .status(500)
            .json({ message: "fs createReadStream error! " + error });
        })
        .on("data", async (row) => {
          if (!row["PAY TYPE"]) {
            row.typeRequired = "YES";
          } else if (
            !["MONTH-END", "MID-MONTH", "OTHER"].includes(row["PAY TYPE"])
          ) {
            row.typeRequired = "YES";
          }

          if (
            !row["BAGS LOADED"] &&
            !row["BAGS BAGGED"] &&
            !row["DAYS WORKED"]
          ) {
            row.bagsloadedbaggeddaysworkedrequired = "YES";
          }

          let personId;
          if (row["ID"]) {
            personId = row["ID"].trim();
          }

          if (!personId) {
            row.personIDRequired = "YES";
          }

          const payee = await People.findOne({ people_id: personId });

          // update payee with status ACTIVE if not active
          if (!payee.status) {
            const payeeUpdateStatus = await People.updateOne(
              { _id: payee._id },
              { status: "ACTIVE" }
            );
          }

          if (!payee) {
            row.payeeRequired = "YES";
          }

          const today = new Date();
          const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ];
          if (!row["PAY START DATE"]) {
            row.payStartRequired = "YES";
          }

          if (!row["PAY END DATE"]) {
            row.payEndRequired = "YES";
          }

          if (!row["FIRST NAME"]) {
            row.firstNameRequired = "YES";
          }

          if (row["LOCATION"]) {
            if (row["LOCATION"] === "KPANSIA-E") {
              row["LOCATION"] = "KPANSIA E";
            }

            if (row["LOCATION"] === "AGADAGBA") {
              row["LOCATION"] = "AGADAGBA-BLOCKS";
            }
            const site = await Site.findOne({ name: row["LOCATION"].trim() });
            if (!site) {
              row.siteRequired = "YES";
            }
          }

          if (
            row.payEndRequired ||
            row.payeeNotInDB ||
            row.firstNameRequired ||
            row.siteRequired ||
            row.payStartRequired ||
            row.personIDRequired ||
            row.bagsloadedbaggeddaysworkedrequired ||
            row.payEndRequired
          ) {
            exceptions.push(row);
          }
        })
        .on("end", async (rowCount) => {
          setTimeout(async () => {
            console.log(`Parsed ${rowCount} rows ${prl.length}`);

            fs.unlink(fPath, (err) => {
              if (err) console.log(err);
              else {
                console.log(`\nDeleted file: ${fPath}`);
              }
            });
            console.log(exceptions, "exceptions");

            return res.status(200).json({
              message: `File has ${exceptions.length} issues`,
              exceptions: exceptions,
            });
          }, 3000);
        });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Try error! " + error });
    }
  }
);


router.post('/delete', checkAuth, async (req, res) => {
  try {
    const { role } = req.userData;
    if (role !== "ADMIN") {
      return res.status(500).json({ message: "Only Admin Allowed to Delete" });
    }

    const { ids } = req.body;
    //  if status is PAID, dont delete
    const payrolls = await Payroll.find({ _id: { $in: ids } });
    const allowedIds = payrolls
      .filter((p) => p.status !== "PAID")
      .map((pp) => pp._id);


    const deleted = await Payroll.deleteMany({ _id: { $in: allowedIds } });
    console.log(deleted, 'deleted')
    res.status(200).json({ message: 'Payroll records deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting payroll records', error });
  }
});

router.put('/update', checkAuth, async (req, res) => {

  try {
    const { role } = req.userData;
    if (role !== "ADMIN") {
      return res.status(500).json({ message: "Only Admin Allowed to Update" });
    }
    
    const payroll = req.body;
    const updatedPayroll = await Payroll.findByIdAndUpdate(payroll._id, payroll, { new: true });
    res.status(200).json(updatedPayroll);
  } catch (error) {
    res.status(500).json({ message: 'Error updating payroll record', error });
  }
});

router.put('/update-status', checkAuth,  async (req, res) => {
  try {
    const { role } = req.userData;
    if (role !== "ADMIN") {
      return res.status(500).json({ message: "Only Admin Allowed to Update" });
    }

    const { ids, status } = req.body;
    const objectIds = ids.map(id => mongoose.Types.ObjectId(id));
    const result = await Payroll.updateMany({ _id: { $in: objectIds } }, { status: status });
    if (result.nModified === 0) {
      console.log('No matching payroll records found to update.')
      return res.status(404).json({ message: 'No matching payroll records found to update.' });
    }
    console.log('Payroll status updated successfully ', result);
    res.status(200).json({ message: 'Payroll status updated successfully', result });
  } catch (error) {
    res.status(500).json({ message: 'Error updating payroll status', error });
  }
});


router.put("/:id", checkAuth, upload.any(), async (req, res, next) => {
  const { role, userId } = req.userData;

  if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
    return res.status(500).json({
      message: "Fetching payrolls failed! Not Allowed ",
    });
  }
  let path = "";
  let url = "";
  let payrollObj = req.body;

  const id = req.params.id;
  payrollObj._id = id;
  payrollObj.updater = userId;
  if (payrollObj.image === "null") {
    delete payrollObj.image; // dont update image if not sent
  }
  payrollObj.netPay = +req.body.netPay;
  payrollObj.grossPay = +req.body.grossPay;
  payrollObj.deductions = +req.body.deductions;
  const payroll = new Payroll(payrollObj);

  if (req.files) {
    req.files.forEach((file) => {
      if (hostname.includes("torama.ng")) {
        url = "https://fido-api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }
      const fPath = url + "/" + file.path;
      payroll.image = fPath;
    });
  }

  // const pp = await payroll.save()

  Payroll.updateOne({ _id: req.params.id }, payroll)
    .then((result) => {
      if (result.n > 0) {
        res.status(200).json({ message: "Update successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update payroll! " + error,
      });
    });
});

router.put(
  "/notes/:id",
  checkAuth,
  upload2.single("image"),
  async function (req, res, next) {
    try {
      const roles = ["ADMIN", "SNR ACCOUNTANT", "GENERAL MANAGER"];
      if (!roles.includes(req.userData.role)) {
        return res.status(500).json({ message: "Not allowed" });
      }

      const text = req.body.text;
      const date = req.body.date;

      if (!text) {
        return res.status(500).json({
          message: "Error:  notes text Required",
        });
      }

      let recId = req.params.id;
      const author =
        req.userData.name === "Akpodigha Filatei" ? "MD" : req.userData.name;

      let myPath;

      if (req.file?.path) {
        if (hostname.includes("torama.ng")) {
          url = "https://fido-api.torama.ng";
        } else {
          url = req.protocol + "://" + req.get("host");
        }
        myPath = url + req.file.path;
        myPath = myPath.replace(/\/var\/www\/uploads/, "");
      }

      const note = { text: text, date: date, author: author };

      if (myPath) {
        note.image = myPath;
      }

      const oldPayroll = await Payroll.findById(recId).lean();
      if (!oldPayroll) {
        return res.status(500).json({ message: "No record to update! " });
      }
      if (!oldPayroll?.notes?.length) {
        oldPayroll.notes = [];
      }
      const notes = [...oldPayroll.notes, note];
      const payroll = new Payroll({ notes: notes });
      payroll._id = recId;
      payroll.updater = req.userData.userId;

      const updated = await Payroll.updateOne({ _id: req.params.id }, payroll);

      if (updated) {
        return res.status(200).json({ message: "Update successful! " });
      } else {
        return res.status(500).json({
          message: "Couldn't update Payroll! " + JSON.stringify(inserted),
        });
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "try error: Couldn't update Payroll!" + error });
    }
  }
);

router.delete("/:id", checkAuth, async (req, res, next) => {
  const { role, userID } = req.userData;
  if (role !== "ADMIN") {
    return res.status(500).json({ message: "Only Admin Allowed to Delete" });
  }

  const id = req.params.id;
  const payroll = await Payroll.findById(id);
  if (payroll.status === "PAID") {
    console.log("cant delete paid payroll");
    return res.status(500).json({
      message: " Deleting PAID payroll not allowed! Reset status ",
    });
  }

  try {
    Payroll.deleteOne({ _id: req.params.id })
      .then((result) => {
        if (result.n > 0) {
          res.status(200).json({ message: "Deletion successful!" });
        } else {
          res.status(401).json({ message: "Not Deleted!" });
        }
      })
      .catch((error) => {
        console.error(error, "catch err");
        res.status(500).json({
          message: "Deleting payroll failed! " + error,
        });
      });
  } catch (error) {
    console.error(error, "catch err");
    return res.status(500).json({
      message: "TryCatch: Deleting payroll failed! " + error,
    });
  }
});

router.get("", checkAuth, async (req, res, next) => {
  const { role } = req.userData;

  if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
    return res.status(500).json({
      message: "Fetching payrolls failed! Not Allowed ",
    });
  }
  const pageSize = +req.query.pagesize;
  const { month, year, payType } = req.query;
  const currentPage = +req.query.page;
  let payrollQuery;
  if (year && month && payType) {
    payrollQuery = Payroll.find({ month: month, year: +year, payType: payType })
      .populate("payee")
      .populate("site")
      .populate("creator", ["name", "email", "role"])
      .sort({ createdAt: -1 });
  } else {
    payrollQuery = Payroll.find()
      .populate("payee")
      .populate("site")
      .populate("creator", ["name", "email", "role"])
      .sort({ createdAt: -1 });
  }

  if (pageSize && currentPage) {
    payrollQuery.skip(pageSize * (currentPage - 1)).limit(400);
  }
  payrollQuery
    .then((documents) => {
      // sort by payee nam
      console.log(documents[0], "documents");
      if (documents?.length) {
        const payrolls = documents.sort(function (a, b) {
          var nameA = a?.payee?.name?.toUpperCase(); // ignore upper and lowercase
          var nameB = b?.payee?.name?.toUpperCase(); // ignore upper and lowercase
          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }

          // names must be equal
          return 0;
        });

        return res.status(200).json({
          message: "payrolls fetched successfully!",
          payrolls: payrolls,
        });
      } else {
        return res.status(200).json({
          message: "No Payrolls ",
          payrolls: [],
        });
      }
    })
    .catch((error) => {
      return res.status(500).json({
        message: "Fetching payrolls failed! " + error,
      });
    });
});

router.get("/monthlyPayTypes", checkAuth, async (req, res, next) => {
  const { role } = req.userData;

  if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
    return res.status(500).json({
      message: "Fetching payrolls failed! Not Allowed ",
    });
  }

  try {
    const results = await payrollAggregations.getMonthlyPayTypes();

    res.status(200).json(results);
  } catch (err) {
    console.error(err); // Log the error for your own debugging
    res.status(500).json({
      message: "Server error occurred while fetching monthly pay types",
    });
  }
});

router.get("/getYearKeys", checkAuth, async (req, res, next) => {
  try {
    const { role } = req.userData;

    if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
      return res.status(500).json({
        message: "Fetching payrolls failed! Not Allowed ",
      });
    }

    // const {getMonths, year} = req.query;
    // console.log(getMonths, year, 'getm yr')
    let pipeline, agg, yearKeys;
    pipeline = [
      {
        $addFields: {
          monthYr: {
            $concat: [
              {
                $toString: "$month",
              },
              "-",
              {
                $toString: "$year",
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            month: "$month",
            year: "$year",
            monthYr: "$monthYr",
            payType: "$payType",
            payStatus: "$status",
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 1,
        },
      },
    ];
    agg = await Payroll.aggregate(pipeline);
    monthKeys = agg.map((a) => {
      return {
        month: a._id.month,
        year: a._id.year,
        payStatus: a._id.payStatus,
        payType: a._id.payType,
      };
    });
    return res.status(200).json({ message: "Success", yearKeys: monthKeys });
  } catch (error) {
    console.log(error, "yearkeys error");
  }
});

router.get("/years", checkAuth, async (req, res) => {
  try {
    const { role } = req.userData;

    if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
      return res.status(500).json({
        message: "Fetching payrolls failed! Not Allowed ",
      });
    }
    const years = await Payroll.aggregate([
      { $group: { _id: "$year" } },
      { $sort: { _id: -1 } },
    ]);
    return res.status(200).json(years.map((year) => year._id));
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

router.post(
  "/xlsUpload",
  checkAuth,
  upload.single('file'),
  async (req, res) => {
    let insertedCount = 0;
    let skippedCount = 0;
    const errorRows = [];

    try {
      const { role, userId } = req.userData;

      if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
        return res.status(403).json({
          message: "Fetching payrolls failed! Not Allowed",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
        });
      }

      const filePath = req.file.path;
      const workbook = xlsx.readFile(filePath);

      for (const sheetName of workbook.SheetNames) {
        if (!ALLOWED_SHEET_NAMES.includes(sheetName.toUpperCase())) {
          continue;
        }

        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        const headers = data[0];
        const rows = data.slice(1);

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowData = {};

          headers.forEach((header, index) => {
            rowData[header] = row[index];
          });

          const personId = rowData['ID'];
          if (!personId) {
            console.log(`Stopping process at row ${i + 2} due to missing ID.`);
            break;
          }

          try {
            const processedRow = await processRow(rowData, req.userData.userId, i + 2, sheetName); // row number is i + 2 (accounting for headers)
            if (processedRow) {
              const exists = await Payroll.findOne({ payeeMonthYrType: processedRow.payeeMonthYrType });
              if (!exists) {
                await Payroll.create(processedRow);
                insertedCount++;
              } else {
                console.log(`Duplicate record found for ${processedRow.payeeMonthYrType}, skipping insertion.`);
                errorRows.push({ ...rowData, rowNumber: i + 2, error: 'Duplicate record' });
                skippedCount++;
              }
            }
          } catch (error) {
            errorRows.push({ ...rowData, rowNumber: i + 2, error: error.message });
            skippedCount++;
          }
        }
      }

      fs.unlink(filePath, (err) => {
        if (err) console.error('Error removing file:', err);
      });

      // Ensure the uploads directory exists
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }

      // Generate XLS file for skipped records
      const skippedWorkbook = xlsx.utils.book_new();
      const skippedWorksheet = xlsx.utils.json_to_sheet(errorRows);
      xlsx.utils.book_append_sheet(skippedWorkbook, skippedWorksheet, 'Skipped Records');
      const skippedFilePath = path.join(UPLOAD_DIR, `skipped-records-${Date.now()}.xlsx`);
      xlsx.writeFile(skippedWorkbook, skippedFilePath);

      console.log(`Inserted records: ${insertedCount}`);
      console.log(`Skipped records: ${skippedCount}`);

      return res.status(200).json({
        message: `${insertedCount} records uploaded successfully, ${skippedCount} records skipped.`,
        insertedCount,
        skippedCount,
        skippedFilePath,
        errorRows,  // Include errorRows in the response
      });

    } catch (error) {
      console.error("Error processing request:", error);
      return res.status(500).json({ message: "Error processing request: " + error.message });
    }
  }
);

function excelDateToJSDate(excelDate) {
  const date = new Date((excelDate - (25567 + 2)) * 86400 * 1000);
  const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60 * 1000));
  return utcDate;
}

function parseNumber(value) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

async function processRow(row, userId, rowNumber, sheetName) {
  try {
    const payType = row["PAY TYPE"]?.trim();
    if (!payType) throw new Error(`Pay Type (MONTH-END or MID-MONTH) Required`);

    const personId = String(row["ID"]).trim();  // Ensure personId is a string and then trim
    if (!personId) throw new Error("Person ID is required");

    const payee = await People.findOne({ people_id: personId });
    if (!payee) throw new Error("ID not in People DB for ID " + personId);

    if (!payee.status) {
      await People.updateOne({ _id: payee._id }, { status: "ACTIVE" });
    }

    const today = new Date();
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    let payStartDate, payEndDate, month, year;

    if (row["PAY START DATE"]) {
      payStartDate = excelDateToJSDate(row["PAY START DATE"]);
    }

    if (row["PAY END DATE"]) {
      payEndDate = excelDateToJSDate(row["PAY END DATE"]);
      month = months[payEndDate.getMonth()];
      year = payEndDate.getFullYear();
    }

    if (!month) throw new Error(`Pay Month Required include field 'PAY START DATE' and 'PAY END DATE'`);
    if (!year) throw new Error(`Pay YEAR Required include field 'PAY START DATE' and 'PAY END DATE'`);

    const name = [row["FIRST NAME"], row["MIDDLE NAME"], row["LAST NAME"]]
      .filter(Boolean)
      .map(name => name.trim())
      .join(" ");

    const empType = row["EMPLOYEE TYPE"]?.trim();
    const baseSalary = parseNumber(row["BASE SALARY"]);
    const payeeTax = parseNumber(row["PAYEE TAX"]);
    const salaryAdvance = parseNumber(row["SALARY ADV"]);
    const deductions = parseNumber(row["DEDUCTION"]) + payeeTax + salaryAdvance;

    let daysAbsent = 0;
    let daysWorked = 0;
    let totalWorkDaysInMonth = 0;

    let grossPay = baseSalary;
    if (sheetName.toUpperCase() === 'REGULAR') {
      daysAbsent = parseNumber(row["DAYS ABS"]);
      daysWorked = parseNumber(row["DAYS WORKED"]);
      totalWorkDaysInMonth = daysAbsent + daysWorked;

      if (totalWorkDaysInMonth > 0) {
        grossPay = baseSalary - (daysAbsent / totalWorkDaysInMonth) * baseSalary;
      }
    }
    const netPay = grossPay - deductions;

    const bankAccount = row["BANK ACCOUNT"]?.trim() || row["ACCOUNT NUMBER"]?.trim();

    if (bankAccount) {
      await People.updateOne({ name }, { bankAccount });
    }

    const siteName = row["LOCATION"]?.trim();
    const site = siteName && await Site.findOne({ name: siteName });
    if (siteName && !site) throw new Error("SITE not Valid");

    const bagsBagged = parseNumber(String(row["QTY"])?.replace(/,/g, "")) || 0
    const bagsLoaded = parseNumber(String(row["BAGS LOADED"])?.replace(/,/g, "")) || 0

    // console.log(bagsBagged, bagsLoaded, "bagsBagged, bagsLoaded")
    const calcGrossPay = (payType === "MONTH-END")
      ? (bagsBagged + bagsLoaded) * 3.5
      : (bagsBagged + bagsLoaded) * 0.5;
    // console.log(calcGrossPay, "calcGrossPay", grossPay, "grossPay");

    const payrollRecord = {
      payee: payee._id,
      payeeMonthYrType: personId + month + year + payType,
      site: site?._id,
      empType,
      payeeTax,
      company: row["COMPANY"],
      jobName: payee.jobName,
      status: "UNPAID",
      payType,
      month,
      year,
      grossPay: calcGrossPay || grossPay,
      netPay: calcGrossPay ? calcGrossPay - deductions : netPay,
      bagsBagged,
      bagsLoaded,
      deductions,
      daysAbsent,
      daysWorked,
      totalWorkDaysInMonth,
      salaryAdvance,
      payDate: today,
      payStartDate,
      payEndDate,
      payItems: [],
      remarks: "via XLS Upload - " + personId + month + year + payType,
      creator: userId,
    };

    return payrollRecord;
  } catch (error) {
    throw new Error(`Row ${rowNumber} processing error: ${error.message}`);
  }
}


router.get(
  "/getYearMonthSeason/:year/:month/:payType",
  checkAuth,
  async (req, res) => {
    try {
      const { role } = req.userData;
      if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
        return res.status(500).json({
          message: "Fetching payrolls failed! Not Allowed ",
        });
      }
      const { year, month, payType } = req.params;
      // console.log(year, month, payType, "year month paytype");
      if (
        isNaN(parseInt(year)) ||
        !year ||
        !month ||
        !payType ||
        year === undefined ||
        month === undefined ||
        payType === undefined
      ) {
        throw new Error("No Payrolls Data");
      }

      let payrolls = [];
      // payrolls = await Payroll.find({
      //   month: month,
      //   year: parseInt(year),
      //   payType: payType,
      // })
      //   .populate("payee", ["name", "bankAccount", "bankName"])
      //   .populate("site", "name")
      //   .populate("creator", ["name", "email", "role"])
      //   .sort({ createdAt: -1 });
      // console.log(payrolls[0], "payrolls", payType);
      let results = [];
      results = await payrollAggregations.getPayrollData(
        parseInt(year),
        month,
        payType
      );

      // const res2 = await getPayrollData(2023, "july", "MID-MONTH");
      // console.log(results[0]?.payee?.name, "results season name");

      return res.status(200).json(results);
    } catch (err) {
      console.log(err, "yearmonthseason ");
      res.status(500).json({ message: err.message });
    }
  }
);


router.get("/months/:year", checkAuth, async (req, res) => {
  const { role } = req.userData;

  if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
    return res.status(500).json({
      message: "Fetching payrolls failed! Not Allowed ",
    });
  }

  try {
    const year = parseInt(req.params.year);
    const monthOrder = {
      January: 1,
      February: 2,
      March: 3,
      April: 4,
      May: 5,
      June: 6,
      July: 7,
      August: 8,
      September: 9,
      October: 10,
      November: 11,
      December: 12,
    };
    const months = await Payroll.aggregate([
      { $match: { year: year } },
      { $group: { _id: "$month" } },
      {
        $addFields: {
          monthNumber: {
            $let: {
              vars: {
                monthIndex: {
                  $indexOfArray: [Object.keys(monthOrder), "$_id"],
                },
              },
              in: { $arrayElemAt: [Object.values(monthOrder), "$$monthIndex"] },
            },
          },
        },
      },
      { $sort: { monthNumber: 1 } }, // sort by monthNumber
    ]);
    return res.status(200).json(months.map((month) => month._id));
  } catch (err) {
    console.log(err, "monthyear");
    res.status(500).json({ message: err.message });
  }
});

router.get("/getGroup1", checkAuth, async (req, res, next) => {
  try {
    const { role } = req.userData;

    if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
      return res.status(500).json({
        message: "Fetching payrolls failed! Not Allowed ",
      });
    }

    const result = await Payrollgrpbyyrmonthstatus.find({});
    // console.log(result, 'paygrp')
    return res.status(200).json({
      message: "Payroll Aggregates Result ",
      payrolls: result,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Payroll Aggregates Error " + error,
    });
  }
});

router.get("/getByName", checkAuth, async (req, res, next) => {
  try {
    const { role } = req.userData;

    if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
      return res.status(500).json({
        message: "Fetching payrolls failed! Not Allowed ",
      });
    }

    const { searchTerm } = req.query;
    let sTerm = searchTerm?.toUpperCase()?.trim();
    console.log(sTerm, "sterm");
    const matchedPeople = await People.find({ name: { $regex: sTerm } }).sort({
      name: 1,
    });

    let records = [];
    matchedPeople.forEach(async (m) => {
      let mPay = await Payroll.find({ payee: m._id })
        .populate("payee")
        .populate("creator")
        .populate("site");
      if (mPay.length) {
        // records.push(mPay)
        records = [...records, ...mPay];
      }
    });

    setTimeout(() => {
      if (records?.length) {
        const payrolls = records.sort(function (a, b) {
          var nameA = a?.payee?.name?.toUpperCase(); // ignore upper and lowercase
          var nameB = b?.payee?.name?.toUpperCase(); // ignore upper and lowercase
          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }

          // names must be equal
          return 0;
        });
        return res.status(200).json({ payrolls: payrolls });
      } else {
        return res
          .status(200)
          .json({ message: "No records! ", payrolls: records });
      }
    }, 1000);
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: "try Block Error! " + error });
  }
});

router.get("/getByText", checkAuth, async (req, res, next) => {
  try {
    const { role } = req.userData;

    if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
      return res.status(500).json({
        message: "Fetching payrolls failed! Not Allowed ",
      });
    }
    const { searchTerm } = req.query;

    // let records;
    let result = [];
    result = await Payroll.aggregate([
      { $match: { $text: { $search: searchTerm } } },
    ])
      .sort({ name: 1 })
      .limit(200);

    // result = await Payroll.find({
    //   name: { $regex: searchTerm, $options: "i" },
    // })
    //   .sort({ name: 1 })
    //   .limit(50);

    return res
      .status(200)
      .json({ message: "Payrolls Fetched Successfully", payrolls: result });

    // if (result.length) {
    //   const payrolls = result.sort(function (a, b) {
    //     var nameA = a?.payee?.name?.toUpperCase(); // ignore upper and lowercase
    //     var nameB = b?.payee?.name?.toUpperCase(); // ignore upper and lowercase
    //     if (nameA < nameB) {
    //       return -1;
    //     }
    //     if (nameA > nameB) {
    //       return 1;
    //     }

    //     // names must be equal
    //     return 0;
    //   });
    //   return res.status(200).json({ message:"Payrolls Fetched Successfully", payrolls: payrolls });
    // } else {
    //   return res.status(200).json({message: "No Data", payrolls: result });
    // }
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: "Error! " + error });
  }
});


router.get('/grouped-payrolls/:year', checkAuth, async (req, res) => {
  const { role } = req.userData;

  if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
    return res.status(500).json({
      message: "Fetching payrolls failed! Not Allowed ",
    });
  }
  const year = parseInt(req.params.year);
  console.log(year, 'year')
  try {
    const payrolls = await Payroll.aggregate([
      {
        $match: {
          createdAt: { $exists: true, $ne: null },
          $expr: { $eq: [{ $year: '$createdAt' }, year] }
        }
      },
      {
        $lookup: {
          from: 'peoples',
          localField: 'payee',
          foreignField: '_id',
          as: 'payeeDetails'
        }
      },
      {
        $unwind: {
          path: '$payeeDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'sites',
          localField: 'site',
          foreignField: '_id',
          as: 'siteDetails'
        }
      },
      {
        $unwind: {
          path: '$siteDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          payeeName: {
            $concat: [
              { $ifNull: ['$payeeDetails.fname', ''] },
              ' ',
              { $ifNull: ['$payeeDetails.mname', ''] },
              ' ',
              { $ifNull: ['$payeeDetails.lname', ''] }
            ]
          },
          bankAccount: '$payeeDetails.bankAccount',
          bankAccountSplit: { $split: ['$payeeDetails.bankAccount', '-'] },
          jobName: '$payeeDetails.jobName',
          payee_id: '$payeeDetails.people_id',
          siteName: '$siteDetails.name'
        }
      },
      {
        $project: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          payType: 1,
          payee: 1,
          payee_id: 1,
          payeeName: 1,
          grossPay: 1,
          netPay: 1,
          status: 1,
          company: 1,
          jobName: 1,
          siteName: 1,
          bankAccount: 1,
          bankName: { $arrayElemAt: ['$bankAccountSplit', 0] },
          accountNo: { $arrayElemAt: ['$bankAccountSplit', 1] },
          createdAt: 1,
          salaryAdvance: 1,
          deductions: 1,
          daysAbsent: 1,
          daysWorked: 1,
          totalWorkDaysInMonth: 1
        }
      },
      {
        $group: {
          _id: {
            year: '$year',
            month: '$month',
            payType: '$payType'
          },
          payrolls: {
            $push: {
              _id: '$_id',
              payeeName: '$payeeName',
              payee_id: '$payee_id',
              bankAccount: '$bankAccount',
              bankName: '$bankName',
              accountNo: '$accountNo',
              jobName: '$jobName',
              grossPay: '$grossPay',
              netPay: '$netPay',
              status: '$status',
              siteName: '$siteName',
              createdAt: '$createdAt',
              payType: '$payType',
              salaryAdvance: '$salaryAdvance',
              deductions: '$deductions',
              daysAbsent: '$daysAbsent',
              daysWorked: '$daysWorked',
              totalWorkDaysInMonth: '$totalWorkDaysInMonth'
            }
          }
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          payTypes: {
            $push: {
              payType: '$_id.payType',
              payrolls: '$payrolls'
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id.year',
          months: {
            $push: {
              month: '$_id.month',
              payTypes: '$payTypes'
            }
          }
        }
      },
      {
        $sort: {
          '_id': 1
        }
      }
    ]);
    // console.log(JSON.stringify(payrolls[0]), 'payrolls')

    res.status(200).json({ payrolls });
  } catch (error) {
    console.error('Error fetching payrolls:', error);
    res.status(500).json({ message: 'Error fetching payrolls', error });
  }
});

// Fetch available years
router.get('/payroll-years', async (req, res) => {
  try {
    const years = await Payroll.aggregate([
      {
        $match: {
          createdAt: { $exists: true, $ne: null }
        }
      },
      {
        $project: {
          year: { $year: '$createdAt' }
        }
      },
      {
        $group: {
          _id: '$year'
        }
      },
      {
        $sort: {
          _id: 1
        }
      }
    ]);

    res.status(200).json(years.map(y => y._id));
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ message: 'Error fetching years', error });
  }
});



router.get("/:id", checkAuth, (req, res, next) => {
  const { role } = req.userData;

  if (!["ADMIN", "GENERAL MANAGER", "SNR ACCOUNTANT"].includes(role)) {
    return res.status(500).json({
      message: "Fetching payrolls failed! Not Allowed ",
    });
  }
  if (!req.params.id) {
    return res.status(500).json({ message: "No Payroll ID" });
  }

  Payroll.findById(req.params.id)
    .populate("payee")
    .populate("creator", ["name", "email", "role"])
    .populate("updater", ["name", "email", "role"])
    .populate("site")
    .then((payroll) => {
      if (payroll) {
        res.status(200).json({ payroll: payroll });
      } else {
        res.status(404).json({ message: "payroll not found!" });
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({
        message: "Fetching payroll failed! " + error,
      });
    });
});


module.exports = router;
