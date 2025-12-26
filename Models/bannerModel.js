const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    buttonText: {
      type: String,
    },
    redirectURL: {
      type: String,
    },
    priority: {
      type: Number,
      default: 0,
      index: true
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Banner", bannerSchema);
