const UserCoupon = require("../Models/couponModelUser");
const { pagination_ } = require("../Utils/pagination_");


// ✅ Get All Coupons
const getAllCoupons = async (req, res) => {
  try {
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // parallel execution ✅
    const [coupons, totalRecords] = await Promise.all([
      UserCoupon.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      UserCoupon.countDocuments(),
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
      error: "Server error",
      details: err.message,
    });
  }
};


// ✅ Get Single Coupon by ID
const getCouponById = async (req, res) => {
  try {
    const coupon = await UserCoupon.findOne({
      coupon_id: req.params.id,
    }).lean();

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
    const coupon = await UserCoupon.findOneAndUpdate(
      { coupon_id: req.params.id },
      req.body,
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json({
      message: "Coupon updated successfully",
      coupon,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const deleted = await UserCoupon.findOneAndDelete({
      coupon_id: req.params.id,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json({ message: "Coupon deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ✅ REMOVE / RESET USER 
const removeUserFromCoupon = async (req, res) => {
  try {
    const { coupon_id } = req.body;

    if (!coupon_id) {
      return res
        .status(400)
        .json({ message: "coupon_id is required" });
    }

    const coupon = await UserCoupon.findOne({ coupon_id });
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    // ✅ Reset coupon
    coupon.status = "Active";
    coupon.usedAt = null;

    await coupon.save();

    res.status(200).json({
      message: "Coupon reset successfully",
      coupon,
    });
  } catch (err) {
    console.error("Reset coupon error:", err);
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  removeUserFromCoupon,
};
