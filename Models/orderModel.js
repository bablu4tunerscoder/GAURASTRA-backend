const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const orderSchema = new mongoose.Schema(
  {
    order_id: { type: String, unique: true, required: true, default: uuidv4 },

    user: {
      user_id: { type: String, required: true, index: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },

    delivery_address: {
      full_name: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      landmark: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      flat_number: { type: String },
    },

    products: [
      {
        product_id: { type: String, required: true, index: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, default: 1 },
        total_price: { type: Number, required: true },
        size: { type: String, required: true },
      },
    ],

    total_order_amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    payment_id: { type: String }, // old
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },

    // 👇 NEW FIELD for payment tracking
    payment_status: {
  type: String,
  enum: ["Enquiry", "Pending", "Paid", "Failed"],
  default: "Enquiry",
},


    // Order lifecycle (delivery/shipping)
    order_status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Dispatched",
      ],
      default: "Pending",
      index: true
    },

    status_history: [
      {
        status: { type: String },
        changed_at: { type: Date, default: Date.now },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Add status to history when order status changes
orderSchema.pre("save", function (next) {
  if (this.isModified("order_status")) {
    this.status_history.push({
      status: this.order_status,
      notes: `Status changed to ${this.order_status}`,
    });
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
