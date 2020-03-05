const express = require("express");

const router = express.Router();

const checkAuth = require("../middleware/check-auth");

const orderController = require('../controllers/order');

router.post("", checkAuth, orderController.createOrder);
router.get('', orderController.getOrders);
router.get("/:id", orderController.getOrder);
  
router.delete("/:id", checkAuth, orderController.deleteOrder);
  
router.put("/:id", checkAuth, orderController.updateOrder);

module.exports = router;
