const LandingContent = require("../Models/LandingContent");
const { pagination_ } = require("../Utils/pagination_");

exports.createLandingContent = async (req, res) => {
  try {
    const { heading1, heading2, description } = req.body;
 
    const images = req.files.map(file => `/Uploads/landing/${file.filename}`);
 
    const content = new LandingContent({
      heading1,
      heading2,
      description,
      images,
    });
 
    await content.save();
 
    res.status(201).json({ message: "Landing content created", content });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
 
exports.getLandingContent = async (req, res) => {
  try {
    // Extract pagination details
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // Run queries in parallel
    const [content, totalRecords] = await Promise.all([
      LandingContent.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      LandingContent.countDocuments(),
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
      data: content,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// ✅ GET Landing Content by ID
exports.getLandingContentById = async (req, res) => {
  try {
    const content = await LandingContent.findById(req.params.id).lean();
    if (!content) {
      return res.status(404).json({ message: "Landing content not found" });
    }
    res.status(200).json(content);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// ✅ UPDATE Landing Content
exports.updateLandingContent = async (req, res) => {
  try {
    const { heading1, heading2, description } = req.body;
    let updatedData = { heading1, heading2, description };

    if (req.files && req.files.length > 0) {
      const images = req.files.map(
        (file) => `/Uploads/landing/${file.filename}`
      );
      updatedData.images = images;
    }

    const updatedContent = await LandingContent.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    if (!updatedContent) {
      return res.status(404).json({ message: "Landing content not found" });
    }

    res
      .status(200)
      .json({ message: "Landing content updated", updatedContent });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// ✅ DELETE Landing Content
exports.deleteLandingContent = async (req, res) => {
  try {
    const deletedContent = await LandingContent.findByIdAndDelete(
      req.params.id
    );

    if (!deletedContent) {
      return res.status(404).json({ message: "Landing content not found" });
    }

    res.status(200).json({ message: "Landing content deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
