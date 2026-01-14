const express = require("express");
const router = express.Router();

const { authCheck, adminCheck } = require("../utilities/JWTAuth");
const { addToWishlist, removeFromWishlist, clearWishlist, getWishlist } = require("../Controllers/wishlistController");



router.post("/add", authCheck, addToWishlist);
router.post("/remove", authCheck, removeFromWishlist);
router.post("/clear", authCheck, clearWishlist);
router.get("/get", authCheck, getWishlist);




module.exports = router;

