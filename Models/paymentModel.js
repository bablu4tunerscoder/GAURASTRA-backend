const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const paymentSchema = new mongoose.Schema(
  {
    payment_id: { type: String, unique: true, required: true, default: uuidv4 },
    order_id: { type: String, required: true,index: true }, // Simple string reference
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    payment_gateway: { type: String, default: "PhonePe" },
    merchant_transaction_id: { type: String, required: true, unique: true },
    transaction_id: { type: String, index: true },
    payment_mode: {
      type: String,
    },
    payment_status: {
      type: String,
    },
    failure_reason: { type: String },

    gateway_response: { type: mongoose.Schema.Types.Mixed },
    phonepe_payment_url: { type: String },
    callbacks: {
      success: { type: String },
      failure: { type: String }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
