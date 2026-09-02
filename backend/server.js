require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const assessmentRoutes = require('./routes/assessment');
const adminRoutes = require('./routes/admin');
const { seedSuperAdmin } = require('./models/Admin');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// ─── Serverless-safe MongoDB connection ───────────────────────────────────────
// Cache the connection promise so cold starts reuse the same connection.
let connectionPromise = null;

function connectDB() {
  if (mongoose.connection.readyState === 1) {
    // Already connected (warm lambda)
    return Promise.resolve();
  }
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI)
      .then(async () => {
        console.log('MongoDB connected');
        await seedSuperAdmin();
      })
      .catch((err) => {
        connectionPromise = null; // allow retry on next request
        console.error('MongoDB connection error:', err);
        throw err;
      });
  }
  return connectionPromise;
}

// Middleware: ensure DB is connected before every request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ error: 'Database unavailable. Please try again.' });
  }
});

app.use('/api/assessment', assessmentRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  // Local dev: connect once then start server
  connectDB()
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch(console.error);
}

module.exports = app;
