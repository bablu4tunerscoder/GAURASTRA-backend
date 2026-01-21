const Order = require("../Models/orderModel");
const Payment = require("../Models/paymentModel");
const phonepeService = require("../services/phonepe.service");
const {
  createPayment,
  syncPaymentResult,
} = require("../services/payment.service");

const { pagination_ } = require("../utilities/pagination_");

const {
  PHONEPE_STATE_MAP,
  PAYMENT_STATUS,
} = require("../constants/payment.constants");
const { finalizeOrderAfterPayment } = require("../services/orderFinalize.service");

/* ======================================================
   INITIATE PAYMENT
====================================================== */
exports.initiatePayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId)
      return res.status(400).json({ success: false, message: "orderId required" });

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    if (["CANCELLED", "CONFIRMED"].includes(order.orderStatus))
      return res.status(400).json({
        success: false,
        message: `Order already ${order.orderStatus}`,
      });

    const payment = await createPayment({ order });

    const response = await phonepeService.initiatePayment({
      merchantTransactionId: payment.merchantTransactionId,
      amount: payment.amount,
      userId: order.user.toString(),
      callbacks: {
        success: `${process.env.FRONTEND_URL}/order-success`,
        failure: `${process.env.FRONTEND_URL}/payment-failed`,
      },
    });

    payment.phonepePaymentUrl = response.redirectUrl;
    await payment.save();

    res.json({
      success: true,
      paymentId: payment._id,
      merchantTransactionId: payment.merchantTransactionId,
      paymentUrl: response.redirectUrl,
    });
  } catch (error) {
    console.error("initiatePayment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   PHONEPE CALLBACK (WEBHOOK)
====================================================== */
exports.paymentCallback = async (req, res) => {
  try {
    const authorization = req.headers["authorization"];
    if (!authorization)
      return res.status(200).json({ success: false });

    const response = await phonepeService.handleCallback(
      authorization,
      req.body
    );

    if (!response?.success) return res.status(200).json(response);

    const paymentStatus =
      PHONEPE_STATE_MAP[response.state] || PAYMENT_STATUS.PENDING;

    await syncPaymentResult({
      merchantTransactionId: response.merchantTransactionId,
      paymentStatus,
      transactionId: response.transactionId,
      gatewayResponse: response,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("paymentCallback error:", error);
    res.status(200).json({ success: false });
  }
};

/* ======================================================
   VERIFY PAYMENT (MANUAL / POLLING)
====================================================== */
exports.verifyPayment = async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;

    const response = await phonepeService.verifyPayment(merchantTransactionId);

    const paymentStatus =
      PHONEPE_STATE_MAP[response.state] || PAYMENT_STATUS.PENDING;

    const payment = await syncPaymentResult({
      merchantTransactionId,
      paymentStatus,
      transactionId: response.orderId,
      gatewayResponse: response,
    });

    res.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("verifyPayment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   HANDLE SUCCESS REDIRECT
====================================================== */
exports.handleSuccess = async (req, res) => {
  try {
    const { merchantTransactionId } = req.body;

    const response = await phonepeService.verifyPayment(merchantTransactionId);

    const paymentStatus =
      PHONEPE_STATE_MAP[response.state] || PAYMENT_STATUS.PENDING;

    const payment = await syncPaymentResult({
      merchantTransactionId,
      paymentStatus,
      transactionId: response.orderId,
      gatewayResponse: response,
    });

    // 🔥 IMPORTANT PART
    if (paymentStatus === PAYMENT_STATUS.SUCCESS) {
      await finalizeOrderAfterPayment(payment.order);
    }

    return res.redirect(
      `${process.env.FRONTEND_URL}/order-success?merchantTransactionId=${merchantTransactionId}`
    );
  } catch (error) {
    console.error("handleSuccess error:", error);
    return res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
  }
};

/* ======================================================
   HANDLE FAILURE REDIRECT
====================================================== */
exports.handleFailure = async (req, res) => {
  try {
    const { merchantTransactionId } = req.body;

    await syncPaymentResult({
      merchantTransactionId,
      paymentStatus: PAYMENT_STATUS.FAILED,
      gatewayResponse: req.body,
    });

    res.redirect(
      `${process.env.FRONTEND_URL}/payment-failed?merchantTransactionId=${merchantTransactionId}`
    );
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
  }
};

/* ======================================================
   GET PAYMENT DETAILS (WITH ORDER + USER)
====================================================== */
exports.getPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate({
      path: "order",
      populate: { path: "user", select: "name email phone" },
    });

    if (!payment)
      return res.status(404).json({ success: false, message: "Payment not found" });

    res.json({
      success: true,
      payment,
      order: payment.order,
      user: payment.order?.user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   GET PAYMENT BY MERCHANT TXN ID
====================================================== */
exports.getPaymentByMerchant = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      merchantTransactionId: req.params.merchantTransactionId,
    }).populate({
      path: "order",
      populate: { path: "user", select: "name email phone" },
    });

    if (!payment)
      return res.status(404).json({ success: false, message: "Payment not found" });

    res.json({
      success: true,
      payment,
      order: payment.order,
      user: payment.order?.user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   GET PENDING PAYMENTS (ADMIN)
====================================================== */
exports.getPendingPayments = async (req, res) => {
  try {
    const { page, limit, skip, hasPrevPage } = pagination_(req.query);

    const [payments, totalRecords] = await Promise.all([
      Payment.find({ paymentStatus: PAYMENT_STATUS.PENDING })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments({ paymentStatus: PAYMENT_STATUS.PENDING }),
    ]);

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        hasPrevPage,
        hasNextPage: page * limit < totalRecords,
      },
      payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   MANUAL PAYMENT STATUS UPDATE (ADMIN)
====================================================== */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { merchantTransactionId, paymentStatus } = req.body;

    const payment = await syncPaymentResult({
      merchantTransactionId,
      paymentStatus,
      gatewayResponse: { manual: true },
    });

    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   INITIATE REFUND
====================================================== */
exports.initiateRefund = async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment)
      return res.status(404).json({ success: false, message: "Payment not found" });

    const result = await phonepeService.initiateRefund(payment, amount);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
