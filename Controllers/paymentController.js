const phonepeService = require("../utilities/phonepe.service");
const Order = require("../Models/orderModel");
const Payment = require("../Models/paymentModel");
const phonepeConfig = require("../utilities/phonepe.config");
const { pagination_ } = require("../utilities/pagination_");

// Helper for IST timestamps
function getISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // +5:30
  return new Date(now.getTime() + istOffset);
}

/**
 * Shared function to update Payment + Order based on verification result
 */
async function updatePaymentAndOrder(
  verification,
  transactionId,
  merchantTransactionId
) {
  // 🔧 FIX: correct field names + status mapping
  const paymentDoc = await Payment.findOneAndUpdate(
    { merchantTransactionId },
    {
      paymentStatus:
        verification.paymentStatus === "SUCCESS" ? "Success" : "Failed",

      gatewayTransactionId:
        transactionId || verification.transactionId,

      gatewayResponse: verification,
    },
    { new: true }
  );

  if (!paymentDoc) return null;

  // 🔧 FIX: update order via payment.order reference
  if (verification.paymentStatus === "SUCCESS") {
    await Order.findByIdAndUpdate(paymentDoc.order, {
      orderStatus: "Confirmed",
      paymentStatus: "Paid",
      payment: paymentDoc._id,
    });
  }

  if (verification.paymentStatus === "FAILED") {
    await Order.findByIdAndUpdate(paymentDoc.order, {
      orderStatus: "Cancelled",
      paymentStatus: "Failed",
      payment: paymentDoc._id,
    });
  }

  return paymentDoc;
}



exports.initiatePayment = async (req, res) => {
  try {
  
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.paymentStatus === "Paid") {
      return res.status(400).json({
        success: false,
        message: "Order already Confirmed",
      });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is cancelled",
      });
    }

    if (order.paymentStatus === "Pending") {
      return res.status(400).json({
        success: false,
        message: "Payment already initiated",
      });
    }

    const merchantTransactionId =
      "MTX_" + Date.now() + "_" + Math.floor(Math.random() * 100000);

    const callbacks = {
      success: `${process.env.FRONTEND_URL}/order-success`,
      failure: `${process.env.FRONTEND_URL}/payment-failed`,
    };

    const payment = await Payment.create({
      order: order._id,
      amount: order.totalOrderAmount,
      currency: order.currency || "INR",
      merchantTransactionId,
      paymentGateway: "PhonePe",
      paymentStatus: "Initiated",
      callbacks,
    });

    order.payment = payment._id;
    order.paymentStatus = "Pending";
    await order.save();


    const phonepeResponse = await phonepeService.initiatePayment(
      merchantTransactionId,        // gateway reference
      payment.amount,               // amount
      order.user.toString(),        // userId
      {
        orderId: order._id.toString(),
        paymentId: payment._id.toString(),
      },
      payment.callbacks
    );

    if (!phonepeResponse?.success) {
      payment.paymentStatus = "Failed";
      payment.failureReason =
        phonepeResponse?.message || "Gateway error";
      await payment.save();

      // 🔧 FIX: Sync order state on failure
      order.paymentStatus = "Failed";
      await order.save();

      return res.status(400).json({
        success: false,
        message: "Payment initiation failed",
      });
    }

    payment.phonepePaymentUrl = phonepeResponse.paymentUrl;
    payment.gatewayResponse = phonepeResponse;
    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Payment initiated",
      paymentId: payment._id,
      merchantTransactionId,
      paymentUrl: phonepeResponse.paymentUrl,
    });
  } catch (error) {
    console.error("Payment initiation error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Payment initiation failed",
    });
  }
};



// PhonePe callback handler
exports.paymentCallback = async (req, res) => {
  try {

    const authorization = req.headers["authorization"];
    if (!authorization) {
      console.error("PhonePe callback missing authorization header");
      return res.status(200).json({
        success: false,
        message: "Authorization header missing",
      });
    }

    const result = await phonepeService.handleCallback(
      authorization,
      req.body
    );

    if (!result?.success) {
      console.error("PhonePe callback verification failed", result);
      return res.status(200).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Payment callback error:", error);

    return res.status(200).json({
      success: false,
      message: "Callback processing error",
    });
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
      return res.redirect(
        `${phonepeConfig.FRONTEND_URL}/payment-failed?transactionId=${transactionId}&merchantTransactionId=${merchantTransactionId}&status=failed`
      );
    }

    await updatePaymentAndOrder(
      verification,
      transactionId,
      merchantTransactionId
    );

    if (verification.paymentStatus === "SUCCESS") {
      return res.redirect(
        `${phonepeConfig.FRONTEND_URL}/order-success?transactionId=${transactionId}&merchantTransactionId=${merchantTransactionId}&status=success`
      );
    }

    return res.redirect(
      `${phonepeConfig.FRONTEND_URL}/payment-failed?transactionId=${transactionId}&merchantTransactionId=${merchantTransactionId}&status=failed`
    );
  } catch (error) {
    console.error("Payment success handling error:", error);
    return res.redirect(
      `${phonepeConfig.FRONTEND_URL}/payment-failed?error=1`
    );
  }
};


// Handle payment failure redirect
exports.handleFailure = async (req, res) => {
  try {
    const { merchantTransactionId, transactionId, code } = req.body;

    // 🔧 FIX: correct field names + enum
    const paymentDoc = await Payment.findOneAndUpdate(
      { merchantTransactionId },
      {
        paymentStatus: "Failed",
        failureReason: code || "User cancelled",
        gatewayResponse: {
          ...req.body,
          verified: false,
        },
      },
      { new: true }
    );

    // 🔧 FIX: update order using payment.order reference
    if (paymentDoc?.order) {
      await Order.findByIdAndUpdate(paymentDoc.order, {
        orderStatus: "Cancelled",
        paymentStatus: "Failed",
        payment: paymentDoc._id,
      });
    }

    const frontendUrl = `${phonepeConfig.FRONTEND_URL}/payment-cancelled?transactionId=${transactionId}&merchantTransactionId=${merchantTransactionId}&status=cancelled`;
    return res.redirect(frontendUrl);
  } catch (error) {
    console.error("Payment failure handling error:", error);
    return res.redirect(
      `${phonepeConfig.FRONTEND_URL}/payment-failed?error=1`
    );
  }
};


// Verify payment by merchantTransactionId
exports.verifyPayment = async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;

    const result = await phonepeService.verifyPayment(
      merchantTransactionId
    );

    if (!result?.success) {
      return res.status(400).json(result);
    }

    // 🔧 FIX: idempotent check (logic same)
    const existingPayment = await Payment.findOne({
      merchantTransactionId,
    });

    if (
      existingPayment &&
      ["Success", "Failed"].includes(existingPayment.paymentStatus)
    ) {
      return res.json({
        ...result,
        payment: existingPayment,
        alreadyVerified: true,
      });
    }

    // 🔧 FIX: schema-aligned updater
    const paymentDoc = await updatePaymentAndOrder(
      result,
      result.transactionId,
      merchantTransactionId
    );

    return res.json({
      ...result,
      payment: paymentDoc, // 🔧 FIX: correct naming
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


// Initiate refund
exports.initiateRefund = async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    // 🔧 FIX: basic input validation (logic same)
    if (!paymentId || !amount) {
      return res.status(400).json({
        success: false,
        message: "paymentId and amount are required",
      });
    }

    const result = await phonepeService.initiateRefund(
      paymentId,
      amount
    );

    if (!result?.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("Refund initiation error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


// Get payment details (with linked order)
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    // 🔧 FIX: payment_id → _id (schema aligned)
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: "Payment not found",
      });
    }

    // 🔧 FIX: order lookup via payment ObjectId
    const order = await Order.findOne({
      payment: payment._id,
    });

    return res.json({
      success: true,
      payment,
      order,
    });
  } catch (error) {
    console.error("Get payment details error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


// ----------------------- Admin / Utility Endpoints -----------------------

// Get payment by merchantTransactionId
exports.getPaymentByMerchant = async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;

    const payment = await Payment.findOne({
      merchantTransactionId: merchantTransactionId
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: "Payment not found",
      });
    }

    res.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Get payment by merchantTransactionId error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


// Get all pending payments
exports.getPendingPayments = async (req, res) => {
  try {
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    const [payments, totalRecords] = await Promise.all([
      Payment.find({ payment_status: "PENDING" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Payment.countDocuments({ payment_status: "PENDING" }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },
      payments,
    });
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
      { merchantTransactionId: merchantTransactionId },
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
