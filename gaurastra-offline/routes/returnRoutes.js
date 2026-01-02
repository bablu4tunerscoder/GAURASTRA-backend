const express = require("express");
const router = express.Router();

const billingReturnController = require("../controllers/returnController");
const { offlineAuthMiddleware, offlineAdminMiddleware } = require("../middleware/auth");


router.post("/full/:billingId", offlineAuthMiddleware, billingReturnController.fullBillReturn);
router.post("/partial/:billingId", offlineAuthMiddleware, billingReturnController.partialBillReturn);

router.get("/", offlineAuthMiddleware, billingReturnController.getAllBillingReturns);
router.get("/:id", offlineAuthMiddleware, billingReturnController.getBillingReturnById);


module.exports = router;
