const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const { User, Otp, Report, Fine } = require('./models');

const router = express.Router();

// Storage for uploads
const uploadDir = path.join(__dirname, 'uploads');
// Ensure uploads directory exists to avoid ENOENT errors
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// Abuse safeguard: simple rate limiter for OTP and report submission
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many OTP requests from this IP, please try again later.',
});

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many reports from this IP, please try again later.',
});

// Utility: generate 6-digit OTP
function generateOtp() {
  return ('' + Math.floor(100000 + Math.random() * 900000));
}

// TODO: integrate Postmark using POSTMARK_API_TOKEN from env without logging the token

// Public registration
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Name, email, and phone are required.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      // If user already exists, just return its id so the reporter can proceed
      return res.status(200).json({ message: 'User already exists', userId: existing._id });
    }

    const user = await User.create({ name, email, phone, role: 'public' });
    res.status(201).json({ message: 'Registered successfully', userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request OTP (email-based login)
router.post('/auth/request-otp', otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found. Please register first.' });

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.deleteMany({ email });
    await Otp.create({ email, code, expiresAt });

    // TODO: Send OTP via Postmark: keep token in env var POSTMARK_API_TOKEN

    res.json({ message: 'OTP generated and (simulated) email sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify OTP
router.post('/auth/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

    const record = await Otp.findOne({ email, code });
    if (!record) return res.status(400).json({ error: 'Invalid OTP' });
    if (record.expiresAt < new Date()) return res.status(400).json({ error: 'OTP expired' });

    await Otp.deleteMany({ email });

    // For simplicity, return a pseudo session token (do NOT use in production)
    const pseudoToken = crypto.randomBytes(16).toString('hex');
    res.json({ message: 'OTP verified', token: pseudoToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit violation report
router.post('/reports', reportLimiter, upload.array('mediaFiles', 5), async (req, res) => {
  try {
    const { reporterId, vehicleNumber, violationType, description, lat, lng, address } = req.body;
    if (!reporterId || !vehicleNumber || !violationType) {
      return res.status(400).json({ error: 'Reporter, vehicle number, and violation type are required.' });
    }

    const mediaFiles = (req.files || []).map((f) => `/uploads/${path.basename(f.path)}`);

    const report = await Report.create({
      reporter: reporterId,
      vehicleNumber,
      violationType,
      description,
      mediaFiles,
      location: {
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        address,
      },
    });

    res.status(201).json({ message: 'Report submitted', reportId: report._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Track reports by ID or vehicle number
router.get('/reports/search', async (req, res) => {
  try {
    const { reportId, vehicleNumber } = req.query;

    let reports;
    if (reportId) {
      reports = await Report.find({ _id: reportId });
    } else if (vehicleNumber) {
      reports = await Report.find({ vehicleNumber });
    } else {
      return res.status(400).json({ error: 'Provide reportId or vehicleNumber' });
    }

    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Police portal: list pending reports
router.get('/police/reports/pending', async (req, res) => {
  try {
    const reports = await Report.find({ status: 'Pending Review' }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Police: approve or reject report
router.post('/police/reports/:id/decision', async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, fineAmount } = req.body; // decision = 'Approve' | 'Reject'

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (decision === 'Approve') {
      report.status = 'Approved';
      await report.save();

      if (fineAmount) {
        await Fine.create({
          report: report._id,
          vehicleNumber: report.vehicleNumber,
          amount: fineAmount,
        });
      }

      // TODO: send email/SMS notification to owner on approval
      return res.json({ message: 'Report approved and fine (if any) created.' });
    } else if (decision === 'Reject') {
      report.status = 'Rejected';
      await report.save();
      return res.json({ message: 'Report rejected.' });
    }

    res.status(400).json({ error: 'Invalid decision' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Owner portal: view fines by vehicle number
router.get('/owner/fines', async (req, res) => {
  try {
    const { vehicleNumber } = req.query;
    if (!vehicleNumber) return res.status(400).json({ error: 'vehicleNumber is required' });

    const fines = await Fine.find({ vehicleNumber }).populate('report');
    res.json(fines);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Owner portal: simulated payment (no real gateway)
router.post('/owner/fines/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body; // e.g., 'UPI', 'NetBanking', 'Card'

    const fine = await Fine.findById(id);
    if (!fine) return res.status(404).json({ error: 'Fine not found' });

    fine.status = 'Paid';
    fine.paymentMethod = paymentMethod || 'UPI';
    await fine.save();

    res.json({ message: 'Payment simulated successfully', fine });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
