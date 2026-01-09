const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { generateBillingId } = require("../offline_utils/generateBillingId");

// Single Billing Product
const BillingItemSchema = new mongoose.Schema({
  product_id: { type: String, required: true },  
  variant_id: { type: String, required: true },  
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
     return_status: {
      type: String,
      enum: ["NONE", "PARTIAL", "FULL"],
      default: "NONE",
      index: true,
    },
  },
  { timestamps: true }
);

BillingSchema.pre("save", function (next) {
  if (!this.billing_id) {
    this.billing_id = generateBillingId();
  }
  next();
});
module.exports = mongoose.model("OfflineBilling", BillingSchema);
