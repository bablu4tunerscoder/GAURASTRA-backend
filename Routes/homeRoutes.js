const express = require("express");
const { home_search,home_get_controller } = require("../Controllers/HomeController");
const router = express.Router();



router.get("/home",home_get_controller );
router.get("/home-search", home_search);


module.exports = router;

