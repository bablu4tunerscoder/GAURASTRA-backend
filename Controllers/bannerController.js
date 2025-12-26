const Banner = require("../Models/bannerModel");
const { pagination_ } = require("../Utils/pagination_");

// ✅ Create Banner
exports.createBanner = async (req, res) => {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ message: "Banner image is required" });
    }

    const banner = await Banner.create({
      imageUrl: req.file.path,
      buttonText: req.body.buttonText?.trim() || "",
      redirectURL: req.body.redirectURL?.trim() || "",
      priority: Number(req.body.priority) || 0,
    });

    res.status(201).json({
      message: "Banner created successfully",
      data: banner
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ✅ Update Banner
exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = {};

    if (req.body.buttonText !== undefined)
      updateData.buttonText = req.body.buttonText.trim();

    if (req.body.redirectURL !== undefined)
      updateData.redirectURL = req.body.redirectURL.trim();

    if (req.body.priority !== undefined)
      updateData.priority = Number(req.body.priority);

    if (req.file?.path)
      updateData.imageUrl = req.file.path;

    const banner = await Banner.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.status(200).json({
      message: "Banner updated successfully",
      data: banner
    });
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

  

    const [banners, totalRecords] = await Promise.all([
      Banner.find()
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Banner.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json({
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage: page < totalPages,
      },
      data: banners,
    });
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
