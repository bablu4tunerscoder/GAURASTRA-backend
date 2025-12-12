const express = require("express");
const router = express.Router();

const { authCheck, adminCheck } = require("../Utils/JWTAuth");

const { getGAOverview, getGAEvents, getUserActivity } = require("../Controllers/googleAnalytics");

router.post("/overview", authCheck, adminCheck, getGAOverview);
router.post("/events", authCheck, adminCheck, getGAEvents);
router.post("/user-activity/:user_id", authCheck, adminCheck, getUserActivity);


module.exports = router;

