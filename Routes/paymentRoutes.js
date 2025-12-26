// Routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const paymentController = require("../Controllers/paymentController");
const { authCheck, permissionCheck } = require("../Utils/JWTAuth");

// --- Health (quick sanity check) ---
router.get("/health", (req, res) => res.json({ ok: true }));

// --- Core payment flows ---
router.post("/initiate", paymentController.initiatePayment);
router.post("/callback", paymentController.paymentCallback);
router.post("/success", paymentController.handleSuccess);
router.post("/failure", paymentController.handleFailure);
router.get("/verify/:merchantTransactionId", paymentController.verifyPayment);
router.post("/refund", paymentController.initiateRefund);

// --- Admin / utility endpoints ---
router.get("/merchant/:merchantTransactionId",  authCheck, permissionCheck('payment'), paymentController.getPaymentByMerchant);
router.get("/pending", authCheck, permissionCheck('payment'), paymentController.getPendingPayments);
router.put("/update-status", authCheck, permissionCheck('payment'), paymentController.updatePaymentStatus);

// --- Dynamic (keep LAST) ---
router.get("/:paymentId",  authCheck, paymentController.getPaymentDetails);

module.exports = router;
