const express = require('express');
const router = express.Router();

const { 
    createRating,
    listRatingsByProduct,
    listAllRatingsForAdmin,
    updatePublishStatus
} = require('../Controllers/ratingCommentController');
const { authCheck, permissionCheck } = require("../utilities/JWTAuth");

router.post('/add',authCheck, createRating);
router.get('/:productId/ratings',authCheck, listRatingsByProduct); 

router.get('/', authCheck, permissionCheck('ratings'), listAllRatingsForAdmin);
router.patch('/update/:ratingId/', authCheck , updatePublishStatus);


module.exports = router;