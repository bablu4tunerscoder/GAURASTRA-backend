// phonepe.service.js

const {
  StandardCheckoutClient,
  Env,
  StandardCheckoutPayRequest,
  RefundRequest,
  MetaInfo,
} = require("pg-sdk-node");
const { v4: uuidv4 } = require("uuid");
const Payment = require("../Models/paymentModel");
const Order = require("../Models/orderModel");
const phonepeConfig = require("../Utils/phonepe.config");
const { sleep } = require("../Utils/helpers");

class PhonePeService {
  constructor() {
    this.client = StandardCheckoutClient.getInstance(
      phonepeConfig.CLIENT_ID,
      phonepeConfig.CLIENT_SECRET,
      parseInt(phonepeConfig.CLIENT_VERSION),
      phonepeConfig.ENV === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX
    );
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async withRetry(fn) {
    try {
      return await fn();
    } catch (error) {
      if (
        error.type === "TooManyRequests" &&
        this.retryCount < this.maxRetries
      ) {
        this.retryCount++;
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
        await sleep(delay);
        return this.withRetry(fn);
      }
      throw error;
    }
  }

 async initiatePayment(orderId, amount, user, metadata = {}, callbacks = {}) {
  return this.withRetry(async () => {
    try {
      const merchantTransactionId = uuidv4();

      const payment = new Payment({
        order: orderId,
        amount,
        merchantTransactionId,
        paymentStatus: "Initiated",
        gatewayResponse: { metadata },
        callbacks: {
          success: callbacks.success || phonepeConfig.REDIRECT_URL,
          failure: callbacks.failure || `${phonepeConfig.FRONTEND_URL}/payment-failed`,
        },
      });
      await payment.save();

      // Build PhonePe request
      const requestBuilder = StandardCheckoutPayRequest.builder()
        .merchantOrderId(merchantTransactionId)
        .amount(amount * 100)
        .redirectUrl(callbacks.success || phonepeConfig.REDIRECT_URL);

      const metaInfo = MetaInfo.builder()
        .udf1(metadata.udf1 || "Order Payment")
        .udf2(JSON.stringify({
          orderId,
          userId: user.user_id,
          successUrl: callbacks.success,
          failureUrl: callbacks.failure,
        }))
        .build();

      requestBuilder.metaInfo(metaInfo);
      const request = requestBuilder.build();

      const response = await this.client.pay(request);

      payment.phonepePaymentUrl = response.redirectUrl;
      payment.merchantTransactionId = response.orderId;
      await payment.save();

      return {
        success: true,
        paymentId: payment._id,
        redirectUrl: response.redirectUrl,
        merchantTransactionId,
      };
    } catch (error) {
      console.error("PhonePe payment initiation error:", error);
      throw error;
    }
  });
}


 async verifyPayment(merchantTransactionId) {
  try {
    const payment = await Payment.findOne({ merchantTransactionId });
    if (!payment) throw new Error("Payment not found");

    const response = await this.client.getOrderStatus(merchantTransactionId);

    const STATUS_MAP = {
      COMPLETED: "Success",
      FAILED: "Failed",
      CANCELLED: "Failed",
      PENDING: "Pending",
    };
    const paymentStatus = STATUS_MAP[response.state] || "Pending";

    payment.paymentStatus = paymentStatus;
    payment.gatewayResponse = response;
    payment.paymentMode = response.paymentDetails?.[0]?.paymentMode;
    await payment.save();

    let updatedOrder = null;
    if (paymentStatus === "Success") {
      updatedOrder = await Order.findByIdAndUpdate(payment.order, {
        orderStatus: "Confirmed",
        payment: payment._id,
        paymentStatus: "Paid",
        $push: {
          statusHistory: {
            status: "Confirmed",
            changedAt: new Date(),
            notes: `Payment successful via PhonePe (${merchantTransactionId})`,
          },
        },
      }, { new: true });
    }

    return {
      success: true,
      paymentStatus,
      orderId: payment.order,
      merchantTransactionId,
      updatedOrder,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

 async handleCallback(authorization, responseBody) {
  try {
    const callbackResponse = this.client.validateCallback(
      phonepeConfig.CLIENT_ID,
      phonepeConfig.CLIENT_SECRET,
      authorization,
      JSON.stringify(responseBody)
    );

    const merchantTransactionId = callbackResponse.payload.merchantOrderId;

    const payment = await Payment.findOne({ merchantTransactionId });
    if (!payment) throw new Error("Payment record not found");

    const STATUS_MAP = {
      COMPLETED: "Success",
      FAILED: "Failed",
      CANCELLED: "Failed",
      PENDING: "Pending",
    };
    const paymentStatus = STATUS_MAP[callbackResponse.payload.state] || "Pending";

    payment.paymentStatus = paymentStatus;
    payment.transactionId = callbackResponse.payload.orderId;
    payment.gatewayResponse = callbackResponse;
    await payment.save();

    // Optional: auto-update order on successful payment
    let updatedOrder = null;
    if (paymentStatus === "Success") {
      updatedOrder = await Order.findByIdAndUpdate(payment.order, {
        orderStatus: "Confirmed",
        payment: payment._id,
        paymentStatus: "Paid",
        $push: {
          statusHistory: {
            status: "Confirmed",
            changedAt: new Date(),
            notes: `Payment successful via PhonePe (${merchantTransactionId})`,
          },
        },
      }, { new: true });
    }

    return {
      success: true,
      paymentStatus,
      merchantTransactionId,
      orderId: payment.order,
      updatedOrder,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


async initiateRefund(paymentId, amount) {
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error("Payment not found");

    if (payment.paymentStatus !== "Success") {
      throw new Error("Only successful payments can be refunded");
    }

    const merchantRefundId = uuidv4();
    const refundAmount = amount * 100; // Convert to paisa

    const request = RefundRequest.builder()
      .merchantRefundId(merchantRefundId)
      .originalMerchantOrderId(payment.merchantTransactionId)
      .amount(refundAmount)
      .build();

    const response = await this.client.refund(request);

    // Update payment with refund info
    payment.refunds = payment.refunds || [];
    payment.refunds.push({
      merchantRefundId,
      refundId: response.refundId,
      amount: refundAmount / 100,
      status: response.state === "COMPLETED" ? "Success" : "Failed",
      timestamp: new Date(),
    });
    await payment.save();

    return {
      success: true,
      refundId: response.refundId,
      merchantRefundId,
      status: response.state === "COMPLETED" ? "Success" : "Failed",
    };
  } catch (error) {
    console.error("Refund initiation error:", error);
    return { success: false, error: error.message };
  }
}

}

module.exports = new PhonePeService();
