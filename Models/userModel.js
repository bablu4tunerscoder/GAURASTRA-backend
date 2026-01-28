const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    password: {
      type: String,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    role: {
      type: String,
      enum: ["Customer", "Admin", "Employee"],
      default: "Customer",
      index: true,
    },

    permissions: {
      type: [String],
      default: [],
    },

    ipAddress: String,
    networkAddress: String,

    status: {
      type: String,
      enum: ["Pending", "Active", "Inactive"],
      default: "Pending",
      index: true,
    },

    dob: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["Man", "Woman", "Other"],
      default: null
    },

    profileImage: {
      type: String,
      default: "/Uploads/images/default.webp",
    },

    otp: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", userSchema);
