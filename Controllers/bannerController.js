const Banner = require("../Models/bannerModel");

// ✅ Create Banner
exports.createBanner = async (req, res) => {
  try {
    const { buttonText = "", redirectURL = "" } = req.body;

    // Use Cloudinary URL from req.file.path
    const bannerUrl = req.file?.path;
    if (!bannerUrl) {
      return res.status(400).json({ message: "Banner image is required" });
    }

    const newBanner = await Banner.create({
      image: bannerUrl, // <-- Cloudinary URL
      buttonText: buttonText.trim(),
      redirectURL: redirectURL.trim(),
    });

    res.status(201).json(newBanner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update Banner
exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { buttonText, redirectURL } = req.body;

    let updateData = {
      buttonText: buttonText?.trim(),
      redirectURL: redirectURL?.trim(),
    };

    // Only update image if new file uploaded
    if (req.file?.path) {
      updateData.image = req.file.path; // <-- Cloudinary URL
    }

    const updatedBanner = await Banner.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.status(200).json(updatedBanner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get All Banners
exports.getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 }).lean();
    res.status(200).json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete Banner
exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBanner = await Banner.findByIdAndDelete(id);

    if (!deletedBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.status(200).json({ message: "Banner deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
