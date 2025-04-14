const express = require("express");

const router = express.Router();

const checkAuth = require("../middleware/check-auth");

const receiptController = require('../controllers/receipt');

router.post("", checkAuth, receiptController.createReceipt);
router.get('', receiptController.getReceipts);
router.get("/:id", receiptController.getReceipt);
  
router.delete("/:id", checkAuth, receiptController.deleteReceipt);
  
router.put("/:id", checkAuth, receiptController.updateReceipt);

module.exports = router;
