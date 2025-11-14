const Coupon = require("../Models/couponModel");

// ✅ Create Coupon
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      applicableProducts,
      //   applicableCategories,
      //   applicableSubcategories,
      minCartAmount,
      status,
      expiresAt,
      usageLimit,
    } = req.body;

    // Check required fields
    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Check duplicate code
    const exists = await Coupon.findOne({ code });
    if (exists) {
      return res.status(409).json({ message: "Coupon code already exists" });
    }

    const coupon = new Coupon({
      code,
      discountType,
      discountValue,
      applicableProducts,
      //   applicableCategories,
      //   applicableSubcategories,
      minCartAmount,
      status,
      expiresAt,
      usageLimit,
    });

    await coupon.save();
    res.status(201).json({ message: "Coupon created", coupon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get All Coupons
const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.status(200).json(coupons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get Single Coupon by ID
const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ coupon_id: req.params.id }).lean();
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.status(200).json(coupon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Update Coupon
const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOneAndUpdate(
      { coupon_id: req.params.id },
      req.body,
      { new: true }
    );
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.status(200).json({ message: "Coupon updated", coupon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete Coupon
const deleteCoupon = async (req, res) => {
  try {
    const deleted = await Coupon.findOneAndDelete({ coupon_id: req.params.id });
    if (!deleted) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.status(200).json({ message: "Coupon deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Apply Coupon API

// Suggest Coupons API with robust logging & error boundaries
const suggestCoupons = async (req, res) => {
  try {
    const { product_id, cartAmount } = req.body;

    // Input validation
    if (!product_id || !cartAmount) {
      return res
        .status(400)
        .json({ error: "Product ID and cart amount are required" });
    }

    // Check if product_id is a valid ObjectId (optional)
    if (typeof product_id !== "string") {
      return res.status(400).json({ error: "Invalid product ID format" });
    }

    // Optimized coupon query
    const coupons = await Coupon.find({
      status: "Active",
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      $or: [
        { applicableProducts: [] },
        { applicableProducts: { $in: [product_id] } },
      ],
      minCartAmount: { $lte: cartAmount },
      $or: [
        { usageLimit: null },
        { $expr: { $gt: ["$usageLimit", "$usedCount"] } },
      ],
    })
      .limit(10)
      .select("code discountType discountValue expiresAt minCartAmount")
      .lean();

    const effectiveCoupons = coupons.filter(
      (c) => !c.minCartAmount || c.minCartAmount <= cartAmount
    );

    res.status(200).json({
      availableCoupons: effectiveCoupons.map((c) => ({
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        expiresAt: c.expiresAt,
        minCartAmount: c.minCartAmount,
      })),
    });
  } catch (err) {
    console.error("🔥 Suggest coupons error:", err.message);
    res.status(500).json({
      error: "Server error while fetching coupons. Try again later.",
    });
  }
};

// ✅ Remove user_id from usedBy of a coupon
// /controllers/couponController.js
const applyCoupon = async (req, res) => {
  try {
    const { code, user_id, product_id, cartAmount } = req.body;

    // Validate input
    if (!code || !user_id || !product_id || !cartAmount) {
      return res.status(400).json({
        message: "All fields are required",
        details: {
          missingFields: {
            code: !code,
            user_id: !user_id,
            product_id: !product_id,
            cartAmount: !cartAmount,
          },
        },
      });
    }

    // Find coupon
    const coupon = await Coupon.findOne({ code })
      .select(
        "code discountType discountValue expiresAt status usageLimit usedCount usedBy applicableProducts minCartAmount coupon_id"
      )
      .lean();

    if (!coupon) {
      return res.status(404).json({
        message: "Coupon not found",
        details: { code },
      });
    }

    // Validate coupon
    if (coupon.status !== "Active") {
      return res.status(400).json({
        message: "Coupon is not active",
        details: { status: coupon.status },
      });
    }

    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      return res.status(400).json({
        message: "Coupon has expired",
        details: { expiresAt: coupon.expiresAt },
      });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        message: "Coupon usage limit reached",
        details: {
          usedCount: coupon.usedCount,
          usageLimit: coupon.usageLimit,
        },
      });
    }

    const alreadyUsed = coupon.usedBy.some(
      (u) => u.user_id.toString() === user_id.toString()
    );
    if (alreadyUsed) {
      const usedAt = coupon.usedBy.find(
        (u) => u.user_id.toString() === user_id.toString()
      ).usedAt;
      return res.status(400).json({
        message: "You have already used this coupon",
        details: {
          firstUsedAt: usedAt,
          couponId: coupon.coupon_id,
          remainingUses: coupon.usageLimit
            ? coupon.usageLimit - coupon.usedCount
            : "unlimited",
        },
      });
    }

    // In your applyCoupon API endpoint
    if (
      coupon.applicableProducts.length > 0 &&
      !coupon.applicableProducts.some(
        (id) => id.toString() === product_id.toString()
      )
    ) {
      return res.status(400).json({
        message: "Coupon not applicable for this product",
        details: {
          applicableProducts: coupon.applicableProducts,
          requestedProduct: product_id,
        },
      });
    }

    if (cartAmount < coupon.minCartAmount) {
      return res.status(400).json({
        message: `Minimum cart amount should be ₹${coupon.minCartAmount} to use this coupon`,
        details: {
          minCartAmount: coupon.minCartAmount,
          currentCartAmount: cartAmount,
        },
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = (cartAmount * coupon.discountValue) / 100;
      // Ensure discount doesn't exceed cart amount
      discountAmount = Math.min(discountAmount, cartAmount);
    } else {
      discountAmount = Math.min(coupon.discountValue, cartAmount);
    }

    // Update coupon usage (fire and forget)
    Coupon.updateOne(
      { _id: coupon._id },
      {
        $inc: { usedCount: 1 },
        $push: { usedBy: { user_id, usedAt: new Date() } },
      }
    ).exec();

    res.status(200).json({
      message: "Coupon applied successfully",
      discountAmount,
      finalAmount: cartAmount - discountAmount,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        expiresAt: coupon.expiresAt,
        coupon_id: coupon.coupon_id,
      },
    });
  } catch (err) {
    console.error("Apply coupon error:", err);
    res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
};

const removeUserFromCoupon = async (req, res) => {
  try {
    const { coupon_id, user_id } = req.body;

    if (!coupon_id || !user_id) {
      return res.status(400).json({
        message: "coupon_id and user_id are required",
        details: {
          missingFields: {
            coupon_id: !coupon_id,
            user_id: !user_id,
          },
        },
      });
    }

    const coupon = await Coupon.findOne({ coupon_id });

    if (!coupon) {
      return res.status(404).json({
        message: "Coupon not found",
        details: { coupon_id },
      });
    }

    const wasUsed = coupon.usedBy.some(
      (entry) => entry.user_id.toString() === user_id.toString()
    );

    if (!wasUsed) {
      return res.status(400).json({
        message: "User has not used this coupon",
        details: {
          coupon_id,
          user_id,
          usedBy: coupon.usedBy.map((u) => u.user_id),
        },
      });
    }

    await Coupon.updateOne(
      { coupon_id },
      {
        $pull: { usedBy: { user_id } },
        $inc: { usedCount: -1 },
      }
    );

    res.status(200).json({
      message: "User removed from coupon usage successfully",
      details: {
        coupon_id,
        user_id,
        remainingUses: coupon.usageLimit
          ? coupon.usageLimit - (coupon.usedCount - 1)
          : "unlimited",
      },
    });
  } catch (err) {
    console.error("Error removing user from coupon:", err);
    res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
};

module.exports = {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  suggestCoupons,
  removeUserFromCoupon,
};
