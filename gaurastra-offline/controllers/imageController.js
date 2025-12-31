

exports.uploadOfflineImage = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image file",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      url: req.file.path,
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
