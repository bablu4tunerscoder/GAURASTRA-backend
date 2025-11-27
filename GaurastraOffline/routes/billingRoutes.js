const express = require("express");
const router = express.Router();

const billingcontrollers = require("../controllers/billingControllers");

  
router.post("/create", billingcontrollers.createBilling);
router.post("/calculate", billingcontrollers.calculateBilling);
router.get("/", billingcontrollers.getAllBilling);
router.get("/:id", billingcontrollers.getBillingById);
router.put("/:id", billingcontrollers.updateBilling);
router.delete("/:id", billingcontrollers.deleteBilling);

module.exports = router;
