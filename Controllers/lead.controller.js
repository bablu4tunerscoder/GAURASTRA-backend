const Lead = require('../Models/lead.model');
const Coupon = require('../Models/couponModelUser'); 
const { v4: uuidv4 } = require('uuid');
const moment = require('moment'); 
const { pagination_ } = require('../Utils/pagination_');


exports.subscribeLead = async (req, res) => {
  try {
    const { name, mobile } = req.body;

    /* ----------------- Validation ----------------- */
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "A valid name is required." });
    }

    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
      return res
        .status(400)
        .json({ message: "A valid 10-digit mobile number is required." });
    }

    /* ----------- Check existing lead ----------- */
    const existingLead = await Lead.findOne({ mobile });

    console.log("existingLead",existingLead);

    if (existingLead) {
      const coupon = await Coupon.findOne({
        mobileNumber: existingLead.mobile,
        status: "Active",
        expiresAt: { $gt: new Date() },
      });


      console.log("coupon",coupon);

      if (coupon) {
        return res.status(200).json({
          success: true,
          message: "Coupon already generated",
          couponCode: existingLead.couponCode,
        });
      }
    }

    const cleanName = name.trim().replace(/[^a-zA-Z]/g, "").toUpperCase() || "GAURASTRA";
    
    const couponCode = `${cleanName}100`;

    const backendCreatedAt = new Date();
    const expiryDate = new Date(backendCreatedAt);
    expiryDate.setDate(expiryDate.getDate() + 90);

  
    await Coupon.create({
      mobileNumber: mobile,
      name: name.trim(),
      code: couponCode,
      discountType: "flat",
      discountValue: 100,
      minCartAmount: 400,
      expiresAt: expiryDate,
      status: "Active",
      backendCreatedAt,
    });

    await Lead.create({
      name: name.trim(),
      mobile,
      couponCode,
      couponExpiresAt: expiryDate,
      backendCreatedAt,
    });

    res.status(201).json({
      success: true,
      couponCode,
      createdAt: moment(backendCreatedAt).format("DD/MM/YYYY hh:mm A"),
      createdAgo: moment(backendCreatedAt).fromNow(),
      expiresAt: moment(expiryDate).format("DD/MM/YYYY hh:mm A"),
      expiresAgo: moment(expiryDate).fromNow(),
    });
  } catch (error) {
    console.error("Lead/Coupon creation error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getAllLeads = async (req, res) => {
  try {
    // Pagination extract
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // Parallel DB calls
    const [leads, totalRecords] = await Promise.all([
      Lead.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Lead.countDocuments(),
    ]);

    // Format timestamps
    const formattedLeads = leads.map((lead) => ({
      ...lead,
      formattedCreatedAt: moment(lead.backendCreatedAt).format(
        "DD/MM/YYYY hh:mm A"
      ),
      formattedExpiry: lead.couponCode
        ? moment(lead.expiresAt).format("DD/MM/YYYY hh:mm A")
        : null,
      expiryAgo: lead.couponCode ? moment(lead.expiresAt).fromNow() : null,
    }));

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    res.status(200).json({
      success: true,

      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },

      data: formattedLeads,
    });
  } catch (error) {
    console.error("Error getting all leads:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

