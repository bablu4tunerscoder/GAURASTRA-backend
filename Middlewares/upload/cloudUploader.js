const multer = require("multer");
const cloudinary = require("../../Config/cloudinaryConfig");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const fileFilter = require("./fileFilter"); 

/**
 * Cloudinary uploader
 * @param {string} folder - cloudinary folder name
 * @param {"image" | "video" | "image+video"} type
 */


const cloudUploader = (folder, type = "image") => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder,
      public_id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      resource_type: file.mimetype.startsWith("video/")
        ? "video"
        : "image",
      format: file.mimetype.startsWith("image/")
        ? "webp"
        : "mp4",
    }),
  });

  return multer({
    storage,
    fileFilter: fileFilter(type),
  });
};


module.exports = cloudUploader;
