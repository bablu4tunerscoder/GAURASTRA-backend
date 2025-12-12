const PublicCoupon = require("../Models/couponModelPublic");
const { pagination_ } = require("../Utils/pagination_");

// ✅ Create Coupon


const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minCartAmount,
      status,
      expiresAt,
      usageLimit,
      perUserLimit,
      allowedProducts,
      excludedProducts,
    } = req.body;

    if (!code || !discountValue) {
      return res.status(400).json({ message: "code & discountValue required" });
    }

    const exists = await PublicCoupon.findOne({ code: code.toUpperCase() });
    if (exists) {
      return res.status(409).json({ message: "Coupon code already exists" });
    }

    const coupon = await PublicCoupon.create({
      code,
      discountType,
      discountValue,
      minCartAmount,
      status,
      expiresAt,
      usageLimit,
      perUserLimit,
      allowedProducts,
      excludedProducts,
    });

    res.status(201).json({ message: "Coupon created", coupon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ✅ Get All Coupons
const getAllCoupons = async (req, res) => {
  try {
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 20,
      maxLimit: 20,
    });

    // ✅ parallel DB calls
    const [coupons, totalRecords] = await Promise.all([
      PublicCoupon.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      PublicCoupon.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    res.status(200).json({
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },
      data: coupons,
    });
  } catch (err) {
    console.error("Get all coupons error:", err);
    res.status(500).json({
      message: "Server error while fetching coupons",
      error: err.message,
    });
  }
};

// ✅ Get Single Coupon by ID
const getCouponById = async (req, res) => {
  try {
    const coupon = await PublicCoupon.findOne({ coupon_id: req.params.id });
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
    const coupon = await PublicCoupon.findOneAndUpdate(
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
    const deleted = await PublicCoupon.findOneAndDelete({
      coupon_id: req.params.id,
    });
    if (!deleted) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.status(200).json({ message: "Coupon deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



const removeUserFromCoupon = async (req, res) => {
  try {
    const { coupon_id, user_id } = req.body;

    const coupon = await PublicCoupon.findOne({ coupon_id });
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    const used = coupon.usedBy.some(
      (u) => u.user.toString() === user_id
    );

    if (!used) {
      return res.status(400).json({ message: "User never used this coupon" });
    }

    await Coupon.updateOne(
      { coupon_id },
      {
        $pull: { usedBy: { user: user_id } },
        $inc: { usageCount: -1 },
      }
    );

    res.status(200).json({ message: "User removed from coupon usage" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  
  removeUserFromCoupon,
};
