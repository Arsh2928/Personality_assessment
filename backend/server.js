require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const assessmentRoutes = require('./routes/assessment');
const adminRoutes = require('./routes/admin');
const { seedSuperAdmin } = require('./models/Admin');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/assessment', assessmentRoutes);
app.use('/api/admin', adminRoutes);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await seedSuperAdmin();
  })
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
