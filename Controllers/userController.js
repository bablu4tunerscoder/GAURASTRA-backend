const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../Models/userModel");
const Lead = require("../Models/lead.model");
const { getGeolocation } = require("../Utils/geolocation");
const axios = require("axios");
const { processImage } = require("../Middlewares/uploadMiddleware");
const { v4: uuidv4 } = require("uuid");
const admin = require("firebase-admin");
const serviceAccount = require("../Config/serviceAccountKey.json");
const serviceAccountProd = require("../Config/serviceAccountKeyProd.json");

const registerAll = async (req, res) => {
  try {
    const { name, email, phone, password, address, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      throw new Error("Email or phone number already registered");
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 🔹 User Latitude & Longitude Handling
    // ✅ Improved Latitude & Longitude Handling ✅
    let userLatitude = null,
      userLongitude = null;

    if (address) {
      const location = await getGeolocation(address);
      if (location) {
        userLatitude = location.latitude;
        userLongitude = location.longitude;
      }
    }

    // ✅ Fetch IP & Network Address for Customers ✅
    let ipAddress = null,
      networkAddress = null;

    if (role === "Customer") {
      try {
        // ✅ Get actual IP address from headers
        ipAddress =
          req.headers["x-forwarded-for"]?.split(",")[0] ||
          req.socket.remoteAddress;

        // 🔧 Clean IPv6 prefix
        if (ipAddress && ipAddress.startsWith("::ffff:")) {
          ipAddress = ipAddress.replace("::ffff:", "");
        }

        // 🗺 Get location info based on IP
        const ipData = await axios.get(`https://ipapi.co/${ipAddress}/json/`);
        networkAddress = `${ipData.data.city}, ${ipData.data.region}, ${ipData.data.country_name}`;
      } catch (err) {
        console.log("IP Info Error:", err.message);
      }
    }

   

    // Default profile image
    let profileImage = "/Uploads/images/default.webp";
    if (
      req.files &&
      req.files["profileImage"] &&
      req.files["profileImage"][0]
    ) {
      profileImage = await processImage(req.files["profileImage"][0].path);
    }

    const newUserId = uuidv4();
    // Create new user
    const newUser = new User({
      user_id: newUserId,
      name,
      email,
      phone,
      password: hashedPassword,
      address,
      latitude: userLatitude,
      longitude: userLongitude,
      role,
      ipAddress,
      networkAddress,
      status: "Active",
      profileImage,
    });

    await newUser.save();

    res.status(201).json({
      status: "1",
      message: "User Registered Successfully",
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    console.log("Error:", error.message);
    res.status(500).json({ status: "0", message: error.message });
  }
};

const loginAll = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    console.log('emailOrPhone, password', req.body)


    // Find User
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    if (!user) {
      return res.status(404).json({ status: "0", message: "User not found" });
    }

    // Check Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ status: "0", message: "Invalid credentials" });
    }

    // Generate Token
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      status: "1",
      message: "Login successful",
      data: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        address: user.address,
        latitude: user.latitude,
        longitude: user.longitude,
        profileImage: user.profileImage,
        token,
      },
    });
  } catch (error) {
    console.log("Error:", error.message);
    res.status(500).json({ status: "0", message: error.message });
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

const googleRegister = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(201).json({
        status: "1",
        message: "Token Is Required",
      });
    }

    // Token Verification
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { email, name, role = "Customer" } = decodedToken; // Ensure role has a default value

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // ✅ Fetch IP & Network Address for Customers ✅
    let ipAddress = null,
      networkAddress = null;

    if (role === "Customer") {
      try {
        // ✅ Get actual IP address from headers
        ipAddress =
          req.headers["x-forwarded-for"]?.split(",")[0] ||
          req.socket.remoteAddress;

        // 🔧 Clean IPv6 prefix
        if (ipAddress && ipAddress.startsWith("::ffff:")) {
          ipAddress = ipAddress.replace("::ffff:", "");
        }

        // 🗺 Get location info based on IP
        const ipData = await axios.get(`https://ipapi.co/${ipAddress}/json/`);
        networkAddress = `${ipData.data.city}, ${ipData.data.region}, ${ipData.data.country_name}`;
      } catch (err) {
        console.log("IP Info Error:", err.message);
      }
    }

    // Default profile image
    let profileImage = "/Uploads/images/default.webp";
    if (req.files?.["profileImage"]?.[0]) {
      profileImage = await processImage(req.files["profileImage"][0].path);
    }

    const newUserId = uuidv4();

    // Create new user
    const newUser = new User({
      user_id: newUserId,
      name,
      email,
      phone: 0,
      password: "",
      address: "",
      latitude: "",
      longitude: "",
      role,
      ipAddress,
      networkAddress,
      status: "Active",
      profileImage,
    });

    await newUser.save();

    res.status(201).json({
      status: "1",
      message: "User Registered Successfully",
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    console.log("Error:", error.message);
    res.status(500).json({ status: "0", message: error.message });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        status: "0",
        message: "Token is required",
      });
    }

    // Token Verification
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { email } = decodedToken;

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: "0",
        message: "User not found. Please register first.",
      });
    }

    // Generate authentication token (JWT)
    const authToken = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      status: "1",
      message: "Login successful",
      data: {
        user,
        token: authToken,
      },
    });
  } catch (error) {
    console.log("Error:", error.message);
    res.status(500).json({ status: "0", message: error.message });
  }
};

// To Fetch All User's
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json(users); // Return users as a JSON response
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error retrieving users" });
  }
};

// To get a single user by ID
const getUserById = async (req, res) => {
  const { user_id } = req.params; // Extract user_id from request parameters
  try {
    const user = await User.findOne({ user_id }); // Find user by user_id
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user); // Return the user as a JSON response
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error retrieving user" });
  }
};

// update user api
const updateUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { name, phone, address } = req.body;

    let updateFields = { name, phone, address };

    if (address) {
      const location = await getGeolocation(address);
      if (location) {
        updateFields.latitude = location.latitude;
        updateFields.longitude = location.longitude;
      }
    }

    if (
      req.files &&
      req.files["profileImage"] &&
      req.files["profileImage"][0]
    ) {
      updateFields.profileImage = await processImage(
        req.files["profileImage"][0].path
      );
    }

    const updatedUser = await User.findOneAndUpdate({ user_id }, updateFields, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ status: "0", message: "User not found" });
    }
    // --- ✅ 2. ADDED: FIND AND LINK LEAD LOGIC ---
    if (phone) {
      const lead = await Lead.findOne({
        mobile: phone,
        used: false,
        claimedByUser: null,
      });

      if (lead) {
        if (!updatedUser.availableCoupons.includes(lead.couponCode)) {
          updatedUser.availableCoupons.push(lead.couponCode);
        }
        lead.claimedByUser = updatedUser._id;

        await updatedUser.save();
        await lead.save();
      }
    }
    // --- ✅ END OF ADDED LOGIC ---

    res.status(200).json({
      status: "1",
      message: "User Updated Successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.log("Error:", error.message);
    res.status(500).json({ status: "0", message: error.message });
  }
};

module.exports = {
  registerAll,
  loginAll,
  googleRegister,
  googleLogin,
  getAllUsers,
  getUserById,
  updateUser,
};
