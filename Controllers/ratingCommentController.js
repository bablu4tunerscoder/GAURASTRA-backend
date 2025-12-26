const Rating = require('../Models/ratingAndComment');
const { pagination_ } = require('../Utils/pagination_');


const createRating = async (req, res) => {

    const { rating_value, comment_text, order_id, product_id } = req.body;
    const user_id = req.user._id;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "product_id is required",
      });
    }

    if (!rating_value || rating_value < 1 || rating_value > 5) {
      return res.status(400).json({
        success: false,
        message: "rating_value must be between 1 and 5",
      });
    }

    try {
        const newRating = await Rating.create({
      user_id,
      product_id,
      order_id: order_id || null,
      rating_value,
      comment_text: comment_text?.trim() || null,
      is_published: false, 
    });

        res.status(201).json({
            success: true,
            data: newRating,
            message: 'Rating and comment added successfully.'
        });

    } catch (error) {
    /* -------- Duplicate rating -------- */
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "You have already submitted a rating for this product",
      });
    }

    /* -------- Validation error -------- */
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (val) => val.message
      );
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    console.error("Rating creation error:", error);
    res.status(500).json({
      success: false,
      message:
        "Server error occurred while creating rating",
    });
  }
};

const listRatingsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    /* -------- Validate productId -------- */
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const filter = {
      product_id: productId,
      is_published: true,
    };

 
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });


    const [ratings, totalRecords] = await Promise.all([
      Rating.find(filter)
        .populate("user_id", "name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Rating.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    res.status(200).json({
      success: true,
      count: ratings.length,

      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },

      data: ratings,
    });
  } catch (error) {
    console.error("List ratings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error occurred while fetching ratings",
    });
  }
};


const updatePublishStatus = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { is_published } = req.body;

    if (!ratingId) {
      return res.status(400).json({
        success: false,
        message: "Invalid rating id",
      });
    }

    /* -------- Validate is_published -------- */
    if (typeof is_published !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "Invalid value for is_published. Must be true or false.",
      });
    }

    /* -------- Update publish status -------- */
    const updatedRating = await Rating.findByIdAndUpdate(
      ratingId,
      { is_published },
      { new: true, runValidators: true }
    );

    if (!updatedRating) {
      return res.status(404).json({
        success: false,
        message: "Rating not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Rating ${
        is_published ? "published" : "unpublished"
      } successfully`,
      data: updatedRating,
    });
  } catch (error) {
    console.error("Update publish status error:", error);
    res.status(500).json({
      success: false,
      message:
        "Server error occurred while updating publish status",
    });
  }
};

const listAllRatingsForAdmin = async (req, res) => {
  try {
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 20,
      maxLimit: 50,
    });

    const filter = {};

    if (req.query.is_published !== undefined) {
      filter.is_published = req.query.is_published === "true";
    }

    if (
      req.query.product_id
    ) {
      filter.product_id = req.query.product_id;
    }

    if (
      req.query.user_id
    ) {
      filter.user_id = req.query.user_id;
    }

    /* -------- Fetch ratings -------- */
    const [allRatings, totalRecords] = await Promise.all([
      Rating.find(filter)
        .populate("user_id", "name email")
        .populate("product_id", "name")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Rating.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    res.status(200).json({
      success: true,
      count: allRatings.length,

      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },

      data: allRatings,
    });
  } catch (error) {
    console.error("List all ratings error:", error);
    res.status(500).json({
      success: false,
      message:
        "Server error occurred while fetching all ratings",
    });
  }
};

module.exports = {
    createRating,
    listRatingsByProduct,
    listAllRatingsForAdmin,
    updatePublishStatus
};