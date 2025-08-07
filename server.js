// MB Asset Tagging - Production Backend Server
// Created by Sijilraj
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  unit: { type: String, required: true },
  role: { type: String, enum: ['admin', 'technician', 'mechanic', 'supervisor'], default: 'technician' },
  firstLogin: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Asset Schema
const AssetSchema = new mongoose.Schema({
  assetNumber: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  assetGroup: { type: String, required: true },
  safetyCriticality: { type: String, default: 'Non Critical' },
  operationalCriticality: { type: String, default: 'Non Critical' },
  iadcCode: { type: String },
  mainParent: { type: String },
  make: { type: String },
  model: { type: String },
  serialNumber: { type: String },
  rfidCode: { type: String },
  rfidTagNumber: { type: String },
  remarks: { type: String },
  unit: { type: String, required: true },
  location: { type: String },
  status: { type: String, default: 'Active' },
  photos: {
    A: { type: String, default: null },
    B: { type: String, default: null },
    C: { type: String, default: null },
    D: { type: String, default: null }
  },
  isComplete: { type: Boolean, default: false },
  assignedTo: { type: String },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Asset = mongoose.model('Asset', AssetSchema);

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'MB Asset Tagging API - Production',
    timestamp: new Date().toISOString(),
    designer: 'Sijilraj'
  });
});

// Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, isActive: true });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        username: user.username,
        name: user.name,
        unit: user.unit,
        role: user.role,
        firstLogin: user.firstLogin
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Change Password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.user.userId);
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.firstLogin = false;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Assets
app.get('/api/assets', authenticateToken, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      // Get user's unit from database
      const user = await User.findById(req.user.userId);
      query.unit = user.unit;
    }
    
    const assets = await Asset.find(query).sort({ createdAt: -1 });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Asset
app.put('/api/assets/:id', authenticateToken, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    Object.assign(asset, req.body);
    asset.lastUpdated = new Date();
    asset.assignedTo = req.user.username;
    
    await asset.save();
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload Photo (Simplified for now)
app.post('/api/assets/:id/photos/:photoType', authenticateToken, async (req, res) => {
  try {
    const { id, photoType } = req.params;
    const asset = await Asset.findById(id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // For now, simulate photo upload
    const photoUrl = `https://drive.google.com/mock/${asset.assetNumber}_${photoType}.jpg`;
    
    asset.photos[photoType] = photoUrl;
    asset.lastUpdated = new Date();
    asset.assignedTo = req.user.username;
    
    // Check completion
    const allPhotos = Object.values(asset.photos);
    asset.isComplete = allPhotos.every(photo => photo !== null);
    
    await asset.save();
    
    res.json({
      message: 'Photo uploaded successfully',
      photoUrl: photoUrl,
      isComplete: asset.isComplete
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Import Assets
app.post('/api/assets/import', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { assets: importedAssets } = req.body;
    let newCount = 0;
    let updateCount = 0;

    for (const assetData of importedAssets) {
      const existing = await Asset.findOne({ assetNumber: assetData.assetNumber });
      
      if (existing) {
        Object.assign(existing, assetData);
        existing.lastUpdated = new Date();
        await existing.save();
        updateCount++;
      } else {
        const newAsset = new Asset(assetData);
        await newAsset.save();
        newCount++;
      }
    }

    res.json({ newCount, updateCount, totalProcessed: importedAssets.length });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Statistics
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const totalAssets = await Asset.countDocuments();
    const completedAssets = await Asset.countDocuments({ isComplete: true });
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    
    const unitStats = await Asset.aggregate([
      {
        $group: {
          _id: '$unit',
          total: { $sum: 1 },
          completed: { $sum: { $cond: ['$isComplete', 1, 0] } }
        }
      },
      {
        $project: {
          unit: '$_id',
          total: 1,
          completed: 1,
          percentage: { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }
        }
      }
    ]);

    res.json({
      totalAssets,
      completedAssets,
      totalUsers,
      completionPercentage: Math.round((completedAssets / totalAssets) * 100) || 0,
      unitStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Initialize default admin
const initializeAdmin = async () => {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await new User({
        username: 'admin',
        password: hashedPassword,
        name: 'Sijilraj - System Administrator',
        unit: 'ALL',
        role: 'admin',
        firstLogin: true
      }).save();
      console.log('✅ Default admin created');
    }
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  }
};

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 MB Asset Tagging API running on port ${PORT}`);
  console.log(`🎨 Designed by Sijilraj`);
  await initializeAdmin();
});

module.exports = app;
