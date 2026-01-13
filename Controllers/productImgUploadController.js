
const Images = require("../Models/ProductImgModel");

const uploadProductMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // console.log(req.files);

    const mediaUrls = req.files.media.map((file) => file.path);

    res.status(201).json({
      message: "Media uploaded successfully",
      productImages: mediaUrls,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      message: "Error uploading media",
      error: error.message,
    });
  }
};

const productIdByImages = async (req, res) => {
  try {
    const { product_id } = req.params;

    if (!product_id) {
      return res.status(400).json({
        status: "0",
        message: "product_id are required",
      });
    }

    // Find all images related to the given product_id and vendor_id
    const productImages = await Images.find({ product_id });

    if (!productImages || productImages.length === 0) {
      return res
        .status(404)
        .json({ message: "No images found for the given product and vendor" });
    }

    res.status(200).json({ status: "1", success: true, images: productImages });
  } catch (error) {
    console.error("Error fetching product images:", error);
    res.status(500).json({
      status: "0",
      message: "Error fetching product images",
      error: error.message,
    });
  }
};

//image ko delete karna ha image_id ke throw
const imagesDelete = async (req, res) => {
  try {
    const { image_id } = req.params;

    if (!image_id) {
      return res.status(400).json({
        status: "0",
        success: false,
        message: "Image ID is required",
      });
    }

    // Find and delete the image by image_id
    const deletedImage = await Images.findOneAndDelete({ image_id });

    if (!deletedImage) {
      return res.status(404).json({
        status: "0",
        success: false,
        message: "Image not found",
      });
    }

    res.status(200).json({
      status: "1",
      success: true,
      message: "Image deleted successfully",
      deletedImage,
    });
  } catch (error) {
    // console.error("Image Delete Error:", error);
    res.status(500).json({
      status: "0",
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = { uploadProductMedia, productIdByImages, imagesDelete };
