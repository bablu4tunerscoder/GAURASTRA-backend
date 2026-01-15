const express = require("express");
const contactController = require("../Controllers/contactUsController");
const { authCheck, permissionCheck } = require("../utilities/JWTAuth");



const router = express.Router();

// ✅ User side – Submit contact form
router.post(
  "/contact-us",
  contactController.createContact
);

// ✅ Admin side – Get all contacts (with pagination & status filter)
router.get(
  "/contact-us",authCheck, permissionCheck('user'),
  contactController.getAllContacts
);

// ✅ Admin side – Get contact by ID
router.get(
  "/contact-us/:id",authCheck, permissionCheck('user'),
  contactController.getContactById
);

// ✅ Admin side – Update contact status (pending | working | done)
router.put(
  "/contact-us/:id/status",authCheck, permissionCheck('user'),
  contactController.updateContactStatus
);

// ✅ Admin side – Delete contact
router.delete(
  "/contact-us/:id", authCheck, permissionCheck('user'),
  contactController.deleteContact
);

module.exports = router;
