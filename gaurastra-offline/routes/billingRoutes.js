const express = require("express");
const router = express.Router();

const billingcontrollers = require("../controllers/billingController");
const { offlineAuthMiddleware, offlineAdminMiddleware } = require("../middleware/auth");

// 🔹 CREATE / CALCULATE
router.post("/create", offlineAuthMiddleware, billingcontrollers.createBilling);
router.post("/calculate", offlineAuthMiddleware, billingcontrollers.calculateBilling);

// 🔹 SPECIAL / STATIC ROUTES (ALWAYS FIRST)
router.get(
  "/a/get-billings-with-return-status",
  offlineAuthMiddleware, offlineAdminMiddleware,
  billingcontrollers.getUserLastBillingsWithReturnStatus
);

router.get(
  "/w/get-billings-with-return-status",
  offlineAuthMiddleware,
  billingcontrollers.getUserLastBillingsWithReturnStatus
);

// 🔹 LIST
router.get("/", offlineAuthMiddleware, billingcontrollers.getAllBilling);
router.get("/w", offlineAuthMiddleware, billingcontrollers.getAllBilling);

// 🔹 ID BASED ROUTES (ALWAYS LAST)
router.get("/:id", offlineAuthMiddleware, billingcontrollers.getBillingById);
router.put("/:id", offlineAuthMiddleware, billingcontrollers.updateBilling);
router.delete("/:id", offlineAuthMiddleware, billingcontrollers.deleteBilling);

router.get("/w/:id", offlineAuthMiddleware, billingcontrollers.getBillingById);

module.exports = router;
