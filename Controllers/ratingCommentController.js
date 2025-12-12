const Rating = require('../Models/ratingAndComment');
const { pagination_ } = require('../Utils/pagination_');


const createRating = async (req, res) => {

    const { rating_value,user_id, comment_text, order_id, product_id } = req.body;

    try {
        const newRating = await Rating.create({
            user_id,
            product_id,
            order_id,
            rating_value,
            comment_text
        });

        res.status(201).json({
            success: true,
            data: newRating,
            message: 'Rating and comment added successfully.'
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'You have already submitted a rating for this product.',
                error: 'Duplicate rating'
            });
        }
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed.',
                errors: messages
            });
        }
        
        console.error("Rating creation error:", error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred while creating rating.'
        });
    }
};

const listRatingsByProduct = async (req, res) => {
  const product_id = req.params.productId;

  let filter = { product_id, is_published: true };

  try {
    // Pagination extract
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // Fetch ratings with pagination & populate user details
    const [ratings, totalRecords] = await Promise.all([
      Rating.find(filter)
        .populate('user_id', 'name email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Rating.countDocuments(filter),
    ]);

    if (ratings.length === 0) {
      return res.status(404).json({
        success: true,
        data: [],
        message: 'No ratings found for this product.',
      });
    }

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
      message: 'Server error occurred while fetching ratings.',
    });
  }
};


const updatePublishStatus = async (req, res) => {
    const ratingId = req.params.ratingId;

    const { is_published } = req.body; 

    if (typeof is_published !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: 'Invalid value for is_published. Must be true or false.'
        });
    }
    
    try {
       
        const updatedRating = await Rating.findByIdAndUpdate(
            ratingId,
            { is_published },
            { new: true, runValidators: true } 
        );

        if (!updatedRating) {
            return res.status(404).json({
                success: false,
                message: 'Rating not found.'
            });
        }

        res.status(200).json({
            success: true,
            data: updatedRating,
            message: `Rating publish status updated to ${is_published}.`
        });

    } catch (error) {
        console.error("Update publish status error:", error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred while updating publish status.'
        });
    }
};

const listAllRatingsForAdmin = async (req, res) => {
  try {
    // Pagination extract
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 20,
      maxLimit: 50,
    });

    // Fetch ratings with pagination + populate
    const [allRatings, totalRecords] = await Promise.all([
      Rating.find({})
        .populate('user_id', 'name email')
        .populate('product_id', 'name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Rating.countDocuments({}),
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
      message: 'Server error occurred while fetching all ratings.',
    });
  }
};

module.exports = {
    createRating,
    listRatingsByProduct,
    listAllRatingsForAdmin,
    updatePublishStatus
};