// controllers/userActivityController.js
const UserActivity = require("../Models/UserActivityModel");
const { pagination_ } = require("../Utils/pagination_");
 
// POST /api/activity


const logActivity = async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      actionType,
      pageVisited,
      timeSpent,
      productId,
      productName,
      price,
      quantity,
      location,
    } = req.body;

    if (!sessionId || !actionType) {
      return res.status(400).json({ error: "sessionId and actionType are required." });
    }

    // Build activity object according to schema
    const activity = {
      actionType,
      pageVisited,
      timeSpent,
      location,
      timestamp: new Date(),
    };

    // Add product to items array if productId exists
    if (productId) {
      activity.items = [
        {
          product_id: productId,
          productName,
          price,
          quantity,
        },
      ];
    }

    // Build filter
    const filter = userId
      ? { $or: [{ sessionId }, { user_id: userId }] }
      : { sessionId };

    const updated = await UserActivity.findOneAndUpdate(
      filter,
      {
        $setOnInsert: { sessionId, user_id: userId || null },
        $push: { activities: activity },
      },
      { new: true, upsert: true }
    );

    res.status(201).json({ message: "Activity logged successfully", data: updated });
  } catch (error) {
    console.error("Error logging activity:", error);
    res.status(500).json({ error: "Server error while logging activity" });
  }
};

 
// GET /api/activities
const getAllActivities = async (req, res) => {
  try {
    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 20,
      maxLimit: 30,
    });

    // Aggregate to unwind activities array for flat list
    const [activities, totalRecords] = await Promise.all([
      UserActivity.aggregate([
        { $unwind: "$activities" },
        { $sort: { "activities.timestamp": -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            sessionId: 1,
            user_id: 1,
            activity: "$activities",
          },
        },
      ]),
      UserActivity.aggregate([
        { $unwind: "$activities" },
        { $count: "total" },
      ]),
    ]);

    const totalCount = totalRecords[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;

    res.status(200).json({
      success: true,
      count: activities.length,
      pagination: {
        page,
        limit,
        totalRecords: totalCount,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },
      data: activities,
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching activities",
      error: error.message,
    });
  }
};


const getUserActivity = async (req, res) => {
  try {
    const { sessionId, userId } = req.query;

    if (!sessionId && !userId) {
      return res.status(400).json({ error: "Either sessionId or userId is required." });
    }

    // Build filter
    const filter = {};
    if (sessionId) filter.sessionId = sessionId;
    if (userId) filter.user_id = userId;

    // Fetch user activity
    const userActivity = await UserActivity.findOne(filter).lean();

    if (!userActivity) {
      return res.status(404).json({ message: "User activity not found." });
    }

    res.status(200).json({
      message: "User activity fetched successfully",
      data: userActivity.activities || [],
    });
  } catch (error) {
    console.error("Error fetching user activity:", error);
    res.status(500).json({ error: "Server error while fetching user activity" });
  }
};

 
const deleteUserActivityBySessionId = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required." });
    }

    const deleted = await UserActivity.findOneAndDelete({ sessionId }).lean();

    if (!deleted) {
      return res.status(404).json({ message: "No user activity found for this sessionId." });
    }

    res.status(200).json({
      message: "User activity deleted successfully",
      data: {
        sessionId: deleted.sessionId,
        user_id: deleted.user_id,
        activitiesDeleted: deleted.activities.length,
      },
    });
  } catch (error) {
    console.error("Error deleting user activity:", error);
    res.status(500).json({ error: "Server error while deleting user activity" });
  }
};


// DELETE /api/activities/clear
const clearAllActivities = async (req, res) => {
  try {
    const { confirm } = req.query;

    if (confirm !== "true") {
      return res.status(400).json({
        error: "This action will delete all activities. Add ?confirm=true to proceed.",
      });
    }

    const result = await UserActivity.deleteMany({});
    
    res.status(200).json({
      message: "All user activities have been cleared.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing activities:", error);
    res.status(500).json({ error: "Server error while clearing activities" });
  }
};


 
module.exports = {
  logActivity,
  getAllActivities,
  deleteUserActivityBySessionId,
  getUserActivity,
  clearAllActivities,
};
 
 