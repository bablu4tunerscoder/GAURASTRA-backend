// In Models/lead.model.js
const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
    match: [/^[0-9]{10}$/, 'Please fill a valid 10-digit mobile number'],
  },
  couponCode: {
    type: String,
    required: true,
    index: true,
  },
  used: { // ✅ 1. Added the 'used' field
    type: Boolean,
    default: false,index: true,
  },
   claimedByUser: { // ✅ ADD THIS FIELD
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
}, 
{ 
  timestamps: true // ✅ 2. Replaced manual createdAt with Mongoose's timestamps
});

module.exports = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);