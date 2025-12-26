const bcrypt = require("bcryptjs");

const User = require("../Models/userModel");
const Lead = require("../Models/leadModel");
const { getGeolocation } = require("../Utils/geolocation");
const axios = require("axios");
const { image_processor } = require("../Middlewares/uploadMiddleware");
const admin = require("firebase-admin");
// const serviceAccount = require("../Config/serviceAccountKey.json");
const serviceAccountProd = require("../Config/serviceAccountKeyProd.json");
const { createToken } = require("../Utils/JWTAuth");
const { pagination_ } = require("../Utils/pagination_");
const wishlistModel = require("../Models/wishlistModel");
const CartModel = require("../Models/CartModel");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  try {
    const { name, email, phone, password, address, role } = req.body;

    // 🔹 Check duplicate
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        status: "0",
        message: "Email or phone number already registered",
      });
    }

    // 🔹 Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 🔹 Geolocation from address
    let location = { type: "Point", coordinates: [0, 0] };
    if (address) {
      const geo = await getGeolocation(address);
      if (geo) {
        location.coordinates = [geo.longitude, geo.latitude]; // [lng, lat]
      }
    }

    // 🔹 IP & Network Address
    let ipAddress = null;
    let networkAddress = null;

    if (role === "Customer") {
      try {
        ipAddress =
          req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

        if (ipAddress && ipAddress.startsWith("::ffff:")) {
          ipAddress = ipAddress.replace("::ffff:", "");
        }

        const ipData = await axios.get(`https://ipapi.co/${ipAddress}/json/`);
        networkAddress = `${ipData.data.city}, ${ipData.data.region}, ${ipData.data.country_name}`;
      } catch (err) {
        console.log("IP Info Error:", err.message);
      }
    }

    // 🔹 Permissions
    let permissions = [];
    if (role === "Admin") permissions = ["*"];

    // 🔹 Profile Image
    let profileImage = "/Uploads/images/default.webp";
    if (req.files?.profileImage?.[0]) {
      profileImage = await image_processor(req.files.profileImage[0].path);
    }

    // 🔹 Create User
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      address,
      location,
      role: role || "Customer",
      permissions,
      ipAddress,
      networkAddress,
      status: "Active",
      profileImage,
    });

    await newUser.save();

    return res.status(201).json({
      status: "1",
      message: "User Registered Successfully",
      data: newUser,
    });
  } catch (error) {
    console.error("RegisterAll Error:", error);
    return res.status(500).json({
      status: "0",
      message: error.message || "Internal Server Error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({
        status: "0",
        message: "Email/Phone and password are required",
      });
    }

    // 🔹 Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    if (!user) {
      return res.status(404).json({
        status: "0",
        message: "User not found",
      });
    }

    // 🔹 Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: "0",
        message: "Invalid credentials",
      });
    }

    const wishlistDoc = await wishlistModel.findOne({
      user_id: user._id,
    }).lean();

    const wishlistProducts = wishlistDoc?.products || [];
    const wishlistCount = wishlistProducts.length;

    const cartDoc = await CartModel.findOne({
      user_id: user._id,
    }).lean();

    const cartItems = cartDoc?.items || [];
    const cartCount = cartItems.length;

    // 🔹 Generate token
    const token = createToken(user, "7d");

    // 🔹 Prepare user data for response
    const userData = {
      userid: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      address: user.address,
      location: user.location,
      profileImage: user.profileImage,
      permissions: user.permissions,
    };

    return res.status(200).json({
      status: "1",
      message: "Login successful",
      data: {
        user: userData,
        token,
        wishlist: wishlistCount,
        cart: cartCount,
      },
    });
  } catch (error) {
    console.error("LoginAll Error:", error);
    return res.status(500).json({
      status: "0",
      message: error.message || "Internal Server Error",
    });
  }
};


//Firebase Admin SDK Initialized Local
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

//Firebase Admin SDK Initialized Production
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountProd),
});



const googleAuth = async (req, res) => {
  try {
    const { token, role = "Customer" } = req.body;

    if (!token) {
      return res.status(400).json({
        status: "0",
        message: "Token is required",
      });
    }

    // 🔹 Verify Google ID Token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { email, name } = decodedToken;

    if (!email) {
      return res.status(400).json({
        status: "0",
        message: "Invalid Google token",
      });
    }

    // 🔹 Check user
    let user = await User.findOne({ email });

    // =====================================================
    // 🔹 IF USER NOT EXISTS → REGISTER
    // =====================================================
    if (!user) {
      let ipAddress = null;
      let networkAddress = null;
      let permissions = [];

      if (role === "Customer") {
        try {
          ipAddress =
            req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.socket.remoteAddress;

          if (ipAddress?.startsWith("::ffff:")) {
            ipAddress = ipAddress.replace("::ffff:", "");
          }

          const ipData = await axios.get(
            `https://ipapi.co/${ipAddress}/json/`
          );
          networkAddress = `${ipData.data.city}, ${ipData.data.region}, ${ipData.data.country_name}`;
        } catch (err) {
          console.log("IP Info Error:", err.message);
        }
      }

      if (role === "Admin") permissions = ["*"];

      // 🔹 Profile Image
      let profileImage = "/Uploads/images/default.webp";


      user = new User({
        name,
        email,
        phone: "",
        password: "GoogleAuth", // OAuth user
        address: "",
        location: { type: "Point", coordinates: [0, 0] },
        role,
        permissions,
        ipAddress,
        networkAddress,
        status: "Active",
        profileImage,
      });

      await user.save();

    }

    // =====================================================
    // 🔹 LOGIN (COMMON FOR BOTH)
    // =====================================================

    const wishlistDoc = await wishlistModel.findOne({
      user_id: user._id,
    }).lean();

    const wishlistProducts = wishlistDoc?.products || [];
    const wishlistCount = wishlistProducts.length;

    const cartDoc = await CartModel.findOne({
      user_id: user._id,
    }).lean();

    const cartItems = cartDoc?.items || [];
    const cartCount = cartItems.length;


    const authToken = createToken(user, "7d");

    const userData = {
      userid: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      address: user.address,
      location: user.location,
      profileImage: user.profileImage,
      permissions: user.permissions,
    };

    return res.status(200).json({
      status: "1",
      message: "Google authentication successful",
      data: {
        user: userData,
        token: authToken,
        wishlist: wishlistCount,
        cart: cartCount,
      },
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(500).json({
      status: "0",
      message: error.message || "Internal Server Error",
    });
  }
};


// To Fetch All User's
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

     const user_id = req.user._id;

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


// update user api
const updateUser = async (req, res) => {
  try {
   const user_id = req.user._id;
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
    if (req.files?.["profileImage"]?.[0]) {
      updateFields.profileImage = await image_processor(
        req.files["profileImage"][0].path
      );
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



const forgotPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "0",
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: "0",
        message: "User not found with this email, Please register first",
      });
    }


    if (user.password === "GoogleAuth") {
      return res.status(400).json({
        status: "0",
        message: "Password reset not allowed for Google login users",
      });
    }

   const payload = {
      userid: user._id,
      purpose: "RESET_PASSWORD",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "30m",
    });

    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

    // TODO: Send email here

    return res.status(200).json({
      status: "1",
      message: "Password reset link sent to your email, link expires in 30 minutes",
    });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({
      status: "0",
      message: error.message || "Internal Server Error",
    });
  }
};


const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        status: "0",
        message: "Token and new password are required",
      });
    }

    // 🔹 Verify token
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        status: "0",
        message: "Invalid or expired reset token",
      });
    }

    if (payload.purpose !== "RESET_PASSWORD") {
      return res.status(401).json({
        status: "0",
        message: "Invalid reset token",
      });
    }

    const user = await User.findById(payload.userid);
    if (!user) {
      return res.status(404).json({
        status: "0",
        message: "User not found",
      });
    }

    // 🔹 Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    return res.status(200).json({
      status: "1",
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({
      status: "0",
      message: error.message || "Internal Server Error",
    });
  }
};




module.exports = {
  register,
  login,
  googleAuth,
  resetPassword,
  forgotPasswordRequest,
  getAllUsers,
  getUserById,
  updateUser,
};
