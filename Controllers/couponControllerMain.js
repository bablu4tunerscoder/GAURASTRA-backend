const UserCoupon = require("../Models/couponModelUser");
const PublicCoupon = require("../Models/couponModelPublic");
const CartModel = require("../Models/CartModel");
const Pricing = require("../Models/ProductPricingModel");

const suggestCoupons = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /* ===============================
       1️⃣ FETCH USER CART
    =============================== */

    const cart = await CartModel.findOne({ user_id: user.userid }).lean();

    if (!cart || !cart.items?.length) {
      return res.status(200).json({
        success: true,
        availableCoupons: [],
        message: "Cart is empty",
      });
    }

    const productIds = cart.items.map(i => i.product_id);

    /* ===============================
       2️⃣ CALCULATE CART AMOUNT
       (same logic as getCart – simplified)
    =============================== */

    const pricingList = await Pricing.find({
      product_id: { $in: productIds },
      is_active: true,
    }).lean();

    const pricingMap = {};
    pricingList.forEach(p => {
      const pid = p.product_id.toString();
      pricingMap[pid] ??= {};
      pricingMap[pid][p.sku] = p;
    });

    let cartAmount = 0;

    cart.items.forEach(item => {
      const pricing = pricingMap[item.product_id.toString()]?.[item.sku];
      if (!pricing) return;

      const originalPrice = pricing.original_price;
      const discountedPrice =
        pricing.discounted_price ??
        originalPrice -
          (originalPrice * (pricing.discount_percent || 0)) / 100;

      cartAmount += discountedPrice * item.quantity;
    });

    /* ===============================
       3️⃣ FETCH PUBLIC COUPONS
    =============================== */

    const publicCoupons = await PublicCoupon.find({
      status: "Active",
      minCartAmount: { $lte: cartAmount },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      $and: [
        {
          $or: [
            { allowedProducts: { $size: 0 } },          // all products
            { allowedProducts: { $in: productIds } },  // cart products
          ],
        },
        {
          $or: [
            { usageLimit: null },
            { $expr: { $gt: ["$usageLimit", "$usageCount"] } },
          ],
        },
      ],
    })
      .select("code discountType discountValue expiresAt minCartAmount")
      .lean();

    /* ===============================
       4️⃣ FETCH USER COUPONS
    =============================== */

    let userCoupons = [];

    if (user.phone) {
      userCoupons = await UserCoupon.find({
        mobileNumber: user.phone,
        status: "Active",
        minCartAmount: { $lte: cartAmount },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      })
        .select("code discountType discountValue expiresAt minCartAmount")
        .lean();
    }

    /* ===============================
       5️⃣ FINAL RESPONSE
    =============================== */

    const formatCoupon = (c, type) => ({
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      expiresAt: c.expiresAt,
      minCartAmount: c.minCartAmount,
      couponType: type, 
    });

    return res.status(200).json({
      success: true,
      cartAmount,
      availableCoupons: [
        ...userCoupons.map(c => formatCoupon(c, "USER")),
        ...publicCoupons.map(c => formatCoupon(c, "PUBLIC")),
      ],
    });
  } catch (err) {
    console.error("🔥 Suggest coupons error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching coupons",
    });
  }
};



const applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user;
    const user_id = user.userid;

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const cart = await CartModel.findOne({ user_id }).lean();
    if (!cart || !cart.items?.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    /* ===============================
       CALCULATE CART AMOUNT
    =============================== */
    const productIds = cart.items.map(i => i.product_id);

    const pricingList = await Pricing.find({
      product_id: { $in: productIds },
      is_active: true,
    }).lean();

    const pricingMap = {};
    pricingList.forEach(p => {
      pricingMap[p.product_id.toString()] ??= {};
      pricingMap[p.product_id.toString()][p.sku] = p;
    });

    let cartAmount = 0;

    cart.items.forEach(item => {
      const pricing =
        pricingMap[item.product_id.toString()]?.[item.sku];
      if (!pricing) return;

      const price =
        pricing.discounted_price ??
        pricing.original_price -
          (pricing.original_price *
            (pricing.discount_percent || 0)) / 100;

      cartAmount += price * item.quantity;
    });

    /* ===============================
       TRY USER COUPON (PREVIEW)
    =============================== */
    const userCoupon = await UserCoupon.findOne({
      code,
      mobileNumber: user.phone,
      status: "Active",
    });

    if (userCoupon) {
      if (userCoupon.expiresAt && userCoupon.expiresAt < new Date()) {
        return res.status(400).json({ message: "Coupon expired" });
      }

      if (cartAmount < userCoupon.minCartAmount) {
        return res.status(400).json({
          message: `Minimum cart ₹${userCoupon.minCartAmount} required`,
        });
      }

      const discountAmount =
        userCoupon.discountType === "percentage"
          ? Math.min(
              (cartAmount * userCoupon.discountValue) / 100,
              cartAmount
            )
          : Math.min(userCoupon.discountValue, cartAmount);

      return res.status(200).json({
        success: true,
        type: "USER_COUPON",
        code,
        cartAmount,
        discountAmount,
        finalAmount: cartAmount - discountAmount,
      });
    }

    /* ===============================
       TRY PUBLIC COUPON (PREVIEW)
    =============================== */
    const coupon = await PublicCoupon.findOne({
      code,
      status: "Active",
    });

    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json({ message: "Coupon expired" });
    }

    if (
      coupon.usageLimit &&
      coupon.usageCount >= coupon.usageLimit
    ) {
      return res.status(400).json({
        message: "Coupon usage limit reached",
      });
    }

    const userUsageCount = coupon.usedBy.filter(
      u => u.user.toString() === user_id
    ).length;

    if (coupon.perUserLimit && userUsageCount >= coupon.perUserLimit) {
      return res.status(400).json({
        message: "You already used this coupon",
      });
    }

    if (cartAmount < coupon.minCartAmount) {
      return res.status(400).json({
        message: `Minimum cart ₹${coupon.minCartAmount} required`,
      });
    }

    const discountAmount =
      coupon.discountType === "percentage"
        ? Math.min(
            (cartAmount * coupon.discountValue) / 100,
            cartAmount
          )
        : Math.min(coupon.discountValue, cartAmount);

    return res.status(200).json({
      success: true,
      type: "PUBLIC_COUPON",
      code,
      cartAmount,
      discountAmount,
      finalAmount: cartAmount - discountAmount,
    });
  } catch (err) {
    console.error("Apply coupon error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


module.exports = {
  applyCoupon,
  suggestCoupons,
};
