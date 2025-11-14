// config/cloudinaryConfig.js
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dtug6rmfb", // 🔁 Replace with actual
  api_key: "127716781532415",
  api_secret: "MLy0GGEeeeGxh5tn5CZ-NvX3Ohw",
  secure: true,
});

module.exports = cloudinary;
