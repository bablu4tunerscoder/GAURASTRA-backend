const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    password: {
      type: String
    },

    address: {
      type: String
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },

    role: {
      type: String,
      enum: ["Customer", "Admin", "Employee"],
      default: "Customer",
      index: true
    },

    permissions: {
      type: [String],
      default: []
    },

    ipAddress: String,
    networkAddress: String,

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      index: true
    },

    profileImage: {
      type: String,
      default: "/Uploads/images/default.webp"
    },
  },
  { timestamps: true }
);


userSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", userSchema);
