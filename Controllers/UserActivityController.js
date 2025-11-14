// controllers/userActivityController.js
const UserActivity = require("../Models/UserActivityModel");
 
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
 
    const activity = {
      actionType,
      pageVisited,
      timeSpent,
      productId,
      productName,
      price,
      quantity,
      location,
      timestamp: new Date()
    };
 
    const filter = {
      $or: [
        { sessionId },
        ...(userId ? [{ userId }] : [])
      ]
    };
 
    const updated = await UserActivity.findOneAndUpdate(
      filter,
      {
        $setOnInsert: { sessionId, userId },
        $push: { activities: activity }
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
    const activities = await UserActivity.find().sort({ timestamp: -1 });
    res.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ error: "Server error while fetching activities" });
  }
};
 
const getUserActivity = async (req, res) => {
  try {
    const { sessionId, userId } = req.query;
 
    if (!sessionId && !userId) {
      return res.status(400).json({ error: "Either sessionId or userId is required." });
    }
 
    const filter = sessionId ? { sessionId } : { userId };
 
    const userActivity = await UserActivity.findOne(filter);
 
    if (!userActivity) {
      return res.status(404).json({ message: "User activity not found." });
    }
 
    res.status(200).json({ message: "User activity fetched successfully", data: userActivity });
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
 
    const deleted = await UserActivity.findOneAndDelete({ sessionId });
 
    if (!deleted) {
      return res.status(404).json({ message: "No user activity found for this sessionId." });
    }
 
    res.status(200).json({ message: "User activity deleted successfully", data: deleted });
  } catch (error) {
    console.error("Error deleting user activity:", error);
    res.status(500).json({ error: "Server error while deleting user activity" });
  }
};

// DELETE /api/activities/clear
const clearAllActivities = async (req, res) => {
  try {
    await UserActivity.deleteMany({});
    res.status(200).json({ message: "All user activities have been cleared." });
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
 
 