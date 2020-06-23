const express = require("express");
const router = express.Router();
const userController = require('../controllers/user');

const checkAuth = require('../middleware/check-auth');

router.post('/signup', userController.createUser)
router.post('/login', userController.userLogin);
router.put("/:id", checkAuth, userController.updateUser);
router.post("/getuser", checkAuth, userController.getUser);


module.exports = router;
