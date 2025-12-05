const cloudinary = require("../../Config/cloudinaryConfig");

/**
 * Upload single image (Base64 / FilePath)
 */
exports.upload_qr_image = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: "qr_code", // 📂 Cloudinary folder name
      resource_type: "image",
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (err) {
    throw new Error("Image upload failed: " + err.message);
  }
};

exports.upload_offline_image = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: "offline", // 📂 Cloudinary folder name
      resource_type: "image",
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (err) {
    throw new Error("Image upload failed: " + err.message);
  }
};

