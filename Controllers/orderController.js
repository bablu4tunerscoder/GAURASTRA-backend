const Order = require("../Models/orderModel");
const Payment = require("../Models/paymentModel");
const User = require("../Models/userModel");
const ProductImg = require("../Models/ProductImgModel");
const UserCoupon = require("../Models/couponModelUser");
const PublicCoupon = require("../Models/couponModelPublic");
const Product = require("../Models/ProductModel");
const { pagination_ } = require("../utilities/pagination_");
const CartModel = require("../Models/CartModel");
const Pricing = require("../Models/ProductPricingModel");
const ProductStock = require("../Models/ProductStockModel");


exports.applyCheckoutCoupon = async (req, res) => {
  try {
    /* ===============================
       STEP 1️⃣ BASIC INPUT
       =============================== */

    const userId = req.user._id;
    const { coupon_code } = req.body;

    if (!coupon_code) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    /* ===============================
       STEP 2️⃣ USER & CART
       =============================== */

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const cart = await CartModel.findOne({ user_id: userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    /* ===============================
       STEP 3️⃣ CART TOTAL (SKU BASED)
       =============================== */

    let totalAmount = 0;

    for (const item of cart.items) {
      // pricing SKU se hi niklegi
      const pricing = await Pricing.findOne({
        product_id: item.product_id,
        sku: item.sku,
        is_active: true,
      });

      if (!pricing) {
        return res.status(400).json({
          success: false,
          message: `Pricing not found for SKU ${item.sku}`,
        });
      }

      const price =
        pricing.discounted_price ?? pricing.original_price;

      totalAmount += price * item.quantity;
    }

    /* ===============================
       STEP 4️⃣ COUPON CHECK
       =============================== */

    let discountAmount = 0;
    let couponType = null;

    /* ---------- 4.1 USER COUPON ---------- */
    const userCoupon = await UserCoupon.findOne({
      code: coupon_code,
      mobileNumber: user.phone,
      status: "Active",
    });

    if (userCoupon) {
      if (userCoupon.expiresAt && userCoupon.expiresAt < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Coupon expired",
        });
      }

      if (totalAmount < userCoupon.minCartAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum cart ₹${userCoupon.minCartAmount} required`,
        });
      }

      discountAmount =
        userCoupon.discountType === "percentage"
          ? Math.min(
              (totalAmount * userCoupon.discountValue) / 100,
              totalAmount
            )
          : Math.min(userCoupon.discountValue, totalAmount);

      couponType = "USER_COUPON";
    } else {
      /* ---------- 4.2 PUBLIC COUPON ---------- */

      const publicCoupon = await PublicCoupon.findOne({
        code: coupon_code,
        status: "Active",
      });

      if (!publicCoupon) {
        return res.status(404).json({
          success: false,
          message: "Invalid coupon code",
        });
      }

      if (
        publicCoupon.expiresAt &&
        publicCoupon.expiresAt < new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "Coupon expired",
        });
      }

      if (
        publicCoupon.usageLimit &&
        publicCoupon.usageCount >= publicCoupon.usageLimit
      ) {
        return res.status(400).json({
          success: false,
          message: "Coupon usage limit reached",
        });
      }

      const userUsageCount = publicCoupon.usedBy.filter(
        (u) => u.user.toString() === userId.toString()
      ).length;

      if (userUsageCount >= publicCoupon.perUserLimit) {
        return res.status(400).json({
          success: false,
          message: "You already used this coupon",
        });
      }

      if (totalAmount < publicCoupon.minCartAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum cart ₹${publicCoupon.minCartAmount} required`,
        });
      }

      discountAmount =
        publicCoupon.discountType === "percentage"
          ? Math.min(
              (totalAmount * publicCoupon.discountValue) / 100,
              totalAmount
            )
          : Math.min(publicCoupon.discountValue, totalAmount);

      couponType = "PUBLIC_COUPON";
    }

    /* ===============================
       STEP 5️⃣ RESPONSE (NO DB UPDATE)
       =============================== */

    return res.status(200).json({
      success: true,
      couponType,
      coupon_code,
      totalAmount,
      discountAmount,
      payableAmount: Math.max(totalAmount - discountAmount, 0),
    });
  } catch (error) {
    console.error("Apply Coupon Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


// Create New Order
exports.createOrder = async (req, res) => {
  try {
    /* ===============================
       STEP 1️⃣ USER FETCH
       =============================== */

    const userId = req.user._id;
    const { deliveryAddress, coupon_code } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* ===============================
       STEP 2️⃣ DELIVERY ADDRESS CHECK
       =============================== */

    const requiredFields = [
      "fullName",
      "phone",
      "street",
      "city",
      "state",
      "pincode",
    ];

    for (const field of requiredFields) {
      if (!deliveryAddress?.[field]) {
        return res.status(400).json({
          success: false,
          message: `Delivery address ${field} is required`,
        });
      }
    }

    /* ===============================
       STEP 3️⃣ CART FETCH
       =============================== */

    const cart = await CartModel.findOne({ user_id: userId });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    /* ===============================
       STEP 4️⃣ CART → ORDER PRODUCTS
       (SKU BASED LOGIC)
       =============================== */

    let orderProducts = [];
    let totalOrderAmount = 0; // 🔑 coupon se pehle ka total

    for (const item of cart.items) {
      /* ---- PRODUCT ---- */
      const product = await Product.findById(item.product_id).lean();
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      /* ---- STOCK (SKU BASED) ---- */
      const stockDoc = await ProductStock.findOne({
        product_id: item.product_id,
        sku: item.sku,
        is_available: true,
      });

      if (!stockDoc) {
        return res.status(400).json({
          success: false,
          message: `Invalid or unavailable SKU ${item.sku}`,
        });
      }

      if (stockDoc.stock_quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.product_name} (${item.sku})`,
        });
      }

      /* ---- PRICING (SKU BASED) ---- */
      const pricing = await Pricing.findOne({
        product_id: item.product_id,
        sku: item.sku,
        is_active: true,
      });

      if (!pricing) {
        return res.status(400).json({
          success: false,
          message: `Pricing not found for SKU ${item.sku}`,
        });
      }

      const price =
        pricing.discounted_price ?? pricing.original_price;

      const itemTotal = price * item.quantity;

      /* ---- ORDER SNAPSHOT ---- */
      orderProducts.push({
        product: product._id,
        sku: item.sku,

        snapshot: {
          name: product.product_name,
          price,
          size: stockDoc.attributes?.size || null,
          color: stockDoc.attributes?.color || null,
        },

        quantity: item.quantity,
        totalPrice: itemTotal,
      });

      totalOrderAmount += itemTotal;

      /* ---- STOCK REDUCE ---- */
      stockDoc.stock_quantity -= item.quantity;
      if (stockDoc.stock_quantity === 0) {
        stockDoc.is_available = false;
      }

      await stockDoc.save();
    }

    /* ===============================
       STEP 5️⃣ COUPON VALIDATION
       (USER COUPON → PUBLIC COUPON)
       =============================== */

    let discountAmount = 0;
    let appliedUserCoupon = null;
    let appliedPublicCoupon = null;


    if (coupon_code) {
      /* ---------- 5.1 TRY USER COUPON ---------- */
      const userCoupon = await UserCoupon.findOne({
        code: coupon_code,
        mobileNumber: user.phone,
        status: "Active",
      });

      if (userCoupon) {
        // expiry check
        if (userCoupon.expiresAt && userCoupon.expiresAt < new Date()) {
          return res.status(400).json({
            success: false,
            message: "Coupon expired",
          });
        }

        // min cart check
        if (totalOrderAmount < userCoupon.minCartAmount) {
          return res.status(400).json({
            success: false,
            message: `Minimum cart ₹${userCoupon.minCartAmount} required`,
          });
        }

        // discount calculate
        discountAmount =
          userCoupon.discountType === "percentage"
            ? Math.min(
                (totalOrderAmount * userCoupon.discountValue) / 100,
                totalOrderAmount
              )
            : Math.min(userCoupon.discountValue, totalOrderAmount);

        appliedUserCoupon = userCoupon;
      } else {
        /* ---------- 5.2 TRY PUBLIC COUPON ---------- */
        const publicCoupon = await PublicCoupon.findOne({
          code: coupon_code,
          status: "Active",
        });

        if (!publicCoupon) {
          return res.status(400).json({
            success: false,
            message: "Invalid coupon code",
          });
        }

        if (
          publicCoupon.expiresAt &&
          publicCoupon.expiresAt < new Date()
        ) {
          return res.status(400).json({
            success: false,
            message: "Coupon expired",
          });
        }

        if (
          publicCoupon.usageLimit &&
          publicCoupon.usageCount >= publicCoupon.usageLimit
        ) {
          return res.status(400).json({
            success: false,
            message: "Coupon usage limit reached",
          });
        }

        // per user limit
        const userUsageCount = publicCoupon.usedBy.filter(
          (u) => u.user.toString() === userId.toString()
        ).length;

        if (userUsageCount >= publicCoupon.perUserLimit) {
          return res.status(400).json({
            success: false,
            message: "You already used this coupon",
          });
        }

        if (totalOrderAmount < publicCoupon.minCartAmount) {
          return res.status(400).json({
            success: false,
            message: `Minimum cart ₹${publicCoupon.minCartAmount} required`,
          });
        }

        discountAmount =
          publicCoupon.discountType === "percentage"
            ? Math.min(
                (totalOrderAmount * publicCoupon.discountValue) / 100,
                totalOrderAmount
              )
            : Math.min(publicCoupon.discountValue, totalOrderAmount);

        appliedPublicCoupon = publicCoupon;
      }
    }

    const payableAmount = Math.max(
      totalOrderAmount - discountAmount,
      0
    );

    /* ===============================
       STEP 6️⃣ CREATE ORDER
       =============================== */

    const order = await Order.create({
      user: userId,

      userSnapshot: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },

      deliveryAddress,
      products: orderProducts,

      totalOrderAmount: payableAmount,
      currency: "INR",

      paymentStatus: "Enquiry",
      orderStatus: "Pending",
    });

    /* ===============================
       STEP 7️⃣ MARK COUPON USED
       =============================== */

    if (appliedUserCoupon) {
      appliedUserCoupon.status = "Used";
      appliedUserCoupon.user_id = userId;
      appliedUserCoupon.usedAt = new Date();
      await appliedUserCoupon.save();
    }

    if (appliedPublicCoupon) {
      await PublicCoupon.updateOne(
        { _id: appliedPublicCoupon._id },
        {
          $inc: { usageCount: 1 },
          $push: {
            usedBy: {
              user: userId,
              usedAt: new Date(),
              orderId: order._id,
            },
          },
        }
      );
    }

    /* ===============================
       STEP 8️⃣ CLEAR CART
       =============================== */

    cart.items = [];
    await cart.save();

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
    // Extract pagination props
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // Fetch orders with pagination
    const [orders, totalRecords] = await Promise.all([
      Order.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Order.countDocuments(),
    ]);

    // Extract order IDs
    const orderIds = orders.map((order) => order.order_id);

    // Fetch all payments for these orders
    const payments = await Payment.find({ order_id: { $in: orderIds } });

    // Create quick payment lookup map
    const paymentMap = {};
    payments.forEach((payment) => {
      paymentMap[payment.order_id] = payment;
    });

    // Merge orders + payments
    const ordersWithPayments = orders.map((order) => ({
      ...order.toObject(),
      createdAtIST: new Date(order.createdAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
      payment: paymentMap[order.order_id] || null,
    }));

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    // Response
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
