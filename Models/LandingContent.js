const mongoose = require("mongoose");

const landingContentSchema = new mongoose.Schema({
  heading1: { type: String, required: true },
  heading2: { type: String, required: true },
  description: { type: String, required: true },
  images: [String]
}, { timestamps: true });

module.exports = mongoose.model("LandingContent", landingContentSchema);

