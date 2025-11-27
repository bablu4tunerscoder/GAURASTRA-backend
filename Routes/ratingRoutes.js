const express = require('express');
const router = express.Router();

const { 
    createRating,
    listRatingsByProduct,
    listAllRatingsForAdmin,
    updatePublishStatus
} = require('../Controllers/ratingCommentController');


router.post('/add', createRating);
router.get('/:productId/ratings', listRatingsByProduct); 

router.get('/', listAllRatingsForAdmin);
router.patch('/update/:ratingId/', updatePublishStatus);


module.exports = router;