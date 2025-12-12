// In Routes/lead.routes.js
const express = require('express');
const router = express.Router();
const { subscribeLead, getAllLeads } = require('../Controllers/lead.controller');



// router.post('/subscribe', subscribeLead);
router.post('/create', subscribeLead);
router.get('/', getAllLeads); 

module.exports = router;