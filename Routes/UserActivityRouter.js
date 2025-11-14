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

router.post("/add_activity", logActivity);
router.get("/activities", getAllActivities);
router.get("/activityById", getUserActivity);
router.delete("/delete_activity/:sessionId", deleteUserActivityBySessionId);
router.delete("/activities/clear", clearAllActivities);

module.exports = router;
