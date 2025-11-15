const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ['public', 'police', 'owner'], default: 'public' },
  },
  { timestamps: true }
);

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicleNumber: { type: String, required: true },
    violationType: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['Pending Review', 'Approved', 'Rejected'], default: 'Pending Review' },
    mediaFiles: [{ type: String }],
    location: {
      lat: Number,
      lng: Number,
      address: String,
    },
  },
  { timestamps: true }
);

const fineSchema = new mongoose.Schema(
  {
    report: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
    vehicleNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
    paymentMethod: { type: String },
  },
  { timestamps: true }
);

module.exports = {
  User: mongoose.model('User', userSchema),
  Otp: mongoose.model('Otp', otpSchema),
  Report: mongoose.model('Report', reportSchema),
  Fine: mongoose.model('Fine', fineSchema),
};
