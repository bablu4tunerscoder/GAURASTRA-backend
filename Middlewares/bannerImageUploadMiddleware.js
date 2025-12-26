// middlewares/bannerUploadMiddleware.js
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const cloudinary = require("../Config/cloudinaryConfig");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "banners/images",
      public_id: `banner-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      resource_type: "image",
      format: "webp",
    };
  },
});

const bannerUploader = multer({ storage });

module.exports = { bannerUploader };
