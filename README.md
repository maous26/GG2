# 🌍 GlobeGenius - AI-Powered Flight Deal Platform

GlobeGenius is an intelligent flight deal discovery platform that uses AI and machine learning to find the best travel opportunities for users. The platform offers both free and premium subscriptions with personalized flight alerts and comprehensive admin management tools.

## ✨ Features

### 🔍 Smart Flight Discovery
- Real-time flight scanning using FlightLabs API
- AI-powered route optimization
- Strategic tier-based scanning (3h, 6h, 12h intervals)
- Seasonal price analysis

### 👥 Multi-Tier User System
- **Free Users**: Basic flight alerts
- **Premium Users**: Advanced preferences, multiple airports, personalized recommendations
- **Enterprise/Admin**: Full system access and management

### 🎛️ Admin Dashboard
- Real-time statistics and monitoring
- User management and analytics
- Route performance tracking
- ML maturity assessment
- API usage monitoring

### 🤖 AI Integration
- Machine learning maturity scoring
- Automated anomaly detection
- Intelligent email personalization
- Predictive analytics for travel patterns

## 🚀 Technology Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** REST API
- **MongoDB** with Mongoose ODM
- **JWT** authentication
- **Bcrypt** password hashing
- **Node-cron** for scheduled tasks

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Responsive design**
- **Real-time dashboard updates**

### External Services
- **FlightLabs API** for flight data
- **Brevo (Sendinblue)** for email services
- **MongoDB Atlas** for cloud database

## 🏗️ Project Structure

```
globegenius/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth & validation
│   │   ├── cron/          # Scheduled tasks
│   │   └── utils/         # Helper functions
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/        # Page components
│   │   └── services/     # API integration
│   └── package.json
├── ml-service/            # Python ML service
└── docker-compose.yml     # Container orchestration
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v16+)
- MongoDB
- Python 3.9+ (for ML service)

### 1. Clone the Repository
```bash
git clone https://github.com/maous26/GG2.git
cd GG2
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure your environment variables
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 4. Database Setup
```bash
# Start MongoDB
./install-mongodb.sh
./start-dev-mongo.sh
```

## 🌐 Environment Configuration

Create a `.env` file in the backend directory:

```env
MONGODB_URI=mongodb://localhost:27017/globegenius
JWT_SECRET=your-jwt-secret-key
FLIGHTLABS_API_KEY=your-flightlabs-api-key
BREVO_API_KEY=your-brevo-api-key
```

## 🎯 Usage

### User Access
- **Landing Page**: `http://localhost:3000`
- **Premium Registration**: Available through the main interface
- **User Dashboard**: Accessible after login

### Admin Access
- **Admin Login**: `http://localhost:3000/admin-access`
- **Credentials**: Contact administrator
- **Features**: Complete system management and analytics

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/newsletter` - Newsletter signup

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user preferences
- `GET /api/users/stats` - User statistics

### Admin (Protected)
- `GET /api/admin/users` - List all users
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/routes` - Route management
- `GET /api/admin/ml-maturity` - ML maturity score

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Rate limiting
- Input validation and sanitization
- CORS protection

## 🚀 Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### Production Environment
- Configure production environment variables
- Set up MongoDB Atlas
- Configure email service (Brevo)
- Set up domain and SSL certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation in the `/docs` folder

---

**GlobeGenius** - Making travel accessible and intelligent for everyone! ✈️🌍
