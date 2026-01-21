
const Payment = require("../Models/paymentModel");
const Order = require("../Models/orderModel");
const {
  PAYMENT_STATUS,
  ORDER_STATUS,
} = require("../constants/payment.constants");

/* ======================================================
   CREATE PAYMENT (ON ORDER)
====================================================== */
exports.createPayment = async ({ order }) => {
  const payment = await Payment.create({
    order: order._id,
    user: order.user,
    amount: order.payableAmount,
    paymentStatus: PAYMENT_STATUS.INITIATED,
    paymentStatusHistory: [
      {
        status: PAYMENT_STATUS.INITIATED,
        source: "SYSTEM",
      },
    ],
  });

  order.payment = payment._id;
  order.orderStatus = ORDER_STATUS.PAYMENT_INITIATED;
  await order.save();

  return payment;
};

/* ======================================================
   SYNC PAYMENT RESULT (PHONEPE / MANUAL / VERIFY)
====================================================== */
exports.syncPaymentResult = async ({
  merchantTransactionId,
  paymentStatus,
  transactionId = null,
  gatewayResponse = {},
}) => {

  const payment = await Payment.findOne({ merchantTransactionId })
  .populate("order");

  if (!payment) throw new Error("Payment not found");

  // Avoid duplicate history entry
  if (payment.paymentStatus !== paymentStatus) {
    payment.paymentStatus = paymentStatus;
    payment.paymentStatusHistory.push({
      status: paymentStatus,
      source: gatewayResponse?.manual ? "ADMIN" : "PHONEPE",
      raw: gatewayResponse,
    });
  }

  if (transactionId) payment.transactionId = transactionId;

  /* ===============================
     ORDER STATUS MAPPING
  ================================ */
  if (payment?.order) {
  let orderStatus;

  if (paymentStatus === PAYMENT_STATUS.SUCCESS) {
    orderStatus = ORDER_STATUS.CONFIRMED;
  }

  if (paymentStatus === PAYMENT_STATUS.FAILED) {
    orderStatus = ORDER_STATUS.CANCELLED;
  }

  if (orderStatus) {
    await Order.findByIdAndUpdate(
      payment.order,
      { orderStatus },
      { new: true }
    );
  }
}

  await payment.save();
  return payment;
};
