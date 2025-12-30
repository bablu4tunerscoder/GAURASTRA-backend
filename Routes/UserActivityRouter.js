// routes/userActivityRoutes.js
const express = require("express");
const router = express.Router();
const {
  logActivity,
  getAllActivities,
  deleteUserActivityBySessionId,
  getUserActivity,
  clearAllActivities,
} = require("../Controllers/UserActivityController");
const { authCheck, permissionCheck } = require("../utilities/JWTAuth");

router.post("/add_activity", authCheck, permissionCheck('user'), logActivity);
router.get("/activities",authCheck, permissionCheck('user'), getAllActivities);
router.get("/activityById",authCheck, permissionCheck('user'), getUserActivity);
router.delete("/delete_activity/:sessionId",authCheck, permissionCheck('user'), deleteUserActivityBySessionId);
router.delete("/activities/clear", authCheck, permissionCheck('user'),clearAllActivities);

module.exports = router;
