const express = require("express");
const router = express.Router();
const { sendConversionEvent } = require("../Utils/facebookConversionsApi"); // Adjust path as per your folder structure

// Controller for handling Facebook conversion event trigger
const sendFacebookEvent = async (req, res) => {
  try {
    const eventPayload = req.body;

    // Optional: Basic validation for the necessary fields
    if (!eventPayload.eventName || !eventPayload.email) {
      return res
        .status(400)
        .json({ error: "Missing required fields: eventName or email" });
    }

    // Setting default values if not provided in the eventPayload
    const defaultValues = {
      actionSource: "website",
      currency: "INR",
      eventSourceUrl: "", // Set a default or validate URL in the frontend
      eventTime: Math.floor(Date.now() / 1000),
      clientIp: "", // Default value, could be derived from request headers
      userAgent: "", // Default value, could be derived from request headers
      customParams: {},
    };

    // Merge the payload with default values
    const data = { ...defaultValues, ...eventPayload };

    // Send the event to Facebook Conversions API
    const response = await sendConversionEvent(data);

    res.status(200).json({
      success: true,
      message: "Event sent to Facebook successfully",
      response,
    });
  } catch (error) {
    console.error("Error in sendFacebookEvent:", error);
    res.status(500).json({
      success: false,
      message: "Error sending event to Facebook",
      error: error.message,
    });
  }
};

// Route: POST /api/facebook/send-event
router.post("/events", sendFacebookEvent);

module.exports = router;
