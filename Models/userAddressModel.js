const mongoose = require("mongoose");

const userAddressSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true, 
      trim: true,
    },

    phone: {
      type: String,
      required: true,
       match: /^[6-9]\d{9}$/,
    },

    alternate_phone: {
      type: String,
      match: /^[6-9]\d{9}$/,
    },

    address_line1: {
      type: String,
      required: true,
      trim: true,
    },

    address_line2: {
      type: String,
      trim: true,
    },

    landmark: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    country: {
      type: String,
      default: "India",
    },

    pincode: {
      type: String,
      required: true,
      match: /^[1-9][0-9]{5}$/, 
      index: true,
    },

    address_type: {
      type: String,
      enum: ["Home", "Office", "Other"],
      default: "Home",
    },

  },
  {
    timestamps: true,
  }
);

userAddressSchema.index(
  { user_id: 1, is_default: 1 },
  { unique: true, partialFilterExpression: { is_default: true } }
);

module.exports = mongoose.model("UserAddress", userAddressSchema);

 