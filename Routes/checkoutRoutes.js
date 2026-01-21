const express = require("express");
const router = express.Router();

const { authCheck } = require("../utilities/JWTAuth");

const {
  createOrUpdateCheckout,
  updateCheckoutAddress,
  updateCheckoutPaymentMethod,
  getActiveCheckout,
  
} = require("../Controllers/checkoutController");

router.post(
  "/create-checkout",
  authCheck,
  createOrUpdateCheckout
);

router.get(
  "/get-checkout/:checkoutId",
  authCheck,
  getActiveCheckout
);

router.put(
  "/update-checkout-address",
  authCheck,
  updateCheckoutAddress
);

router.put(
  "/update-checkout-payment-method",
  authCheck,
  updateCheckoutPaymentMethod
);



module.exports = router;
