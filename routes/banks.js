const express = require("express");
const Bank = require("../models/bank");
const User = require("../models/user");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
var multer = require("multer");
const DIR = "/var/www/uploads/bankimages/";

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
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    const fileName =
      new Date().getTime() +
      "-" +
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

const checkAuth = require("../middleware/check-auth");
let isDataUploaded = false; // In-memory flag

// Function to upload JSON data to MongoDB
const uploadBanksData = async () => {
  if (isDataUploaded) return;

  const filePath = path.join(__dirname, '../banks.json');
  const processedFilePath = path.join(__dirname, '../banks.processed.json');

  if (!fs.existsSync(filePath)) {
    console.log('No new banks data to upload.');
    return;
  }

  try {
    console.log(filePath, 'filePath');
    const data = fs.readFileSync(filePath, 'utf8');
    const banks = JSON.parse(data);
    const bankEntries = Object.entries(banks).map(([name, code]) => ({ name, code }));

    const banksUploaded = await Bank.insertMany(bankEntries, { ordered: false });
    console.log('Banks data uploaded successfully');

    // Rename the file to indicate it has been processed
    // fs.renameSync(filePath, processedFilePath);
    isDataUploaded = true; // Set flag to true after upload
    return banksUploaded;
  } catch (error) {
    console.error('Error uploading banks:', error);
  }
};

// Endpoint to trigger upload on first access
router.get('/init-upload', async (req, res) => {
  console.log('Checking initialization');
  try {
    let banks = await Bank.find().limit(5)

    if (banks.length) {
      console.log('Data already initialized');
      return res.status(200).send('Data already initialized');
    }

    await uploadBanksData();
    banks = await Bank.find()
    res.status(200).send({ message: 'Initialization Done', banks: banks });

  } catch (error) {
    console.error('Error initializing upload:', error);
  }

});

// GET all banks
router.get('', async (req, res) => {

  try {
    const banks = await Bank.find()
      .select('name code icon')
      .sort({ name: 1 });
    AllowedBanks = ["GTBANK PLC", "MONIEPOINT MICROFINANCE BANK", "UNITED BANK FOR AFRICA", "First City Monument Bank", "MONIE POINT BANK", "WEMA BANK", "FIDELITY BANK"];
    const allowedBankNamesLower = AllowedBanks.map(b => b.toLowerCase());
    const filteredBanks = banks.filter((bank) => {
      return bank
      // return allowedBankNamesLower.includes(bank.name.toLowerCase());
    });
    // console.log(filteredBanks, 'filteredBanks')

    res.json({
      success: true,
      data: banks,
      message: 'Banks fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching banks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banks'
    });
  }
});


router.get("/:id", (req, res, next) => {
  Bank.findById(req.params.id)
    .populate("categoryId")
    .then((bank) => {
      if (bank) {
        res.status(200).json(bank);
      } else {
        res.status(404).json({ message: "bank not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching bank failed! " + error,
      });
    });
});





router.post('/add-bank', checkAuth, async (req, res) => {
  const alloweds = ['ADMIN', "GENERAL MANAGER"]

  if (!alloweds.includes(req.userData.role)) {
    return res.status(500).json({
      message: "not allowed! " + error,
    });
  }
  const { name, code } = req.body;

  if (!name || !code) {
    return res.status(400).send('Name and code are required');
  }

  try {
    const newBank = new Bank({ name, code });
    await newBank.save();
    res.status(201).send('Bank added successfully');
  } catch (error) {
    console.error('Error adding bank:', error);
    res.status(500).send('Error adding bank');
  }
});

router.put('/update-bank/:name', async (req, res) => {
  const alloweds = ['ADMIN', "GENERAL MANAGER", 'SNR ACCOUNTANT', 'ACCOUNTANT']

  if (!alloweds.includes(req.userData.role)) {
    return res.status(500).json({
      message: "not allowed! " + error,
    });
  }
  const { name } = req.params;
  const { code } = req.body;

  if (!code) {
    return res.status(400).send('Code is required');
  }

  try {
    const updatedBank = await Bank.findOneAndUpdate({ name }, { code }, { new: true, upsert: true });
    res.status(200).send(`Bank ${name} updated successfully`);
  } catch (error) {
    console.error('Error updating bank:', error);
    res.status(500).send('Error updating bank');
  }
});


router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = ['ADMIN']

  if (!alloweds.includes(req.userData.role)) {
    return res.status(500).json({
      message: "Deleting a bank failed! " + error,
    });
  }

  let filePath;
  Bank.findById(req.params.id)
    .then((bank) => {
      if (bank && bank.icon) {
        filePath = "uploads/" + bank.icon.split("/uploads/")[1];
        console.log(filePath)
      }
    })
    .catch((err) => {
      return res
        .status(401)
        .json({ message: "bank not found in db!" + err });
    });
  Bank.deleteOne({ _id: req.params.id })
    .then((result) => {
      if (result.n > 0) {
        // delete bank.icon
        if (filePath) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(err);
            } else {
              console.log("related file deleted");
            }
          });
        }
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        message: "Deleting bank failed! " + error,
      });
    });
});

router.get('/banks', async (req, res) => {
  try {
    const banks = await Bank.find();
    res.status(200).json(banks);
  } catch (error) {
    console.error('Error fetching banks:', error);
    res.status(500).send('Error fetching banks');
  }
});






module.exports = router;
