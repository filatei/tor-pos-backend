const express = require("express");
const router = express.Router();
const fileController = require('../controllers/file');

const checkAuth = require('../middleware/check-auth');

router.get('', fileController.download)
// router.post('/login', userController.userLogin);
// router.put("/:id", checkAuth, userController.updateUser);

module.exports = router;
