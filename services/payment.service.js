
const Payment = require("../Models/paymentModel");
const Order = require("../Models/orderModel");
const {
  PAYMENT_STATUS,
  ORDER_STATUS,
} = require("../constants/payment.constants");

const ProductStock = require("../Models/ProductStockModel");
const checkoutModel = require("../Models/checkoutModel");
const CartModel = require("../Models/CartModel");
const UserCoupon = require("../Models/couponModelUser");
const PublicCoupon = require("../Models/couponModelPublic");



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


exports.finalizeOrderAfterPayment = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  if (order.orderStatus === "CONFIRMED") return order; // idempotent ✅

  /* ===============================
     1️⃣ REDUCE STOCK
  =============================== */
  for (const item of order.products) {
    const stockDoc = await ProductStock.findOne({
      product_id: item.product,
      sku: item.sku,
      is_available: true,
    });

    if (!stockDoc || stockDoc.stock_quantity < item.quantity) {
      throw new Error(`Stock mismatch for SKU ${item.sku}`);
    }

    stockDoc.stock_quantity -= item.quantity;
    if (stockDoc.stock_quantity === 0) {
      stockDoc.is_available = false;
    }

    await stockDoc.save();
  }

  /* ===============================
     2️⃣ MARK COUPON USED
  =============================== */
  if (order.couponSnapshot?.code) {
    if (order.couponSnapshot.couponType === "USER") {
      await UserCoupon.updateOne(
        { code: order.couponSnapshot.code, status: "Active" },
        {
          $set: {
            status: "Used",
            user_id: order.user,
            usedAt: new Date(),
          },
        },
      );
    }

    if (order.couponSnapshot.couponType === "PUBLIC") {
      await PublicCoupon.updateOne(
        { code: order.couponSnapshot.code },
        {
          $inc: { usageCount: 1 },
          $push: {
            usedBy: {
              user: order.user,
              orderId: order._id,
              usedAt: new Date(),
            },
          },
        },
      );
    }
  }

  /* ===============================
     3️⃣ CLEAR CART & CHECKOUT
  =============================== */
  await CartModel.updateOne({ user_id: order.user }, { $set: { items: [] } });

  await checkoutModel.deleteMany({ user: order.user });

  /* ===============================
     4️⃣ CONFIRM ORDER
  =============================== */
  order.orderStatus = "CONFIRMED";
  order.deliveryStatus = "NOT_DISPATCHED";

  await order.save();

  return order;
};