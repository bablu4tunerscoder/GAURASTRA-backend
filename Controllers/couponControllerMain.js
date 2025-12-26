const UserCoupon = require("../Models/couponModelUser");
const PublicCoupon = require("../Models/couponModelPublic");


const suggestCoupons = async (req, res) => {
  try {
    const { product_id, cartAmount } = req.body;

    const user = req.user;

    const mobileNumber = user ? user.phone : null;

    if (!product_id || !cartAmount) {
      return res.status(400).json({
        message: "product_id and cartAmount are required",
      });
    }

    const publicCoupons = await PublicCoupon.find({
      status: "Active",
      minCartAmount: { $lte: cartAmount },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      $and: [
        {
          $or: [
            { allowedProducts: { $size: 0 } }, // ✅ all products
            { allowedProducts: product_id },   // ✅ specific product
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
       2️⃣ FETCH USER PERSONAL COUPONS
    =============================== */

    let userCoupons = [];

    if (mobileNumber) {
      userCoupons = await UserCoupon.find({
        mobileNumber,
        status: "Active",
        minCartAmount: { $lte: cartAmount },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      })
        .select("code discountType discountValue expiresAt minCartAmount")
        .lean();
    }

    /* ===============================
       3️⃣ FINAL RESPONSE
    =============================== */

    const formatCoupon = (c, type) => ({
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      expiresAt: c.expiresAt,
      minCartAmount: c.minCartAmount,
      couponType: type, // ✅ PUBLIC / USER
    });

    res.status(200).json({
      success: true,
      availableCoupons: [
        ...userCoupons.map((c) => formatCoupon(c, "USER")),
        ...publicCoupons.map((c) => formatCoupon(c, "PUBLIC")),
      ],
    });
  } catch (err) {
    console.error("🔥 Suggest coupons error:", err);
    res.status(500).json({
      message: "Server error while fetching coupons",
    });
  }
};


const applyCoupon = async (req, res) => {
  try {
    const { code, product_id, cartAmount } = req.body;

    const user = req.user;

    const user_id = user.userid;

    if (!code || !cartAmount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const userCoupon = await UserCoupon.findOne({
      code,
      mobileNumber: user.phone,
    });

    if (userCoupon) {
      if (userCoupon.status !== "Active") {
        return res.status(400).json({ message: "Coupon already used or inactive" });
      }

      if (userCoupon.expiresAt && userCoupon.expiresAt < new Date()) {
        return res.status(400).json({ message: "Coupon expired" });
      }

      if (cartAmount < userCoupon.minCartAmount) {
        return res.status(400).json({
          message: `Minimum cart ₹${userCoupon.minCartAmount} required`,
        });
      }

      // ✅ Calculate discount
      const discountAmount =
        userCoupon.discountType === "percentage"
          ? Math.min(
            (cartAmount * userCoupon.discountValue) / 100,
            cartAmount
          )
          : Math.min(userCoupon.discountValue, cartAmount);

      // ✅ Mark used
      userCoupon.status = "Used";
      userCoupon.user_id = user_id;
      userCoupon.usedAt = new Date();
      await userCoupon.save();

      return res.status(200).json({
        type: "USER_COUPON",
        discountAmount,
        finalAmount: cartAmount - discountAmount,
        code,
      });
    }

    /* ===============================
       2️⃣ TRY PUBLIC COUPON
    =============================== */

    const coupon = await PublicCoupon.findOne({ code });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    if (coupon.status !== "Active") {
      return res.status(400).json({ message: "Coupon inactive" });
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json({ message: "Coupon expired" });
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ message: "Coupon usage limit reached" });
    }

    // ✅ Per-user limit
    const userUsageCount = coupon.usedBy.filter(
      (u) => u.user.toString() === user_id
    ).length;

    if (userUsageCount >= coupon.perUserLimit) {
      return res.status(400).json({ message: "You already used this coupon" });
    }

    // ✅ Product validation
    if (
      coupon.allowedProducts.length > 0 &&
      !coupon.allowedProducts.some(
        (p) => p.toString() === product_id
      )
    ) {
      return res.status(400).json({
        message: "Coupon not applicable for this product",
      });
    }

    if (cartAmount < coupon.minCartAmount) {
      return res.status(400).json({
        message: `Minimum cart ₹${coupon.minCartAmount} required`,
      });
    }

    // ✅ Discount
    const discountAmount =
      coupon.discountType === "percentage"
        ? Math.min((cartAmount * coupon.discountValue) / 100, cartAmount)
        : Math.min(coupon.discountValue, cartAmount);

    // ✅ Update usage
    await PublicCoupon.updateOne(
      { _id: coupon._id },
      {
        $inc: { usageCount: 1 },
        $push: { usedBy: { user: user_id, usedAt: new Date() } },
      }
    );

    return res.status(200).json({
      type: "PUBLIC_COUPON",
      discountAmount,
      finalAmount: cartAmount - discountAmount,
      code,
    });
  } catch (err) {
    console.error("Apply coupon error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  applyCoupon,
  suggestCoupons,
};
