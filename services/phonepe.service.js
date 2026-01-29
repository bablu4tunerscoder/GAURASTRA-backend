const axios = require("axios");
const crypto = require("crypto");

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:9091';

const PHONEPE_BASE_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1';

const MERCHANT_ID = "M22SD4GSX2BNG_2601291600";
const MERCHANT_KEY = 'MzAwMDY0MmQtYjQxYS00NTI0LWFhY2UtM2EyZjY4MWQ0OWFj';
const SALT_INDEX = 1;

const redirectUrl = `${BACKEND_URL}/api/payments/status`;

const successUrl= `${FRONTEND_URL}/payment-success`
const failureUrl=`${FRONTEND_URL}/payment-failure`


function generateChecksum(payloadBody) {

  const payload = Buffer.from(JSON.stringify(payloadBody)).toString("base64");

  const stringToHash = `${payload}/pg/v1/pay${MERCHANT_KEY}`;

  const hash = crypto
    .createHash("sha256")
    .update(stringToHash)
    .digest("hex");

  return {
    payload,
    checksum: `${hash}###${SALT_INDEX}`,
  };
}

exports.initiatePayment = async ({
  merchantTransactionId,
  amount,
  userId,
}) => {
  try {
    const payment_payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: userId,
      amount: Number(amount) * 100,
      redirectUrl: `${redirectUrl}?id=${merchantTransactionId}`,
      redirectMode: "POST",
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const { payload, checksum } = generateChecksum(payment_payload);

    const response = await axios.post(
      `${PHONEPE_BASE_URL}/pay`,
      { request: payload },
      {
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": MERCHANT_ID, 
        },
        timeout: 10000,
      }
    );

    console.log("response.data.data",response.data);

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
