# MB Asset Tagging - Backend API

🚀 Production backend server for MB Asset Tagging application - Petroleum Rig & Workover Units Management System.

**Designed by Sijilraj**

## Features

- 🔐 JWT Authentication & User Management
- 📊 Asset Management with Photo Upload
- 📁 Excel Import/Export Functionality
- 🌐 MongoDB Database Integration
- 📱 Mobile-optimized API Endpoints
- ☁️ Google Drive Integration (Coming Soon)
- 🔄 Real-time Progress Tracking

## Technologies

- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas
- **Authentication:** JWT + bcrypt
- **File Handling:** Multer
- **Environment:** Production-ready with Docker

## Installation

1. Clone repository
2. Install dependencies: `npm install`
3. Set environment variables (see .env.example)
4. Start server: `npm start`

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/login` - User authentication
- `GET /api/assets` - Get assets (filtered by user unit)
- `PUT /api/assets/:id` - Update asset
- `POST /api/assets/import` - Import assets from Excel
- `GET /api/stats` - Get completion statistics

## Production Deployment

This API is deployed on Railway with MongoDB Atlas database.

**Live API:** [Your Railway URL]

## Environment Variables

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://mbassettagging.app
