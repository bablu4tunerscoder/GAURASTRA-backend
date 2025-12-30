const PublicCoupon = require("../Models/couponModelPublic");
const { pagination_ } = require("../utilities/pagination_");
const mongoose = require("mongoose");

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
      maxLimit: 50,
    });

    const { status, code, discountType } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (discountType) filter.discountType = discountType;
    if (code) filter.code = { $regex: code, $options: "i" }; 

    // Parallel DB calls
    const [coupons, totalRecords] = await Promise.all([
      PublicCoupon.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PublicCoupon.countDocuments(filter),
    ]);

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
      data: coupons,
    });
  } catch (err) {
    console.error("Get all coupons error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching coupons",
      error: err.message,
    });
  }
};


// ✅ Get Single Coupon by IDA
const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Invalid coupon ID" });
    }

    const coupon = await PublicCoupon.findById(id)
      .populate({
        path: "usedBy.user",
        select: "name email", 
      })
      .lean();

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (err) {
    console.error("Error fetching coupon:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


// ✅ Update Coupon
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // If code is being updated, normalize
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase().trim();
    }

    // Validate discountType
    if (updateData.discountType && !["flat", "percentage"].includes(updateData.discountType)) {
      return res.status(400).json({ message: "Invalid discountType. Must be 'flat' or 'percentage'." });
    }

    // Validate status
    if (updateData.status && !["Active", "Inactive", "Expired"].includes(updateData.status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const coupon = await PublicCoupon.findByIdAndUpdate(id, updateData, { new: true }).lean();

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json({ success: true, message: "Coupon updated", data: coupon });
  } catch (err) {
    console.error("Error updating coupon:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};



// ✅ Delete Coupon
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Invalid coupon ID." });
    }

    const deleted = await PublicCoupon.findByIdAndDelete(id).lean();

    if (!deleted) {
      return res.status(404).json({ message: "Coupon not found." });
    }

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully.",
      data: {
        _id: deleted._id,
        code: deleted.code,
        status: deleted.status,
        usageCount: deleted.usageCount,
      },
    });
  } catch (err) {
    console.error("Error deleting coupon:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


const removeUserFromCoupon = async (req, res) => {
  try {
    const { coupon_id, user_id } = req.body;

    if (!coupon_id || !user_id) {
      return res.status(400).json({ message: "coupon_id and user_id are required." });
    }

  
    const couponIdObj = coupon_id;
    const userIdObj = user_id;

    const coupon = await PublicCoupon.findById(couponIdObj);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    const used = coupon.usedBy.some(u => u.user.toString() === userIdObj.toString());
    if (!used) {
      return res.status(400).json({ message: "User never used this coupon." });
    }

    await PublicCoupon.updateOne(
      { _id: couponIdObj },
      {
        $pull: { usedBy: { user: userIdObj } },
        $inc: { usageCount: -1 },
      }
    );

    // Ensure usageCount is not negative
    if (coupon.usageCount - 1 < 0) {
      await PublicCoupon.updateOne(
        { _id: couponIdObj },
        { $set: { usageCount: 0 } }
      );
    }

    res.status(200).json({ success: true, message: "User removed from coupon usage" });
  } catch (err) {
    console.error("Error removing user from coupon:", err);
    res.status(500).json({ success: false, error: err.message });
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
