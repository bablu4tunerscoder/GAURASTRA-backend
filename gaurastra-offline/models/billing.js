const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// Single Billing Product
const BillingItemSchema = new mongoose.Schema({
  product_id: { type: String, required: true },  // UUID
  variant_id: { type: String, required: true },  // UUID
  title: String,
  price: Number,
  quantity: Number,
  line_total: Number,
});

// Main Billing Schema
const BillingSchema = new mongoose.Schema(
  {
    billing_id: {
      type: String,
      unique: true,
      default: () => uuidv4(),
      index: true,
    },

    items: [BillingItemSchema],

    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total_amount: { type: Number, required: true },

    payment_method: {
      type: String,
      enum: ["cash", "online", 'card'],
      default: "cash",
    },

    user_info: {
      full_name: { type: String },
      phone: { type: String },
    },

    address: {
      pincode: { type: String },
      address_line1: { type: String },
      address_line2: { type: String },
      city: { type: String },
      state: { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OfflineBilling", BillingSchema);
