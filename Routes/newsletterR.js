const express = require("express");
const newsletterController = require("../Controllers/newsletterC");
const { authCheck, permissionCheck } = require("../utilities/JWTAuth");

const router = express.Router();


router.post(
  "/newsletter",
  newsletterController.subscribeNewsletter
);


router.get(
  "/newsletter",
  authCheck,
  permissionCheck("user"),
  newsletterController.getAllSubscribers
);


router.get(
  "/newsletter/:id",
  authCheck,
  permissionCheck("user"),
  newsletterController.getSubscriberById
);

router.put(
  "/newsletter/:id/status",
  authCheck,
  permissionCheck("user"),
  newsletterController.updateNewsletterStatus
);

router.delete(
  "/newsletter/:id",
  authCheck,
  permissionCheck("user"),
  newsletterController.deleteSubscriber
);

module.exports = router;
