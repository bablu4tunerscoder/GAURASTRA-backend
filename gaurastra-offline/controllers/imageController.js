const { upload_offline_image } = require("../utilities/uploadImage");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

exports.uploadOfflineImage = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image file",
      });
    }

    const originalPath = req.file.path;
    const ext = path.extname(originalPath).toLowerCase();
    const webpPath = originalPath.replace(ext, ".webp");

    await sharp(originalPath)
      .toFormat("webp")
      .toFile(webpPath);

    fs.unlinkSync(originalPath);

    console.log("Processed WebP path:", webpPath);

    const absolutePath = path.resolve(webpPath).split(path.sep).join('/');

    const cloudResult = await upload_offline_image(absolutePath);

    fs.unlinkSync(webpPath);

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      data: cloudResult,
    });

  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Upload failed",
      error: error.message,
    });
  }
};
