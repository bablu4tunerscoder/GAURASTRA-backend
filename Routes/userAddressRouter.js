const express = require("express");
const {
  addAddress,
  getMyAddresses,
  updateAddress,
  deleteAddress,
} = require("../Controllers/userAddressController");

const { authCheck } = require("../utilities/JWTAuth");

const router = express.Router();

router.post(
  "/add-address",
  authCheck,
  addAddress
);


router.get(
  "/all-address",
  authCheck,
  getMyAddresses
);


router.put(
  "/update_address/:address_id",
  authCheck,
  updateAddress
);


router.delete(
  "/delete_address/:address_id",
  authCheck,
  deleteAddress
);


module.exports = router;
