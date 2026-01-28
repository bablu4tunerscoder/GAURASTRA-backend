const { pagination_ } = require("../utilities/pagination_");
const Notification = require("../Models/NotificationModel");


async function createNotificationHelper({
  user_id,
  type,
  title,
  message,
  image = null,
  meta = {},
}) {
  if (!user_id || !type || !title || !message) {
    throw new Error("Missing required notification fields");
  }

  const notification = await Notification.create({
    user_id,
    type,
    title,
    message,
    image,
    meta,
  });

  return notification;
}

const createNotification = async (req, res) => {

   const user_id = req.user.userid;


  try {
    const {
      type,
      title,
      message,
      image,
      meta,
    } = req.body;

    const notification = await createNotificationHelper({
      user_id,
      type,
      title,
      message,
      image,
      meta,
    });

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: notification,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create notification",
    });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const user_id = req.user.userid;

    const { page, limit, skip, hasPrevPage } = pagination_(req.query, {
      defaultLimit: 10,
      maxLimit: 30,
    });

    const filter = { user_id };

    const [notifications, totalRecords] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Notification.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const hasNextPage = page < totalPages;

    res.status(200).json({
      status: "1",
      message: "Notifications fetched successfully",
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasPrevPage,
        hasNextPage,
      },
      data: notifications,
    });
  } catch (err) {
    console.error("Get Notifications Error:", err);
    res.status(500).json({
      status: "0",
      message: "Error retrieving notifications",
      error: err.message,
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const user_id = req.user.userid;
    const { notification_id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notification_id, user_id },
      { is_read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        status: "0",
        message: "Notification not found",
      });
    }

    res.status(200).json({
      status: "1",
      message: "Notification marked as read",
      data: notification,
    });
  } catch (err) {
    console.error("Mark Read Error:", err);
    res.status(500).json({
      status: "0",
      message: "Error marking notification as read",
      error: err.message,
    });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const user_id = req.user.userid;

    await Notification.updateMany(
      { user_id, is_read: false },
      { is_read: true }
    );

    res.status(200).json({
      status: "1",
      message: "All notifications marked as read",
    });
  } catch (err) {
    console.error("Mark All Read Error:", err);
    res.status(500).json({
      status: "0",
      message: "Error marking all notifications as read",
      error: err.message,
    });
  }
};

const clearAllNotifications = async (req, res) => {
  try {
    const user_id = req.user.userid;

    await Notification.deleteMany({ user_id });

    res.status(200).json({
      status: "1",
      message: "All notifications cleared successfully",
    });
  } catch (err) {
    console.error("Clear All Notifications Error:", err);
    res.status(500).json({
      status: "0",
      message: "Error clearing notifications",
      error: err.message,
    });
  }
};


module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  createNotificationHelper,
  createNotification
}