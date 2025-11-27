const Order = require("../Models/orderModel");
const Payment = require("../Models/paymentModel");
const User = require("../Models/userModel");
const ProductImg = require("../Models/ProductImgModel");
const Lead = require("../Models/lead.model");
const Product = require("../Models/ProductModel");

// Create New Order
exports.createOrder = async (req, res) => {
  try {
    const { user_id, delivery_address, products, coupon_code } = req.body;

    // Validate required fields
    const user = await User.findOne({ user_id });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (
      !delivery_address ||
      !delivery_address.full_name ||
      !delivery_address.phone ||
      !delivery_address.street ||
      !delivery_address.city ||
      !delivery_address.state ||
      !delivery_address.pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is incomplete",
      });
    }

    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products list is empty",
      });
    }

    // Calculate total amount
    let totalAmount = 0;
    const validatedProducts = products.map((product) => {
      if (
        !product.product_id ||
        !product.name ||
        !product.price ||
        !product.quantity ||
        !product.size
      ) {
        throw new Error("Product information is incomplete");
      }
      const productTotal = product.price * product.quantity;
      totalAmount += productTotal;
      return {
        product_id: product.product_id,
        name: product.name,
        price: product.price,
        quantity: product.quantity,
        total_price: productTotal,
        size: product.size,
      };
    });

    // --- START: COUPON VALIDATION LOGIC ---
    let discountAmount = 0;
    let appliedCoupon = null;

    if (coupon_code) {
      const lead = await Lead.findOne({ couponCode: coupon_code });

      if (!lead) {
        return res.status(404).json({ message: "Invalid coupon code." });
      }
      if (lead.used) {
        return res.status(400).json({ message: "This coupon has already been used." });
      }

      // If valid, set the discount amount
      discountAmount = 100;
      appliedCoupon = lead; // Keep track of the lead/coupon to update later
    }
    // --- END: COUPON VALIDATION LOGIC ---

    const finalAmount = totalAmount - discountAmount;

    // Create order
    const order = new Order({
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      delivery_address,
      products: validatedProducts,
      total_order_amount: finalAmount, // Use the final discounted amount
      discount_amount: discountAmount, // Store the discount amount
      applied_coupon: coupon_code || null, // Store the applied coupon code
      payment_status: "Enquiry",
      order_status: "Pending",
      createdAt: new Date(),
    });

    await order.save();

    // --- START: MARK COUPON AS USED ---
    if (appliedCoupon) {
      appliedCoupon.used = true;
      await appliedCoupon.save(); // Save the 'used' status to the database
    }
    // --- END: MARK COUPON AS USED ---

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order_id: order.order_id,
      order: {
        ...order.toObject(),
        createdAtIST: new Date(order.createdAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
      },
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  }
};

// Get order details with payment information by order_id
exports.getOrderWithPayment = async (req, res) => {
  try {
    const { order_id } = req.params;

    // Find the order
    const order = await Order.findOne({ order_id }).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Find the associated payment
    const payment = await Payment.findOne({ order_id });

    // Combine the data
    const response = {
      success: true,
      order: {
        ...order.toObject(),
        createdAtIST: new Date(order.createdAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }), // ✅ Include IST time in details
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
    // Find all orders
    const orders = await Order.find().sort({ createdAt: -1 });

    // Get all order IDs
    const orderIds = orders.map((order) => order.order_id);

    // Find all payments for these orders
    const payments = await Payment.find({ order_id: { $in: orderIds } });

    // Create a payment map for quick lookup
    const paymentMap = {};
    payments.forEach((payment) => {
      paymentMap[payment.order_id] = payment;
    });

    // Combine the data
    const ordersWithPayments = orders.map((order) => ({
      ...order.toObject(),
      createdAtIST: new Date(order.createdAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }), // ✅ Admin list shows IST
      payment: paymentMap[order.order_id] || null,
    }));

    res.status(200).json({
      success: true,
      count: ordersWithPayments.length,
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

    // 1️⃣ Get all orders
    const orders = await Order.find({ "user.user_id": user_id }).lean();

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No orders found for user_id: ${user_id}`,
      });
    }

    // 2️⃣ Extract order_ids
    const orderIds = orders.map((o) => o.order_id);

    // 3️⃣ Fetch payments
    const payments = await Payment.find({ order_id: { $in: orderIds } }).lean();
    const paymentMap = Object.fromEntries(
      payments.map((p) => [p.order_id, p])
    );

    // 4️⃣ Extract unique product_ids
    const productIds = [
      ...new Set(
        orders.flatMap((o) =>
          o.products.map((p) => p.product_id)
        )
      ),
    ];

    // 5️⃣ Fetch ALL product details
    const products = await Product.find({
      product_id: { $in: productIds },
    }).select('-product_details').lean();

    const productDetailMap = Object.fromEntries(
      products.map((p) => [p.product_id, p])
    );

    // 6️⃣ Fetch primary images
    const productImages = await ProductImg.find({
      product_id: { $in: productIds },
      is_primary: true,
    }).lean();

    const imageMap = Object.fromEntries(
      productImages.map((img) => [img.product_id, img.image_url])
    );

    // 7️⃣ Merge everything
    const enrichedOrders = orders.map((order) => ({
      order: {
        ...order,
        createdAtIST: new Date(order.createdAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
        products: order.products.map((p) => ({
          ...p,
          product_image: imageMap[p.product_id] || null,
          product_details: productDetailMap[p.product_id] || null,  // ✅ FULL product details
        })),
      },
      payment: paymentMap[order.order_id] || null,
    }));

    return res.status(200).json({
      success: true,
      message: "Orders + payments + product full details fetched",
      data: enrichedOrders,
    });
  } catch (error) {
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
    const { order_status } = req.body;

    const validStatuses = [
      "Pending",
      "Confirmed",
      "Dispatched",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];
    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({ error: "Invalid order_status value." });
    }

    const order = await Order.findOne({ order_id });
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    const now = new Date();

    // ✅ Format timestamp in IST (human readable)
    const istDateTime = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    order.status_history.push({
      status: order_status,
      changed_at: now, // keep raw UTC timestamp for DB
      notes: `${order_status} on ${istDateTime}`, // store human-readable IST
    });

    // Update main order_status
    order.order_status = order_status;
    await order.save();

    res
      .status(200)
      .json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete order by order_id
exports.deleteOrder = async (req, res) => {
  try {
    const { order_id } = req.params;

    // Check if order exists
    const order = await Order.findOne({ order_id });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Delete the order
    await Order.deleteOne({ order_id });

    // (Optional) If you also want to remove payment when order is deleted
    await Payment.deleteOne({ order_id });

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
      order_id,
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
