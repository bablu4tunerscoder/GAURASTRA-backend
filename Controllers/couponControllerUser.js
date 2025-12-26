const UserCoupon = require("../Models/couponModelUser");
const { pagination_ } = require("../Utils/pagination_");


// ✅ Get All Coupons
const getAllUserCoupons = async (req, res) => {
  try {
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 50,
    });

    const { status, code, mobileNumber, userId } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (code) filter.code = { $regex: code, $options: "i" }; // case-insensitive
    if (mobileNumber) filter.mobileNumber = { $regex: mobileNumber, $options: "i" };
    if (userId) filter.user_id = userId;

    // Parallel DB calls
    const [coupons, totalRecords] = await Promise.all([
      UserCoupon.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserCoupon.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    res.status(200).json({
      success: true,
      count: coupons.length,
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
    console.error("Get all user coupons error:", err);
    res.status(500).json({
      success: false,
      error: "Server error while fetching user coupons",
      details: err.message,
    });
  }
};



// ✅ Get Single Coupon by ID
const getUserCouponById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid coupon ID" });
    }

    const coupon = await UserCoupon.findById(id).lean();

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    res.status(200).json({ success: true, data: coupon });
  } catch (err) {
    console.error("Error fetching user coupon:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ✅ Update Coupon
const updateUserCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid coupon ID" });
    }

    // Normalize code if present
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase().trim();
    }

    // Validate discountType
    if (updateData.discountType && !["flat", "percentage"].includes(updateData.discountType)) {
      return res.status(400).json({ success: false, message: "Invalid discountType. Must be 'flat' or 'percentage'." });
    }

    // Validate status
    if (updateData.status && !["Active", "Used", "Expired", "Inactive"].includes(updateData.status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }

    const coupon = await UserCoupon.findByIdAndUpdate(id, updateData, { new: true }).lean();

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    res.status(200).json({ success: true, message: "Coupon updated successfully", data: coupon });
  } catch (err) {
    console.error("Error updating user coupon:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


const deleteUserCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid coupon ID." });
    }

    const deleted = await UserCoupon.findByIdAndDelete(id).lean();

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Coupon not found." });
    }

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully.",
      data: {
        _id: deleted._id,
        code: deleted.code,
        status: deleted.status,
        usedAt: deleted.usedAt,
      },
    });
  } catch (err) {
    console.error("Error deleting user coupon:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const removeUserFromCoupon = async (req, res) => {
  try {
    const { coupon_id } = req.body;

    if (!coupon_id) {
      return res.status(400).json({ success: false, message: "coupon_id is required" });
    }

    const coupon = await UserCoupon.findById(coupon_id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    // Reset coupon
    coupon.status = "Active";
    coupon.usedAt = null;
    coupon.user_id = null; 
    await coupon.save();

    await coupon.save();

    res.status(200).json({
      success: true,
      message: "Coupon reset successfully",
      data: coupon,
    });
  } catch (err) {
    console.error("Reset coupon error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};



module.exports = {
  getAllUserCoupons,
  getUserCouponById,
  updateUserCoupon,
  deleteUserCoupon,
  removeUserFromCoupon,
};
