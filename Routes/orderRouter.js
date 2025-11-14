const express = require("express");
const router = express.Router();
const orderController = require("../Controllers/orderController");

// Create new order
router.post("/", orderController.createOrder);

// Get order with payment details by order_id
router.get("/order-payment/:order_id", orderController.getOrderWithPayment);
router.get("/order-payment", orderController.getAllOrdersWithPayments);

router.get('/user-details/:user_id', orderController.getDetailswithUser);
// Route to update order_status
router.patch("/update-status/:order_id", orderController.updateOrderStatus);
 
// ✅ NEW: Delete order by ID
router.delete("/:order_id", orderController.deleteOrder);

module.exports = router;
