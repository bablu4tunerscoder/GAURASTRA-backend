const LeadModel = require('../Models/leadModel');
const UserCoupon = require('../Models/couponModelUser'); 

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
   const existingLead = await LeadModel.findOne({ mobile }).lean();

    if (existingLead) {
      /* ---- Step 2: Check existing active coupon ---- */
      const existingCoupon = await UserCoupon.findOne({
        mobileNumber: mobile,
        status: "Active",
        expiresAt: { $gt: new Date() },
      }).lean();

      if (existingCoupon) {
        return res.status(200).json({
          success: true,
          message: "Coupon already generated",
          couponCode: existingCoupon.code,
          expiresAt: existingCoupon.expiresAt,
        });
      }
    }


  
    const cleanName = name.trim().replace(/[^a-zA-Z]/g, "").toUpperCase() || "GAURASTRA";
    
    const couponCode = `${cleanName}100`;


    const createAt = new Date();

    let expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);


  await LeadModel.create({
      name: name.trim(),
      mobile,
      couponCode,
      couponExpiresAt: expiresAt,
      used: false,
    });

  
    await UserCoupon.create({
      mobileNumber: mobile,
      name: name.trim(),
      code: couponCode,
      discountType: "flat",
      discountValue: 100,
      minCartAmount: 400,
      status: "Active",
      expiresAt,
    });

    
    res.status(201).json({
      success: true,
      couponCode,
      createdAt: moment(createAt).format("DD/MM/YYYY hh:mm A"),
      createdAgo: moment(createAt).fromNow(),
      expiresAt: moment(expiresAt).format("DD/MM/YYYY hh:mm A"),
      expiresAgo: moment(expiresAt).fromNow(),
    });
  } catch (error) {
    console.error("Lead/Coupon creation error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getAllLeads = async (req, res) => {
  try {
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // Parallel DB calls
    const [leads, totalRecords] = await Promise.all([
      LeadModel.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      LeadModel.countDocuments(),
    ]);

    // Format data safely
    const formattedLeads = leads.map((lead) => ({
      ...lead,

      createdAtFormatted: moment(lead.createdAt).format(
        "DD/MM/YYYY hh:mm A"
      ),
      createdAgo: moment(lead.createdAt).fromNow(),

      couponExpiresAtFormatted: lead.couponExpiresAt
        ? moment(lead.couponExpiresAt).format("DD/MM/YYYY hh:mm A")
        : null,

      expiryAgo: lead.couponExpiresAt
        ? moment(lead.couponExpiresAt).fromNow()
        : null,
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


