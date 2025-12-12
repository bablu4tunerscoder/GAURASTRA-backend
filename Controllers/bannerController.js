const Banner = require("../Models/bannerModel");
const { pagination_ } = require("../Utils/pagination_");

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
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // ✅ parallel execution
    const [banners, totalRecords] = await Promise.all([
      Banner.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Banner.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    res.status(200).json({
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },
      data: banners,
    });
  } catch (err) {
    console.error("Get banners error:", err);
    res.status(500).json({
      message: "Server error while fetching banners",
      error: err.message,
    });
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
