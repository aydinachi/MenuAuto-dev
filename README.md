# 🍽️ MenuAuto - Restaurant Management System

Modern web-based restaurant management system for waiters, cooks, and bartenders.

## 🚀 Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Set up database
npm run init-db

# Start development server
npm run dev
```

### Vercel Deployment

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy to Vercel**
```bash
vercel
```

4. **Set Environment Variables in Vercel Dashboard**
   - Go to your project in Vercel Dashboard
   - Navigate to Settings > Environment Variables
   - Add the following variables:
     ```
     DB_HOST=your-mysql-host
     DB_USER=your-mysql-user
     DB_PASSWORD=your-mysql-password
     DB_NAME=your-database-name
     DB_PORT=3306
     JWT_SECRET=your-jwt-secret
     SESSION_SECRET=your-session-secret
     NODE_ENV=production
     ```

5. **Redeploy with environment variables**
```bash
vercel --prod
```

## 📋 Features

- **Multi-role system**: Waiters, Cooks, Bartenders, Admin
- **Real-time ordering**: Socket.IO for instant updates
- **Order management**: Track status, add notes, cancel items
- **Reporting**: Daily reports, analytics, inventory tracking
- **Responsive design**: Works on all devices
- **Sound notifications**: Audio alerts for ready orders

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Real-time**: Socket.IO
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Authentication**: JWT, bcrypt
- **Deployment**: Vercel

## 📱 Usage

1. **Waiters**: Login and create orders for tables
2. **Cooks**: View food orders and mark as ready
3. **Bartenders**: View drink orders and mark as ready
4. **Admin**: View reports and manage inventory

## 🔧 Configuration

Copy `config.env.example` to `config.env` and update with your database credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=menuauto_db
DB_PORT=3306
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret
PORT=3001
NODE_ENV=development
```

## 📊 Database Setup

```bash
# Initialize database
npm run init-db

# Fix database structure (if needed)
npm run fix-db

# Create test data
npm run create-test-data
```

## 🚀 Production Deployment

The application is configured for Vercel deployment with:
- `vercel.json` configuration
- Environment variable support
- Static file serving
- API route handling

## 📞 Support

For issues and questions, please check the documentation or create an issue in the repository. 