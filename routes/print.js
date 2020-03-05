const express = require("express");
const router = express.Router();
const printController = require('../controllers/print');

const checkAuth = require('../middleware/check-auth');

router.post('', printController.print)

module.exports = router;

