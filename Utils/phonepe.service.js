const {
  StandardCheckoutClient,
  Env,
  StandardCheckoutPayRequest,
  CreateSdkOrderRequest,
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
          order_id: orderId,
          amount,
          merchant_transaction_id: merchantTransactionId,
          gateway_response: { metadata },
          callbacks: {
            success: callbacks.success || phonepeConfig.REDIRECT_URL,
            failure:
              callbacks.failure ||
              `${phonepeConfig.FRONTEND_URL}/payment-failed`,
          },
        });
        await payment.save();

        // Create the request object using the correct builder pattern
        const requestBuilder = StandardCheckoutPayRequest.builder()
          .merchantOrderId(merchantTransactionId)
          .amount(amount * 100) // Convert to paisa
          .redirectUrl(callbacks.success || phonepeConfig.REDIRECT_URL);

        // Add metaInfo if needed
        const metaInfo = MetaInfo.builder()
          .udf1(metadata.udf1 || "Order Payment")
          .udf2(
            JSON.stringify({
              orderId,
              userId: user.user_id,
              successUrl: callbacks.success,
              failureUrl: callbacks.failure,
            })
          )
          .build();

        requestBuilder.metaInfo(metaInfo);

        // Build the final request
        const request = requestBuilder.build();

        const response = await this.client.pay(request);

        payment.phonepe_payment_url = response.redirectUrl;
        payment.transaction_id = response.orderId;
        await payment.save();

        return {
          success: true,
          paymentId: payment.payment_id,
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
      const payment = await Payment.findOne({
        merchant_transaction_id: merchantTransactionId,
      });
      if (!payment) {
        throw new Error("Payment not found");
      }

      const response = await this.client.getOrderStatus(merchantTransactionId);

      // More detailed status handling
      let paymentStatus;
      switch (response.state) {
        case "COMPLETED":
          paymentStatus = "SUCCESS";
          break;
        case "FAILED":
          paymentStatus = "FAILED";
          break;
        case "CANCELLED":
          paymentStatus = "CANCELLED";
          break;
        default:
          paymentStatus = "PENDING";
      }

      // Update payment status
      payment.payment_status = paymentStatus;
      payment.gateway_response = response;
      payment.payment_mode = response.paymentDetails?.[0]?.paymentMode;
      await payment.save();

      // Update order status only if payment is successful
      let updatedOrder = null;
      if (paymentStatus === "SUCCESS") {
        updatedOrder = await Order.findOneAndUpdate(
          { order_id: payment.order_id },
          {
            order_status: "Confirmed",
            $push: {
              status_history: {
                status: "Confirmed",
                changed_at: new Date(),
                notes: `Payment successful via PhonePe (${merchantTransactionId})`,
              },
            },
          },
          { new: true }
        );
      }

      return {
        success: true,
        paymentStatus,
        orderId: payment.order_id,
        merchantTransactionId,
        updatedOrder,
      };
    } catch (error) {
      // console.error("Payment verification error:", error);
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
      const payment = await Payment.findOne({
        merchant_transaction_id: merchantTransactionId,
      });

      if (!payment) {
        throw new Error("Payment record not found");
      }

      // Update payment based on callback
      let paymentStatus;
      switch (callbackResponse.payload.state) {
        case "COMPLETED":
          paymentStatus = "SUCCESS";
          break;
        case "FAILED":
          paymentStatus = "FAILED";
          break;
        case "CANCELLED":
          paymentStatus = "CANCELLED";
          break;
        default:
          paymentStatus = "PENDING";
      }

      payment.payment_status = paymentStatus;
      payment.transaction_id = callbackResponse.payload.orderId;
      payment.gateway_response = callbackResponse;
      await payment.save();

      return {
        success: true,
        paymentStatus,
        merchantTransactionId,
        orderId: payment.order_id,
      };
    } catch (error) {
      // console.error("Callback handling error:", error);
      return { success: false, error: error.message };
    }
  }

  async initiateRefund(paymentId, amount) {
    try {
      const payment = await Payment.findOne({ payment_id: paymentId });
      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.payment_status !== "SUCCESS") {
        throw new Error("Only successful payments can be refunded");
      }

      const merchantRefundId = uuidv4();
      const refundAmount = amount * 100; // Convert to paisa

      const request = RefundRequest.builder()
        .merchantRefundId(merchantRefundId)
        .originalMerchantOrderId(payment.merchant_transaction_id)
        .amount(refundAmount)
        .build();

      const response = await this.client.refund(request);

      // Update payment with refund details
      payment.refunds = payment.refunds || [];
      payment.refunds.push({
        refundId: response.refundId,
        amount: refundAmount / 100,
        status: response.state,
        timestamp: new Date(),
      });
      await payment.save();

      return {
        success: true,
        refundId: response.refundId,
        status: response.state,
      };
    } catch (error) {
      console.error("Refund initiation error:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PhonePeService();
