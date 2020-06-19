const express = require("express");

const router = express.Router();
const fs = require('fs');
const mime = require('mime');

const checkAuth = require("../middleware/check-auth");

const claimController = require('../controllers/claim.notneeded_again');

router.post("", upload.any(), checkAuth, claimController.createClaim);
router.post("/import", checkAuth, claimController.importClaim);
router.get('', claimController.getClaims);
router.get("/:id", claimController.getClaim);
  
router.delete("/:id", checkAuth, claimController.deleteClaim);
// router.delete("/:id", checkAuth, claimController.deleteClaim);
  
router.put("/:id", checkAuth, claimController.updateClaim);

// router.put("/:id", checkAuth, claimController.updateClaim);

module.exports = router;
