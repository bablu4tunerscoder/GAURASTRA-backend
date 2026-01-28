const express = require('express');
const router = express.Router();

const { 
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  createNotification
} = require('../Controllers/notificationsController');
const { authCheck } = require('../utilities/JWTAuth');




router.get('/my-notifications', authCheck, getMyNotifications);
router.post('/create', authCheck, createNotification);
router.put('/mark-as-read/:notification_id', authCheck, markNotificationAsRead);
router.put('/mark-all-as-read', authCheck, markAllNotificationsAsRead);
router.delete('/clear-all-notifications',authCheck, clearAllNotifications);



module.exports = router;