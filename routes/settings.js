const express = require("express");

const router = express.Router();

const checkAuth = require("../middleware/check-auth");

const SettingController = require('../controllers/setting');

router.post("", checkAuth, SettingController.createSetting);
router.get('', SettingController.getSettings);
router.get("/:id", SettingController.getSetting);
  
router.delete("/:id", checkAuth, SettingController.deleteSetting);
  
router.put("/:id", checkAuth, SettingController.updateSetting);

module.exports = router;
