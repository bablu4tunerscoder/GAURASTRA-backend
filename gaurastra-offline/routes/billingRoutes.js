const express = require("express");
const router = express.Router();

const billingcontrollers = require("../controllers/billingController");
const { offlineAuthMiddleware } = require("../middleware/auth");

  
router.post("/create", offlineAuthMiddleware, billingcontrollers.createBilling);
router.post("/calculate",offlineAuthMiddleware, billingcontrollers.calculateBilling);
router.get("/", offlineAuthMiddleware,  billingcontrollers.getAllBilling);
router.get("/:id", offlineAuthMiddleware, billingcontrollers.getBillingById);
router.put("/:id",offlineAuthMiddleware, billingcontrollers.updateBilling);
router.delete("/:id", offlineAuthMiddleware, billingcontrollers.deleteBilling);

module.exports = router;
