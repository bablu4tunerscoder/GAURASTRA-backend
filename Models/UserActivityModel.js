const mongoose = require('mongoose');
 
const activitySchema = new mongoose.Schema({
  actionType: { type: String, required: true, index:true },
  pageVisited: String,
  timeSpent: Number,
  productId: String,
  productName: String,
  price: Number,
  quantity: Number,
  location: Object,
  timestamp: { type: Date, default: Date.now,index:-1 }
});
 
const userActivitySchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index:true },
  userId: { type: String, default: null , index:true},
  activities: [activitySchema]
});
 
module.exports = mongoose.model('UserActivity', userActivitySchema);
 
 