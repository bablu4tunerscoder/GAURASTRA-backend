

const User = require("../Models/userModel");
const bcrypt = require("bcryptjs");
const { getGeolocation } = require("../utilities/geolocation");

const { imageToWebp } = require("../Middlewares/upload/imageProcessor");
const { pagination_ } = require("../utilities/pagination_");

// admin routes 
const getAllUsers = async (req, res) => {
  try {
    // Extract pagination
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 20,
      maxLimit: 50,
    });

    // Fetch users + total count in parallel
    const [users, totalRecords] = await Promise.all([
      User.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-password")
        .lean(),
      User.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    res.status(200).json({
      status: "1",
      message: "Users fetched successfully",
      count: users.length,

      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },

      data: users,
    });
  } catch (err) {
    console.error("GetAllUsers Error:", err);
    res.status(500).json({
      status: "0",
      message: "Error retrieving users",
      error: err.message,
    });
  }
};

// To get a single user by ID
const getUserById = async (req, res) => {
  try {

    console.log(req.params);
   const { user_id } = req.params;

    const user = await User.findById(user_id)
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({
        status: "0",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "1",
      message: "User fetched successfully",
      data: {
        user
      },
    });
  } catch (err) {
    console.error("GetUserById Error:", err);
    res.status(500).json({
      status: "0",
      message: "Error retrieving user",
      error: err.message,
    });
  }
};

const adminUpdateUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { name, phone, address } = req.body;

    let updateFields = { name, phone, address };

    // ✅ Update latitude & longitude if address is provided
    if (address) {
      const location = await getGeolocation(address);
      if (location) {
        updateFields["location.coordinates"] = [
          location.longitude,
          location.latitude,
        ];
      }
    }

    // ✅ Update profile image if provided
   if (req.file) {
      updateFields.profileImage = await imageToWebp(req.file.path);
    }

    const updatedUser = await User.findByIdAndUpdate(user_id, updateFields, {
      new: true,
    }).select("-password").lean();

    if (!updatedUser) {
      return res
        .status(404)
        .json({ status: "0", message: "User not found" });
    }

    res.status(200).json({
      status: "1",
      message: "User updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.log("Error:", error.message);
    res.status(500).json({ status: "0", message: error.message });
  }
};


const getProfile = async (req, res) => {
  try {

    const user_id = req.user.userid;

    const user = await User.findById(user_id)
      .select("-password -otp")
      .lean();

    if (!user) {
      return res.status(404).json({
        status: "0",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "1",
      message: "User fetched successfully",
      data: {
        user
      },
    });
  } catch (err) {
    console.error("GetUserById Error:", err);
    res.status(500).json({
      status: "0",
      message: "Error retrieving user",
      error: err.message,
    });
  }
};


const updateUserProfile = async (req, res) => {
  try {
    const user_id = req.user.userid;
    const { name, phone, address } = req.body;

    let updateFields = { name, phone, address };

    // ✅ Update latitude & longitude if address is provided
    if (address) {
      const location = await getGeolocation(address);
      if (location) {
        updateFields["location.coordinates"] = [
          location.longitude,
          location.latitude,
        ];
      }
    }

    // ✅ Update profile image if provided
   if (req.file) {
      updateFields.profileImage = await imageToWebp(req.file.path);
    }

    const updatedUser = await User.findByIdAndUpdate(user_id, updateFields, {
      new: true,
    }).select("-password").lean();

    if (!updatedUser) {
      return res
        .status(404)
        .json({ status: "0", message: "User not found" });
    }

    res.status(200).json({
      status: "1",
      message: "User updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.log("Error:", error.message);
    res.status(500).json({ status: "0", message: error.message });
  }
};


const changePassword = async (req, res) => {
  try {
    const userId = req.user.userid;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        status: "0",
        message: "Old password and new password are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "0",
        message: "User not found",
      });
    }

    // 🚫 Google login users
    if (user.password === "GoogleAuth") {
      return res.status(400).json({
        status: "0",
        message: "Password change not allowed for Google login users",
      });
    }

    // 🔍 Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: "0",
        message: "Old password is incorrect",
      });
    }

    // 🔐 Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    return res.status(200).json({
      status: "1",
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({
      status: "0",
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  getAllUsers,
  getProfile,
  updateUserProfile,
  getUserById,
  adminUpdateUser,
  changePassword
};
