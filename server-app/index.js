require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'web-client-public')));

// Routes
const apiRouter = require('./routes');

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Community Traffic Violation Reporting API running' });
});

app.use('/api', apiRouter);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/community_traffic_violation_db';

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });
