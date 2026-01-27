const axios = require("axios");
const crypto = require("crypto");

const {
  PHONEPE_BASE_URL,
  PHONEPE_MERCHANT_ID,
  PHONEPE_SALT_KEY,
  PHONEPE_SALT_INDEX,
  FRONTEND_URL,
  BACKEND_URL,
} = process.env;

/* ======================================================
   SIGN PAYLOAD (PAY API)
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
}) => {
  try {
    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: userId,
      amount: amount * 100, // paise
      redirectUrl: `${FRONTEND_URL}/payment-status`,
      redirectMode: "POST",
      callbackUrl: `${BACKEND_URL}/api/payment/phonepe/callback`,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    console.log("PhonePe initiatePayment payload:", payload);


    const { base64, checksum } = generateChecksum(payload);

    const response = await axios.post(
      `${PHONEPE_BASE_URL}/pg/v1/pay`,
      { request: base64 },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
        },
        timeout: 10000,
      }
    );

    return {
      redirectUrl:
        response.data.data.instrumentResponse.redirectInfo.url,
      raw: response.data,
    };
  } catch (error) {
    console.error("PhonePe initiatePayment error:", {
      message: error.message,
      data: error.response?.data,
    });
    throw new Error("Unable to initiate PhonePe payment");
  }
};

/* ======================================================
   VERIFY PAYMENT (STATUS API)
====================================================== */
exports.verifyPayment = async (merchantTransactionId) => {
  try {
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
      timeout: 10000,
    });

    return response.data.data;
  } catch (error) {
    console.error("PhonePe verifyPayment error:", {
      message: error.message,
      data: error.response?.data,
    });
    throw new Error("Unable to verify PhonePe payment");
  }
};

/* ======================================================
   HANDLE CALLBACK (SIGNATURE VERIFICATION)
====================================================== */
exports.handleCallback = async (authorization, body) => {
  if (!authorization) {
    throw new Error("Missing PhonePe authorization header");
  }

  const receivedSignature = authorization.split("###")[0];

  const expectedSignature = crypto
    .createHash("sha256")
    .update(JSON.stringify(body) + PHONEPE_SALT_KEY)
    .digest("hex");

  if (receivedSignature !== expectedSignature) {
    throw new Error("Invalid PhonePe callback signature");
  }

  return body;
};

/* ======================================================
   INITIATE REFUND (PLACEHOLDER)
====================================================== */
exports.initiateRefund = async (payment, amount) => {
  return {
    success: false,
    message: "Refund API not implemented yet",
  };
};
