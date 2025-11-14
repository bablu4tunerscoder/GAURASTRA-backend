const mongoose = require("mongoose");

const landingContentSchma = new mongoose.Schema(
  {
    heading1: { type: String, require: true },
    heading2: { type: String, require: true },
    description: { type: String, require: true },
    images: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("LandingContent", landingContentSchma);
