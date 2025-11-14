// Middlewares/productuploadMiddleware.js
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const cloudinary = require("../Config/cloudinaryConfig");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Image/Video Upload Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const folder = file.mimetype.startsWith("image/")
      ? "products/images"
      : "products/videos";

    return {
      folder,
      public_id: `media-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      resource_type: file.mimetype.startsWith("video/") ? "video" : "image",
      format: file.mimetype.startsWith("image/") ? "webp" : "mp4",
    };
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image and video files are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

// Return URL after upload (already handled by Cloudinary)
const processMedia = async (file) => {
  return file.path; // Cloudinary returns direct URL in `file.path`
};

module.exports = { upload, processMedia };
