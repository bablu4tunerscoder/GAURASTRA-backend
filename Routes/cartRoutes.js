const express = require("express");
const router = express.Router();

const { authCheck, adminCheck } = require("../utilities/JWTAuth");
const { addToCart, increaseCartItem, decreaseCartItem, clearCart, getCart } = require("../Controllers/CartController");


router.post("/add-cart", authCheck, addToCart);
router.post("/increase-cart", authCheck, increaseCartItem);
router.post("/decrease-cart", authCheck, decreaseCartItem);
router.post("/clear-cart", authCheck, clearCart);
router.get("/get-cart", authCheck, getCart);



module.exports = router;

