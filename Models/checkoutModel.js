const mongoose = require("mongoose");

const checkoutSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },


    cart_items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        sku: String,
        name: String,

        quantity: {
          type: Number,
          required: true,
          min: 1,
        },

        price: {
          original_price: Number,
          discounted_price: Number,
        },

        item_total: Number,
      },
    ],


    price_details: {
      subtotal: {
        type: Number,
        required: true,
      },

      discount: {
        type: Number,
        default: 0,
      },

      delivery_charge: {
        type: Number,
        default: 0,
      },

      total_amount: {
        type: Number,
        required: true,
      },
    },

    coupon: {
      code: String,
      discountAmount: Number,
      couponType: {
        type: String,
        enum: ["USER", "PUBLIC"],
      },
    },

    payment_method: {
      type: String,
      enum: ["COD", "ONLINE"],
    },

    address_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserAddress",
        default: null,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "COMPLETED"],
      default: "ACTIVE",
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 60 * 1000), 
      index: { expires: 0 }, 
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Checkout", checkoutSchema);
