const router = require("express").Router();
const admin = require("../controllers/adminController");

router.get("/real-time-sales", admin.getRealTimeSales);
router.get("/inventory-status", admin.getInventoryStatus);
router.get("/daily-summary", admin.getDailySummary);
router.get("/gst-report", admin.getGSTReport);
router.get("/performance", admin.getStorePerformance);
router.get("/dashboard", admin.getAdminDashboard);

module.exports = router;
