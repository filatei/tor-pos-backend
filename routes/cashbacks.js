const express = require("express");
const router = express.Router();
const multer = require("multer");
const CashBack = require("../models/cashback"); // your cashback model
const CashBackCustomer = require("../models/cashback-customer"); 
const CashBackAttach = require("../models/cashbackattach"); // your cashback model
const os = require("os");
const HOSTNAME = os.hostname();
// const { ca } = require("date-fns/locale");

const multerConfig = require("../config/multer-config");
const DIR = "/var/www/uploads/cashbackimages/";
const upload = multerConfig(DIR);

const checkAuth = require("../middleware/check-auth");


// POST Route
router.post("", checkAuth, upload.single("image"), async (req, res) => {
  try {
    const allowed = [
      "ADMIN",
      "SECRETARY",
      "GENERAL MANAGER",
      "MANAGER",
      "SNR ACCOUNTANT",
      "ACCOUNTANT",
    ];

    if (!allowed.includes(req?.userData?.role)) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const DOMAIN = process.env.DOMAIN || req.protocol + "://" + req.get("host");

    const { status, imageText, id } = req.body;
    let imagePath = "";

    if (req.file?.path) {
      const url = HOSTNAME.includes("torama.ng")
        ? "https://fido-api.torama.ng"
        : DOMAIN;
      imagePath =
        url +
        "/cashbackUploads/" +
        req.file.path.split("/var/www/uploads/cashbackimages")[1];
    }

    const cashBackAttach = new CashBackAttach({
      status: status,
      cashBackId: id,
      imageText,
      image: imagePath,
     
    });

    const saved = await cashBackAttach.save();

    const cashBack = await CashBack.findById(saved.cashBackId);
   

    if (!saved) {
      return res.status(404).json({ message: "CashbackAttach save failed." });
    }

    return res.status(200).json({
      record: cashBack,
      message: "CashbackAttach saved successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Server error: ${error.message}` }); // show error message for better debugging
  }
});

router.put(
  "/:id",
  checkAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      const DOMAIN =
        process.env.DOMAIN || req.protocol + "://" + req.get("host");

      const { id } = req.params;
      let toUpdate = { ...req.body, updatedBy: req.userData.userId };

      if (req.file?.path) {
        const url = HOSTNAME.includes("torama.ng")
          ? "https://fido-api.torama.ng"
          : DOMAIN;
        const paymentProofImage =
          url +
          "/cashbackUploads/" +
          req.file.path.split("/var/www/uploads/cashbackimages")[1];
        toUpdate = { ...toUpdate, paymentProofImage, paymentDate: new Date() };
      }

      const updatedCashback = await CashBack.findByIdAndUpdate(id, toUpdate, {
        new: true,
      });

      const updatedCashback2 = await CashBackCustomer.findByIdAndUpdate(id, toUpdate, {
        new: true,
      });

      if (!updatedCashback2) {
        return res.status(404).json({ message: "Cashback not found." });
      }
      // console.log(updatedCashback, "updatedCashback");

      return res.status(200).json({
        record: updatedCashback2,
        message: "Cashback updated successfully.",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: `Server error: ${error.message}` }); // show error message for better debugging
    }
  }
);




module.exports = router;
