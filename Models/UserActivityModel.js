const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      required: true,
      index: true,
    },

    pageVisited: String,

    timeSpent: Number,

    items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          index: true
        },

        productName: String,
        price: Number,
        quantity: Number
      }
    ],

    location: {
      country: String,
      state: String,
      city: String,
      ip: String
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: -1
    }
  },
  { _id: false }
);

const userActivitySchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    activities: [activitySchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserActivity", userActivitySchema);
