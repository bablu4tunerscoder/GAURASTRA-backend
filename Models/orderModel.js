const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    /* 🔗 User Reference + Snapshot */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    userSnapshot: {
      name: String,
      email: String,
      phone: String
    },

    /* 🚚 Delivery Address Snapshot */
    deliveryAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      landmark: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      flatNumber: String,
    },

    /* 🛒 Ordered Products (Multiple allowed) */
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
          index: true,
        },

        sku: {
          type: String,
          required: true,
          index: true,
        },

        snapshot: {
          name: String,
          price: Number,
          size: String,
          color: String,
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
        },

        totalPrice: {
          type: Number,
          required: true,
        },
      },
    ],


    totalOrderAmount: {
      type: Number,
      required: true
    },

    currency: {
      type: String,
      default: "INR"
    },

    /* 💳 Payment */
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null
    },

    paymentStatus: {
      type: String,
      enum: ["Enquiry", "Pending", "Paid", "Failed"],
      default: "Enquiry",
      index: true
    },

    /* 📦 Order Lifecycle */
    orderStatus: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Dispatched",
        "Shipped",
        "Delivered",
        "Cancelled"
      ],
      default: "Pending",
      index: true
    },

    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        notes: String
      }
    ],
    
  },
  { timestamps: true }
);


orderSchema.pre("save", function (next) {
  if (this.isModified("orderStatus")) {
    this.statusHistory.push({
      status: this.orderStatus,
      notes: `Status changed to ${this.orderStatus}`,
    });
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
