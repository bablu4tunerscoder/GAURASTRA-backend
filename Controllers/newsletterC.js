const Newsletter = require("../Models/newsletterM");
const { pagination_ } = require("../utilities/pagination_");


// ✅ Subscribe Newsletter (User side)
const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    // 🔹 Validation
    if (!email) {
      return res.status(400).json({
        status: "0",
        message: "Email is required",
      });
    }

    // 🔹 Check existing email
    const existing = await Newsletter.findOne({ email });

    if (existing) {
      // If already unsubscribed, re-subscribe
      if (existing.status === "unsubscribed") {
        existing.status = "subscribed";
        await existing.save();

        return res.status(200).json({
          status: "1",
          message: "Newsletter re-subscribed successfully",
          data: existing,
        });
      }

      return res.status(400).json({
        status: "0",
        message: "Email already subscribed",
      });
    }

    const newsletter = await Newsletter.create({
      email,
      status: "subscribed",
    });

    return res.status(201).json({
      status: "1",
      message: "Newsletter subscribed successfully",
      data: newsletter,
    });

  } catch (error) {
    console.error("Subscribe Newsletter Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};



// ✅ Get All Subscribers (Admin)
const getAllSubscribers = async (req, res) => {
  try {
    // 🔹 Pagination
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 20,
    });

    // 🔹 Filter by status (optional)
    const filter = req.query.status
      ? { status: req.query.status }
      : {};

    const [subscribers, totalRecords] = await Promise.all([
      Newsletter.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Newsletter.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    return res.status(200).json({
      status: "1",
      message: "Newsletter list fetched successfully",

      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },

      data: subscribers,
    });

  } catch (error) {
    console.error("Get Newsletter Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};



// ✅ Get Subscriber By ID (Admin)
const getSubscriberById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "0",
        message: "Subscriber ID is required",
      });
    }

    const subscriber = await Newsletter.findById(id).lean();

    if (!subscriber) {
      return res.status(404).json({
        status: "0",
        message: "Subscriber not found",
      });
    }

    return res.status(200).json({
      status: "1",
      message: "Subscriber fetched successfully",
      data: subscriber,
    });

  } catch (error) {
    console.error("Get Subscriber By ID Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};



// ✅ Update Newsletter Status (Admin)
const updateNewsletterStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["subscribed", "unsubscribed"].includes(status)) {
      return res.status(400).json({
        status: "0",
        message: "Invalid status value",
      });
    }

    const subscriber = await Newsletter.findById(id);

    if (!subscriber) {
      return res.status(404).json({
        status: "0",
        message: "Subscriber not found",
      });
    }

    subscriber.status = status;
    await subscriber.save();

    return res.status(200).json({
      status: "1",
      message: "Newsletter status updated successfully",
      data: subscriber,
    });

  } catch (error) {
    console.error("Update Newsletter Status Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};



// ✅ Delete Subscriber (Admin)
const deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;

    const subscriber = await Newsletter.findByIdAndDelete(id);

    if (!subscriber) {
      return res.status(404).json({
        status: "0",
        message: "Subscriber not found",
      });
    }

    return res.status(200).json({
      status: "1",
      message: "Subscriber deleted successfully",
    });

  } catch (error) {
    console.error("Delete Subscriber Error:", error);
    return res.status(500).json({
      status: "0",
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  subscribeNewsletter,
  getAllSubscribers,
  getSubscriberById,
  updateNewsletterStatus,
  deleteSubscriber,
};
