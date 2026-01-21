const ProductStock = require("../Models/ProductStockModel");
const checkoutModel = require("../Models/checkoutModel");
const CartModel = require("../Models/CartModel");
const UserCoupon = require("../Models/couponModelUser");
const PublicCoupon = require("../Models/couponModelPublic");
const Order = require("../Models/orderModel");

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
  if (order.coupon?.code) {
    if (order.coupon.couponType === "USER_COUPON") {
      await UserCoupon.updateOne(
        { code: order.coupon.code, status: "Active" },
        {
          $set: {
            status: "Used",
            user_id: order.user,
            usedAt: new Date(),
          },
        }
      );
    }

    if (order.coupon.couponType === "PUBLIC_COUPON") {
      await PublicCoupon.updateOne(
        { code: order.coupon.code },
        {
          $inc: { usageCount: 1 },
          $push: {
            usedBy: {
              user: order.user,
              orderId: order._id,
              usedAt: new Date(),
            },
          },
        }
      );
    }
  }

  /* ===============================
     3️⃣ CLEAR CART & CHECKOUT
  =============================== */
  await CartModel.updateOne(
    { user_id: order.user },
    { $set: { items: [] } }
  );

  await checkoutModel.deleteMany({ user_id: order.user });

  /* ===============================
     4️⃣ CONFIRM ORDER
  =============================== */
  order.orderStatus = "CONFIRMED";
  order.deliveryStatus = "NOT_DISPATCHED";

 

  await order.save();

  return order;
};
