const axios = require("axios");
const crypto = require("crypto");

const {
  PHONEPE_BASE_URL,
  PHONEPE_MERCHANT_ID,
  PHONEPE_SALT_KEY,
  PHONEPE_SALT_INDEX,
} = process.env;

/* ======================================================
   SIGN PAYLOAD
====================================================== */
function generateChecksum(payload) {
  const base64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const string = `${base64}/pg/v1/pay${PHONEPE_SALT_KEY}`;
  const checksum = crypto
    .createHash("sha256")
    .update(string)
    .digest("hex");

  return {
    base64,
    checksum: `${checksum}###${PHONEPE_SALT_INDEX}`,
  };
}

/* ======================================================
   INITIATE PAYMENT
====================================================== */
exports.initiatePayment = async ({
  merchantTransactionId,
  amount,
  userId,
  callbacks,
}) => {
  const payload = {
    merchantId: PHONEPE_MERCHANT_ID,
    merchantTransactionId,
    merchantUserId: userId,
    amount: amount * 100,
    redirectUrl: callbacks.success,
    redirectMode: "POST",
    callbackUrl: callbacks.failure,
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  const { base64, checksum } = generateChecksum(payload);

  const response = await axios.post(
    `${PHONEPE_BASE_URL}/pg/v1/pay`,
    { request: base64 },
    {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
      },
    }
  );

  return {
    redirectUrl: response.data.data.instrumentResponse.redirectInfo.url,
    raw: response.data,
  };
};

/* ======================================================
   VERIFY PAYMENT
====================================================== */
exports.verifyPayment = async (merchantTransactionId) => {
  const path = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}`;
  const string = `${path}${PHONEPE_SALT_KEY}`;

  const checksum = crypto
    .createHash("sha256")
    .update(string)
    .digest("hex");

  const response = await axios.get(`${PHONEPE_BASE_URL}${path}`, {
    headers: {
      "X-VERIFY": `${checksum}###${PHONEPE_SALT_INDEX}`,
      "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
    },
  });

  return response.data.data;
};

/* ======================================================
   HANDLE CALLBACK
====================================================== */
exports.handleCallback = async (authorization, body) => {
  // signature verification can be added here
  return body;
};

/* ======================================================
   INITIATE REFUND
====================================================== */
exports.initiateRefund = async (payment, amount) => {
  return {
    success: true,
    message: "Refund initiated (mock)",
  };
};
