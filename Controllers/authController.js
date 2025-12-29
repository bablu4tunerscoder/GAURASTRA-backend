const bcrypt = require("bcryptjs");

const User = require("../Models/userModel");

const { getGeolocation } = require("../Utils/geolocation");
const axios = require("axios");

const admin = require("firebase-admin");
// const serviceAccount = require("../Config/serviceAccountKey.json");
const serviceAccountProd = require("../Config/serviceAccountKeyProd.json");
const { createToken } = require("../Utils/JWTAuth");

const wishlistModel = require("../Models/wishlistModel");
const CartModel = require("../Models/CartModel");
const jwt = require("jsonwebtoken");
const { generateOTP } = require("../Utils/helpers");
const { userVerifyEmail } = require("../email/user_verify_email");
const { imageToWebp } = require("../Middlewares/upload/imageProcessor");


const register = async (req, res) => {
  try {
    const { name, email, phone, password, address, role } = req.body;

    // 🔹 Check duplicate
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {

      // 👉 Case 1: User Pending hai → OTP resend
      if (existingUser.status === "Pending") {

        const OTP = generateOTP();

        // OTP save with expiry
        existingUser.otp = OTP;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        existingUser.password = hashedPassword;

        await existingUser.save();

        // Send email
        await userVerifyEmail({
          email: existingUser.email,
          name: existingUser.name,
          otp: OTP,
        });

        // JWT token
        const payload = {
          userid: existingUser._id,
          purpose: "USER_VERIFICATION",
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: "30m",
        });

        return res.status(200).json({
          status: "1",
          message: "OTP sent to your email for verification",
          token,
        });
      }

      // 👉 Case 2: User already verified
      if (existingUser.status === "Active") {
        return res.status(400).json({
          status: "0",
          message: "User already verified. Please login.",
        });
      }

      // 👉 Case 3: User inactive / blocked
      return res.status(400).json({
        status: "0",
        message: "Your account is inactive. Contact support.",
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
   
    if (req.file) {
          profileImage = await imageToWebp(req.file.path);
        }

    const OTP = generateOTP()

    // 🔹 Create User
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      address,
      location,
      userotp: OTP,
      role: role || "Customer",
      permissions,
      ipAddress,
      networkAddress,
      status: "Pending",
      profileImage,
    });

    await newUser.save();

    // 🔹 Send verification email
    userVerifyEmail(email, name, OTP);

    const payload = {
      userid: newUser._id,
      purpose: "USER_VERIFICATION",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "30m",
    });

    return res.status(201).json({
      status: "1",
      message: "User Registered Successfully, Verify your email",
      token: token,
    });
  } catch (error) {
    console.error("RegisterAll Error:", error);
    return res.status(500).json({
      status: "0",
      message: error.message || "Internal Server Error",
    });
  }
};


const verifyUserEmail = async (req, res) => {
  try {
    const { otp } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!otp || !token) {
      return res.status(400).json({
        status: "0",
        message: "OTP and token are required",
      });
    }

    // 🔹 Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        status: "0",
        message: "Invalid or expired token",
      });
    }

    if (decoded.purpose !== "USER_VERIFICATION") {
      return res.status(401).json({
        status: "0",
        message: "Invalid token purpose",
      });
    }

    // 🔹 Find user
    const user = await User.findById(decoded.userid);

    if (!user) {
      return res.status(404).json({
        status: "0",
        message: "User not found",
      });
    }

    // 🔹 Already verified
    if (user.status === "Active") {
      return res.status(400).json({
        status: "0",
        message: "User already verified",
      });
    }

    // 🔹 OTP match check
    if (user.otp !== otp) {
      return res.status(400).json({
        status: "0",
        message: "Invalid OTP",
      });
    }

    // 🔹 Verify user
    user.status = "Active";
    user.otp = null;
    await user.save();

    return res.status(200).json({
      status: "1",
      message: "Email verified successfully",
    });

  } catch (error) {
    console.error("Verify Email Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Server error",
    });
  }
};

const resendUserOTP = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        status: "0",
        message: "Token is required",
      });
    }

    // 🔹 Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        status: "0",
        message: "Invalid or expired token",
      });
    }

    if (decoded.purpose !== "USER_VERIFICATION") {
      return res.status(401).json({
        status: "0",
        message: "Invalid token purpose",
      });
    }

    // 🔹 Find user
    const user = await User.findById(decoded.userid);

    if (!user) {
      return res.status(404).json({
        status: "0",
        message: "User not found",
      });
    }

    // 🔹 Only Pending users can resend OTP
    if (user.status !== "Pending") {
      return res.status(400).json({
        status: "0",
        message: "User already verified or inactive",
      });
    }

    // 🔹 Generate new OTP
    const newOTP = generateOTP();

    user.otp = newOTP;
    await user.save();

    // 🔹 Send OTP email
    await userVerifyEmail({
      email: user.email,
      name: user.name,
      otp: newOTP,
    });

    return res.status(200).json({
      status: "1",
      message: "OTP resent successfully to your email",
    });

  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Server error",
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

    // 🔹 User status check
    if (user.status !== "Active") {
      return res.status(401).json({
        status: "0",
        message: "User is not active",
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

  verifyUserEmail,
  resendUserOTP,

};
