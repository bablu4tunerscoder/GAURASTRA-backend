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
  couponExpiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  backendCreatedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  used: {
    type: Boolean,
    default: false, index: true,
  },
  claimedByUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
},
  {
    timestamps: true
  });

module.exports = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);