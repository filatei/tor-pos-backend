const express = require("express");
const router = express.Router();
const multer = require("multer");
const CashBack = require("../models/cashback"); // your cashback model
const os = require("os");
// const { ca } = require("date-fns/locale");

const multerConfig = require('../config/multer-config');
const DIR = "/var/www/uploads/cashbackimages/";
const upload = multerConfig(DIR);

const checkAuth = require("../middleware/check-auth");
const HOSTNAME = os.hostname();

// PUT Route
router.put(
  "/:id",
  checkAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      const DOMAIN =
        process.env.DOMAIN || req.protocol + "://" + req.get("host");

      const { id } = req.params;
      const { imageText } = req.body;
      let toUpdate = { ...req.body, updatedBy: req.userData.userId };

      if (req.file?.path) {
        const url = HOSTNAME.includes("torama.ng")
          ? "https://fido-api.torama.ng"
          : DOMAIN;
        const paymentProofImage =
          url +
          "/cashbackUploads/" +
          req.file.path.split("/var/www/uploads/cashbackimages")[1];
        toUpdate = { ...toUpdate, paymentProofImage };
      }

      const updatedCashback = await CashBack.findByIdAndUpdate(id, toUpdate, {
        new: true,
      });

      if (!updatedCashback) {
        return res.status(404).json({ message: "Cashback not found." });
      }

      return res.status(200).json({
        record: updatedCashback,
        message: "Cashback updated successfully.",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: `Server error: ${error.message}` }); // show error message for better debugging
    }
  }
);

module.exports = router;
