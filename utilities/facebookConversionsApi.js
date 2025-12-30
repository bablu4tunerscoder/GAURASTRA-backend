"use strict";
const bizSdk = require("facebook-nodejs-business-sdk");
const {
  Content,
  CustomData,
  DeliveryCategory,
  EventRequest,
  UserData,
  ServerEvent,
} = bizSdk;

const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const PIXEL_ID = process.env.FB_PIXEL_ID;
const ACTION_SOURCE = "website";
const CURRENCY = "INR";

bizSdk.FacebookAdsApi.init(ACCESS_TOKEN);

/**
 * Send a dynamic event to Facebook Conversions API
 * @param {Object} data - Dynamic event data
 */
async function sendConversionEvent(data) {
  const {
    email,
    phones = [],
    clientIp = "",
    userAgent = "",
    fbp,
    fbc,
    eventName,
    eventSourceUrl,
    contents = [],
    value = 0,
    currency = CURRENCY,
    eventId = undefined,
    customParams = {},
    actionSource = ACTION_SOURCE,
    testEventCode = undefined,
  } = data;

  const timestamp = Math.floor(Date.now() / 1000);

  const userData = new UserData()
    .setEmails(email ? [email] : [])
    .setPhones(phones)
    .setClientIpAddress(clientIp)
    .setClientUserAgent(userAgent)
    .setFbp(fbp)
    .setFbc(fbc);

  const contentObjects = contents.map((item) =>
    new Content()
      .setId(item.id)
      .setQuantity(item.quantity || 1)
      .setDeliveryCategory(
        item.deliveryCategory || DeliveryCategory.HOME_DELIVERY
      )
  );

  const customData = new CustomData()
    .setContents(contentObjects)
    .setCurrency(currency)
    .setValue(value);

  Object.entries(customParams).forEach(([key, val]) => {
    if (typeof customData[key] === "undefined") {
      customData[key] = val;
    }
  });

  const serverEvent = new ServerEvent()
    .setEventName(eventName)
    .setEventTime(timestamp)
    .setUserData(userData)
    .setCustomData(customData)
    .setEventSourceUrl(eventSourceUrl)
    .setActionSource(actionSource);

  if (eventId) serverEvent.setEventId(eventId);

  const eventRequest = new EventRequest(ACCESS_TOKEN, PIXEL_ID).setEvents([
    serverEvent,
  ]);

  if (testEventCode) {
    eventRequest.setTestEventCode(testEventCode);
  }

  try {
    const response = await eventRequest.execute();
    console.log("✅ Facebook Conversion Sent:", response);
    return response;
  } catch (err) {
    console.error("❌ Error sending event to Facebook:", err);
    throw err;
  }
}

// ✅ Export function for controller usage
module.exports = {
  sendConversionEvent,
};
