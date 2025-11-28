const router = require("express").Router();
const admin = require("../controllers/adminController");
const { offlineAdminMiddleware, offlineAuthMiddleware } = require("../middleware/auth");

router.get("/real-time-sales", offlineAuthMiddleware, offlineAdminMiddleware, admin.getRealTimeSales);
router.get("/inventory-status",offlineAuthMiddleware, offlineAdminMiddleware, admin.getInventoryStatus);
router.get("/daily-summary",offlineAuthMiddleware, offlineAdminMiddleware, admin.getDailySummary);
router.get("/gst-report", offlineAuthMiddleware, offlineAdminMiddleware,admin.getGSTReport);
router.get("/performance",offlineAuthMiddleware, offlineAdminMiddleware, admin.getStorePerformance);
router.get("/dashboard",offlineAuthMiddleware, offlineAdminMiddleware, admin.getAdminDashboard);

module.exports = router;
