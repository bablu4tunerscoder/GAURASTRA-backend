const express = require("express");
const router = express.Router();
const orderController = require("../Controllers/orderController");
const { authCheck, permissionCheck } = require("../utilities/JWTAuth");


// Create new order
router.post("/create",authCheck, orderController.createOrder);

// Get order with payment details by order_id
router.get("/order-payment/:order_id",authCheck, orderController.getOrderWithPayment);
router.get("/order-payment", authCheck, orderController.getAllOrdersWithPayments);

router.get('/user-details/:user_id',authCheck, orderController.getDetailswithUser);

// Route to update order_status
router.patch("/update-status/:order_id", authCheck, permissionCheck('orders'), orderController.updateOrderStatus);
 
// ✅ NEW: Delete order by ID
router.delete("/delete-order/:order_id", authCheck, permissionCheck('orders') ,orderController.deleteOrder);

module.exports = router;
