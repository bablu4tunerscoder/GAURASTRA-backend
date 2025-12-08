const express = require("express");
const { downloadBillingCSV, downloadUserCSV } = require("../controllers/dataDownloadController");
const router = express.Router();


  
router.get("/billing/csv", downloadBillingCSV);
router.get("/user/csv", downloadUserCSV);


module.exports = router;
