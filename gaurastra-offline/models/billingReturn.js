const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const ReturnItemSchema = new mongoose.Schema({
  product_id: String,
  variant_id: String,
  title: String,
  price: Number,
  quantity: Number,
  refund_amount: Number,
});

const BillingReturnSchema = new mongoose.Schema(
  {
    return_id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      index: true,
    },

    billing_id: {
      type: String,
      required: true,
      index: true,
    },

    return_type: {
      type: String,
      enum: ["FULL", "PARTIAL"],
      required: true,
    },

    items: [ReturnItemSchema],

    total_refund: {
      type: Number,
      required: true,
    },

    reason: String,

    payment_method: {
      type: String,
      enum: ["cash", "online", "card"],
    },

    returned_by: {
      name: String,
      phone: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BillingReturn", BillingReturnSchema);
