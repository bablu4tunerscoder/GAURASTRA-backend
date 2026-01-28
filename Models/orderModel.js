const mongoose = require("mongoose");

const deliveryAddress = {
  name: {
    type: String,
    required: true,
  },

  phone: {
    type: String,
    required: true,
  },

  alternate_phone: String,

  address_line1: {
    type: String,
    required: true,
  },

  address_line2: String,

  landmark: String,

  city: {
    type: String,
    required: true,
  },

  state: {
    type: String,
    required: true,
  },

  country: {
    type: String,
    default: "India",
  },

  pincode: {
    type: String,
    required: true,
  },
};

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    order_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    userSnapshot: {
      name: String,
      email: String,
      phone: String,
    },

    deliveryAddress: {
      type: deliveryAddress,
      required: true,
    },

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

    couponSnapshot: {
      code: String,
      discountAmount: Number,
      couponType: {
        type: String,
        enum: ["USER_COUPON", "PUBLIC_COUPON"]
      }
    },
    totalOrderAmount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    deliveryStatus: {
      type: String,
      enum: [
        "PENDING",
        "NOT_DISPATCHED",
        "DISPATCHED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "RETURNED",
      ],
      default: "PENDING",
      index: true,
    },

    orderStatus: {
      type: String,
      enum: ["CREATED", "PAYMENT_INITIATED", "CONFIRMED", "CANCELLED", 'FAILED'],
      default: "CREATED",
      index: true,
    },

    orderStatusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        notes: String,
      },
    ],
    deliveryStatusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        notes: String,
      },
    ],
  },
  { timestamps: true },
);

orderSchema.pre("save", function (next) {
  if (this.isNew) {
    this.orderStatusHistory.push({
      status: this.orderStatus,
      notes: "Order created",
    });

    this.deliveryStatusHistory.push({
      status: this.deliveryStatus,
      notes: "Order created",
    });
  } else {
    if (this.isModified("orderStatus")) {
      this.orderStatusHistory.push({
        status: this.orderStatus,
        notes: `Status changed to ${this.orderStatus}`,
      });
    }

    if (this.isModified("deliveryStatus")) {
      this.deliveryStatusHistory.push({
        status: this.deliveryStatus,
        notes: `Status changed to ${this.deliveryStatus}`,
      });
    }
  }
  next();
});


module.exports = mongoose.model("Order", orderSchema);
