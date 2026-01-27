// Routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const paymentController = require("../Controllers/paymentController");
const { authCheck, permissionCheck } = require("../utilities/JWTAuth");

/* ======================================================
   HEALTH
====================================================== */
router.get("/health", (req, res) => res.json({ ok: true }));


router.post(
  "/initiate",
  authCheck,
  paymentController.initiatePayment
);


router.post(
  "/callback",
  paymentController.paymentCallback
);


router.post("/success", paymentController.handleSuccess);
router.get("/success", paymentController.handleSuccess);

router.post("/failure", paymentController.handleFailure);
router.get("/failure", paymentController.handleFailure);

router.get(
  "/verify/:merchantTransactionId",
  authCheck,
  paymentController.verifyPayment
);


router.post(
  "/refund-payment",
  authCheck,
  permissionCheck("payment"),
  paymentController.initiateRefund
);


router.get(
  "/merchant/:merchantTransactionId",
  authCheck,
  permissionCheck("payment"),
  paymentController.getPaymentByMerchant
);

router.get(
  "/pending",
  authCheck,
  permissionCheck("payment"),
  paymentController.getPendingPayments
);

router.put(
  "/update-status",
  authCheck,
  permissionCheck("payment"),
  paymentController.updatePaymentStatus
);


router.get(
  "/:paymentId",
  authCheck,
  paymentController.getPaymentDetails
);

module.exports = router;
