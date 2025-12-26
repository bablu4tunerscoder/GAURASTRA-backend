const mongoose = require('mongoose');

const ratingAndCommentSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',       
        required: [true, 'User ID is required for the rating.']
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',     
        required: [true, 'Product ID is required for the rating.']
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',      
        required: false     
    },

    rating_value: {
        type: Number,
        min: [1, 'Rating must be at least 1.0'],
        max: [5, 'Rating cannot be more than 5.0'],
        required: [true, 'Rating value is required.']
    },
    
    comment_text: {
        type: String,
        trim: true,
        maxlength: [500, 'Comment cannot be more than 500 characters.'],
        default: null
    },

    is_published: {
        type: Boolean,
        default: true
    }
}, 
{
    timestamps: true
});

ratingAndCommentSchema.index({ user_id: 1, product_id: 1 }, { unique: true });


module.exports = mongoose.model('Rating', ratingAndCommentSchema);