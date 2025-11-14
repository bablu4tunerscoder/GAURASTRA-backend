// In Routes/lead.routes.js
const express = require('express');
const router = express.Router();
const { subscribeLead, getAllLeads } = require('../Controllers/lead.controller');

// You probably have an admin authentication middleware you can add to the GET route
// const { protect, admin } = require('../Middlewares/authMiddleware');

// router.post('/subscribe', subscribeLead);
router.post('/create', subscribeLead);
router.get('/', getAllLeads); // Add your admin middleware here, e.g., router.get('/', protect, admin, getAllLeads)

module.exports = router;