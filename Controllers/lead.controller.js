const Lead = require('../Models/lead.model');
const Coupon = require('../Models/couponModel'); // main Coupon model
const { v4: uuidv4 } = require('uuid');
const moment = require('moment'); // for formatting timestamps

/**
 * @desc    Create a new lead and a functional coupon
 * @route   POST /api/leads/create
 */
exports.subscribeLead = async (req, res) => {
  try {
    const { name, mobile } = req.body;

    // --- 1. Validation ---
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'A valid name is required.' });
    }
    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({ message: 'A valid 10-digit mobile number is required.' });
    }

    // --- 2. Check if lead already exists ---
    const existingLead = await Lead.findOne({ mobile });
    if (existingLead) {
      return res.status(409).json({ 
        message: 'This mobile number is already registered.', 
        couponCode: existingLead.couponCode 
      });
    }

    // --- 3. Generate a unique coupon code ---
    const nameKey = name.trim().replace(/[^a-zA-Z]/g, '').toUpperCase() || 'GAURASTRA';
    let couponCode = `${nameKey}100`;

    // --- Backend timestamp for internal uniqueness ---
    const backendCreatedAt = new Date(); // full timestamp including date + time

    // --- Ensure coupon uniqueness in DB ---
    const existingCoupon = await Coupon.findOne({ code: couponCode });
    if (existingCoupon) {
      // Append a backend-only key using timestamp (does NOT affect frontend)
      couponCode = `${couponCode}-${backendCreatedAt.getTime()}`;
    }

    // --- 4. Calculate expiry date (90 days from registration) ---
    const expiryDate = new Date(backendCreatedAt);
    expiryDate.setDate(expiryDate.getDate() + 90);

    // --- 5. Create coupon in main system ---
    const newCoupon = new Coupon({
      coupon_id: uuidv4(),
      code: couponCode,         // NAME100 for frontend
      discountType: 'flat',
      discountValue: 100,
      minCartAmount: 400,
      expiresAt: expiryDate,
      usageLimit: 1,
      status: 'Active',
      applicableProducts: [],   // empty = all products
      backendCreatedAt          // store timestamp internally
    });
    await newCoupon.save();

    // --- 6. Create lead record ---
    const newLead = await Lead.create({ 
      name: name.trim(),
      mobile,
      couponCode,
      backendCreatedAt
    });

    // --- 7. Prepare formatted timestamps for admin panel ---
    const formattedCreatedAt = moment(backendCreatedAt).format('DD/MM/YYYY hh:mm A');
    const createdAgo = moment(backendCreatedAt).fromNow();
    const formattedExpiry = moment(expiryDate).format('DD/MM/YYYY hh:mm A');
    const expiryAgo = moment(expiryDate).fromNow();

    // --- 8. Send success response ---
    res.status(201).json({ 
      success: true, 
      couponCode: newLead.couponCode,
      createdAt: formattedCreatedAt,
      createdAgo,
      expiresAt: formattedExpiry,
      expiresAgo: expiryAgo
    });

  } catch (error) {
    console.error('Lead/Coupon creation error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @desc    Get all leads
 * @route   GET /api/leads
 */
exports.getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }).lean();

    // Format timestamps for each lead
    const formattedLeads = leads.map(lead => ({
      ...lead._doc,
      formattedCreatedAt: moment(lead.backendCreatedAt).format('DD/MM/YYYY hh:mm A'),
      createdAgo: moment(lead.backendCreatedAt).fromNow(),
      formattedExpiry: lead.couponCode ? moment(lead.expiresAt).format('DD/MM/YYYY hh:mm A') : null,
      expiryAgo: lead.couponCode ? moment(lead.expiresAt).fromNow() : null
    }));

    res.status(200).json({ success: true, data: formattedLeads });
  } catch (error) {
    console.error('Error getting all leads:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
