const express = require("express");
const router = express.Router();
const orderController = require("../Controllers/orderController");
const { authCheck, permissionCheck } = require("../utilities/JWTAuth");


// Create new order
router.post("/create",authCheck, orderController.createOrder);



// Get order with payment details by order_id
router.get("/order-payment/:order_id",authCheck,permissionCheck('orders'), orderController.getOrderWithPayment);
router.get("/order-payment", authCheck,permissionCheck('orders'), orderController.getAllOrdersWithPayments);

router.get('/user-details/:user_id',authCheck,permissionCheck('orders'), orderController.getDetailswithUser);

// Route to update order_status
router.patch("/update-order-status/:order_id", authCheck, permissionCheck('orders'), orderController.updateOrderStatus);
// Route to update order_status
router.patch("/update-delevery-status/:order_id", authCheck, permissionCheck('orders'), orderController.updateDeliveryStatus);
 
// ✅ NEW: Delete order by ID
router.delete("/delete-order/:order_id", authCheck, permissionCheck('orders') ,orderController.deleteOrder);


router.get("/my-order", authCheck ,orderController.getMyOrders);
router.get("/my-order/:order_id", authCheck, orderController.getMyOrderDetail);

module.exports = router;
