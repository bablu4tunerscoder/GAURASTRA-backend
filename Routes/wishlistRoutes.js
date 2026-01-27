const express = require("express");
const router = express.Router();

const { authCheck, adminCheck, permissionCheck } = require("../utilities/JWTAuth");
const { addToWishlist, removeFromWishlist, clearWishlist, getWishlist, getAllWishlistAdmin } = require("../Controllers/wishlistController");



router.post("/add", authCheck, addToWishlist);
router.post("/remove", authCheck, removeFromWishlist);
router.post("/clear", authCheck, clearWishlist);
router.get("/get", authCheck, getWishlist);

router.get("/get-by-admin", authCheck, permissionCheck('product'), getAllWishlistAdmin);




module.exports = router;

