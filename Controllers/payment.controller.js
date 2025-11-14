const phonepeService = require("../Utils/phonepe.service");
const Order = require("../Models/orderModel");
const Payment = require("../Models/paymentModel");
const phonepeConfig = require("../Utils/phonepe.config");

// Helper for IST timestamps
function getISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // +5:30
  return new Date(now.getTime() + istOffset);
}

/**
 * Shared function to update Payment + Order based on verification result
 */
async function updatePaymentAndOrder(verification, transactionId, merchantTransactionId) {
  let paymentDoc = await Payment.findOneAndUpdate(
    { merchant_transaction_id: merchantTransactionId },
    {
      payment_status: verification.paymentStatus,
      transaction_id: transactionId || verification.transactionId,
      gateway_response: verification,
      updatedAt: new Date(),
    },
    { new: true }
  );

  if (verification.paymentStatus === "SUCCESS") {
    await Order.findOneAndUpdate(
      { order_id: verification.orderId },
      {
        order_status: "Confirmed",
        payment_id: paymentDoc?.payment_id,
        payment: paymentDoc?._id,
        $push: {
          status_history: {
            status: "Confirmed",
            changed_at: getISTDate(),
            notes: `Payment successful (${merchantTransactionId})`,
          },
        },
      }
    );
  } else if (verification.paymentStatus === "FAILED") {
    await Order.findOneAndUpdate(
      { order_id: verification.orderId },
      {
        order_status: "Cancelled",
        payment_id: paymentDoc?.payment_id,
        payment: paymentDoc?._id,
        $push: {
          status_history: {
            status: "Cancelled",
            changed_at: getISTDate(),
            notes: `Payment failed (${merchantTransactionId})`,
          },
        },
      }
    );
  }

  return paymentDoc;
}

// ----------------------- Standard Payment Flows -----------------------

// Initiate PhonePe payment
exports.initiatePayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    const callbacks = {
      success: `${phonepeConfig.FRONTEND_URL}/order-success`,
      failure: `${phonepeConfig.FRONTEND_URL}/payment-failed`,
    };

    const order = await Order.findOne({ order_id: orderId });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const result = await phonepeService.initiatePayment(
      orderId,
      order.total_order_amount,
      order.user,
      { orderId, userId: order.user.user_id },
      callbacks
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      ...(error.type === "TooManyRequests" && {
        retryAfter: 60,
        message:
          "Too many requests to payment gateway. Please try again later.",
      }),
    });
  }
};

// PhonePe callback handler
exports.paymentCallback = async (req, res) => {
  try {
    const authorization = req.headers["authorization"];
    const result = await phonepeService.handleCallback(authorization, req.body);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Payment callback error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Handle payment success redirect
exports.handleSuccess = async (req, res) => {
  try {
    const { merchantTransactionId, transactionId } = req.body;

    const verification = await phonepeService.verifyPayment(
      merchantTransactionId
    );

    if (!verification.success) {
      const frontendUrl = `${phonepeConfig.FRONTEND_URL}/payment-failed?transactionId=${transactionId}&merchantTransactionId=${merchantTransactionId}&status=failed`;
      return res.redirect(frontendUrl);
    }

    await updatePaymentAndOrder(verification, transactionId, merchantTransactionId);

    if (verification.paymentStatus === "SUCCESS") {
      const frontendUrl = `${phonepeConfig.FRONTEND_URL}/order-success?transactionId=${transactionId}&merchantTransactionId=${merchantTransactionId}&status=success`;
      return res.redirect(frontendUrl);
    } else {
      const frontendUrl = `${phonepeConfig.FRONTEND_URL}/payment-failed?transactionId=${transactionId}&merchantTransactionId=${merchantTransactionId}&status=failed`;
      return res.redirect(frontendUrl);
    }
  } catch (error) {
    console.error("Payment success handling error:", error);
    res.redirect(`${phonepeConfig.FRONTEND_URL}/payment-failed?error=1`);
  }
};

// Handle payment failure redirect
exports.handleFailure = async (req, res) => {
  try {
    const { merchantTransactionId, transactionId, code } = req.body;

    const paymentDoc = await Payment.findOneAndUpdate(
      { merchant_transaction_id: merchantTransactionId },
      {
        payment_status: "FAILED",
        failure_reason: code || "User cancelled",
        gateway_response: {
          ...req.body,
          verified: false,
        },
        updatedAt: new Date(),
      },
      { new: true }
    );

    await Order.findOneAndUpdate(
      { order_id: req.body.orderId || req.body.metadata?.orderId },
      {
        order_status: "Cancelled",
        payment_id: paymentDoc?.payment_id,
        payment: paymentDoc?._id,
        $push: {
          status_history: {
            status: "Cancelled",
            changed_at: getISTDate(),
            notes: `Payment cancelled (${merchantTransactionId})`,
          },
        },
      }
    );

    const frontendUrl = `${phonepeConfig.FRONTEND_URL}/payment-cancelled?transactionId=${transactionId}&merchantTransactionId=${merchantTransactionId}&status=cancelled`;
    return res.redirect(frontendUrl);
  } catch (error) {
    console.error("Payment failure handling error:", error);
    res.redirect(`${phonepeConfig.FRONTEND_URL}/payment-failed?error=1`);
  }
};

// Verify payment by merchantTransactionId
exports.verifyPayment = async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;
    const result = await phonepeService.verifyPayment(merchantTransactionId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // auto-update order + payment here
    const paymentDoc = await updatePaymentAndOrder(result, result.transactionId, merchantTransactionId);

    res.json({
      ...result,
      updatedOrder: paymentDoc,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Initiate refund
exports.initiateRefund = async (req, res) => {
  try {
    const { paymentId, amount } = req.body;
    const result = await phonepeService.initiateRefund(paymentId, amount);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Refund initiation error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get payment details (with linked order)
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({ payment_id: paymentId });
    if (!payment) {
      return res.status(404).json({ success: false, error: "Payment not found" });
    }

    const order = await Order.findOne({
      $or: [{ payment_id: paymentId }, { payment: payment._id }],
    });

    res.json({
      success: true,
      payment,
      order,
    });
  } catch (error) {
    console.error("Get payment details error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------- Admin / Utility Endpoints -----------------------

// Get payment by merchantTransactionId
exports.getPaymentByMerchant = async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;

    const payment = await Payment.findOne({ merchant_transaction_id: merchantTransactionId });
    if (!payment) {
      return res.status(404).json({ success: false, error: "Payment not found" });
    }

    res.json({ success: true, payment });
  } catch (error) {
    console.error("Get payment by merchantTransactionId error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all pending payments
exports.getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ payment_status: "PENDING" }).sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (error) {
    console.error("Get pending payments error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update payment status manually (admin utility)
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { merchantTransactionId, status, notes } = req.body;

    const paymentDoc = await Payment.findOneAndUpdate(
      { merchant_transaction_id: merchantTransactionId },
      {
        payment_status: status,
        $push: {
          status_history: {
            status,
            changed_at: getISTDate(),
            notes: notes || "Updated manually",
          },
        },
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!paymentDoc) {
      return res.status(404).json({ success: false, error: "Payment not found" });
    }

    res.json({ success: true, payment: paymentDoc });
  } catch (error) {
    console.error("Update payment status error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
