const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const userSchema = new mongoose.Schema(
  {
    user_id: { type: String, unique: true, required: true, default: uuidv4 },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, index:true },
    password: { type: String },
    address: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    role: {
      type: String,
      enum: ["Customer", "Admin"],
      default: "Customer",
      index:true
    },
    ipAddress: { type: String },
    networkAddress: { type: String },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active", index:true },
    profileImage: { type: String, default: "/Uploads/images/default.webp" },
    
    // ✅ ADD THIS FIELD
    availableCoupons: [{ 
      type: String, 
      index:true
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);