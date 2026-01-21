const Order = require("../Models/orderModel");
const Payment = require("../Models/paymentModel");
const User = require("../Models/userModel");
const ProductImg = require("../Models/ProductImgModel");
const UserCoupon = require("../Models/couponModelUser");
const PublicCoupon = require("../Models/couponModelPublic");
const Product = require("../Models/ProductModel");
const { pagination_ } = require("../utilities/pagination_");
const CartModel = require("../Models/CartModel");

const ProductStock = require("../Models/ProductStockModel");
const checkoutModel = require("../Models/checkoutModel");
const userAddressModel = require("../Models/userAddressModel");
const { generateOrderId } = require("../utilities/generateOrderId");

// Create New Order
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.userid;

    /* ===============================
       1️⃣ FETCH CHECKOUT
    =============================== */
    const checkout = await checkoutModel
      .findOne({
        user_id: userId,
        status: "ACTIVE",
        expiresAt: { $gt: new Date() },
      })
      .lean();

    if (!checkout) {
      return res.status(400).json({
        success: false,
        message: "Checkout expired or not found",
      });
    }

    /* ===============================
       2️⃣ FETCH USER
    =============================== */
    
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* ===============================
       3️⃣ FINAL STOCK CHECK & REDUCE
    =============================== */
    for (const item of checkout.cart_items) {
      const stockDoc = await ProductStock.findOne({
        product_id: item.product_id,
        sku: item.sku,
        is_available: true,
      });

      if (!stockDoc || stockDoc.stock_quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Stock not available for SKU ${item.sku}`,
        });
      }

      // stockDoc.stock_quantity -= item.quantity;
      // if (stockDoc.stock_quantity === 0) {
      //   stockDoc.is_available = false;
      // }
      // await stockDoc.save();
    }

    /* ===============================
       4️⃣ CREATE ORDER (CHECKOUT SNAPSHOT)
    =============================== */
    const orderProducts = checkout.cart_items.map((item) => ({
      product: item.product_id,
      sku: item.sku,

      snapshot: {
        name: item.name, 
        price: item.price.discounted_price ?? item.price.original_price,
        size: item.size || null, 
        color: item.color || null, 
      },

      quantity: item.quantity,
      totalPrice: item.item_total,
    }));

    // deliveryAddress ko UserAddress se fetch karke object banaye
    const deliveryAddress = await userAddressModel.findById(
      checkout.address_id,
    ).lean();

    const order = await Order.create({
      user: userId,

      order_id: generateOrderId(),

      userSnapshot: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },

      deliveryAddress, 
      products: orderProducts, 

      totalOrderAmount: checkout.price_details.total_amount,
      currency: "INR",
      deliveryStatus:'PENDING',
      orderStatus: "CREATED",
    });

    /* ===============================
       5️⃣ MARK COUPON USED (FINAL LOCK)
    =============================== */
    // if (checkout.coupon?.code) {
    //   if (checkout.coupon.couponType === "USER_COUPON") {
    //     await UserCoupon.updateOne(
    //       { code: checkout.coupon.code, status: "Active" },
    //       {
    //         $set: {
    //           status: "Used",
    //           user_id: userId,
    //           usedAt: new Date(),
    //         },
    //       },
    //     );
    //   }

    //   if (checkout.coupon.couponType === "PUBLIC_COUPON") {
    //     await PublicCoupon.updateOne(
    //       { code: checkout.coupon.code },
    //       {
    //         $inc: { usageCount: 1 },
    //         $push: {
    //           usedBy: {
    //             user: userId,
    //             orderId: order._id,
    //             usedAt: new Date(),
    //           },
    //         },
    //       },
    //     );
    //   }
    // }

    /* ===============================
       6️⃣ CLEAR CART & CHECKOUT
    =============================== */
    // await CartModel.updateOne({ user_id: userId }, { $set: { items: [] } });

    // await checkoutModel.deleteOne({ _id: checkout._id });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      orderId: order._id,
      order,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// Get order details with payment information by order_id
exports.getOrderWithPayment = async (req, res) => {
  try {
    const { order_id } = req.params;

    // Find the order
    const order = await Order.findById(order_id).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Find the associated payment
    const payment = await Payment.findOne({ order:order_id });

    // Combine the data
    const response = {
      success: true,
      order: {
        ...order.toObject(),
        createdAtIST: new Date(order.createdAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }), 
      },
      payment: payment ? payment.toObject() : null,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching order with payment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get all orders with their payment status (for admin dashboard)
exports.getAllOrdersWithPayments = async (req, res) => {
  try {
   
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

   
    const [orders, totalRecords] = await Promise.all([
      Order.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("payment"), 
      Order.countDocuments(),
    ]);


    const ordersWithPayments = orders.map((order) => ({
      ...order.toObject(),
      createdAtIST: new Date(order.createdAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
      // payment is already included via populate
    }));

  
    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    
    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },
      orders: ordersWithPayments,
    });
  } catch (error) {
    console.error("Error fetching all orders with payments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// get order and payment details merged together using user_id
exports.getDetailswithUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "Missing user_id parameter",
      });
    }

    // 1️⃣ Fetch orders + populate products + payment
    const orders = await Order.find({ user: user_id })
      .populate({
        path: "products.product",
        select: "-product_details", // avoid heavy details if not needed
      })
      .populate({
        path: "payment",
        select: "-__v",
      })
      .lean();

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: `No orders found for user_id: ${user_id}`,
      });
    }

    // 2️⃣ Add IST date formatting
    const enrichedOrders = orders.map((order) => ({
      ...order,
      createdAtIST: new Date(order.createdAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
      products: order.products.map((p) => ({
        ...p,
        product_snapshot: p.snapshot, // keep snapshot
        sku: p.sku,
        product_details: p.product || null, // populated product details
      })),
    }));

    return res.status(200).json({
      success: true,
      message: "Orders with products and payments fetched",
      data: enrichedOrders,
    });
  } catch (error) {
    console.error("Error fetching orders with user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { orderStatus } = req.body;

    const validOrderStatuses = [
      "CONFIRMED",
      "CANCELLED",
    ];

    if (!validOrderStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid orderStatus value",
      });
    }

    const order = await Order.findOne({ order_id });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.orderStatus = orderStatus;
    await order.save(); // 🔥 history auto update hogi

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { deliveryStatus } = req.body;

    const validDeliveryStatuses = [
      "PENDING",
      "NOT_DISPATCHED",
      "DISPATCHED",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "RETURNED",
    ];

    if (!validDeliveryStatuses.includes(deliveryStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deliveryStatus value",
      });
    }

    const order = await Order.findOne({ order_id });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // 🔁 Update delivery status
    order.deliveryStatus = deliveryStatus;

   
    if (deliveryStatus === "RETURNED") {
      order.orderStatus = "CANCELLED";
    }

    await order.save(); 

    res.status(200).json({
      success: true,
      message:
        deliveryStatus === "RETURNED"
          ? "Order returned and cancelled successfully"
          : "Delivery status updated successfully",
      order,
    });
  } catch (error) {
    console.error("updateDeliveryStatus error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



// Delete order by order_id
exports.deleteOrder = async (req, res) => {
  try {
    const { order_id } = req.params;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: "Missing order_id parameter",
      });
    }

    // 1️⃣ Find order by order_id (user readable) or _id (MongoDB)
    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // 2️⃣ Delete the order
    await Order.deleteOne({ _id: order._id });

    // 3️⃣ Delete related payment if exists
    await Payment.deleteOne({ order: order._id });

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
      order_id: order.order_id,
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
