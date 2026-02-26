# ARIA Intelligence Dashboard

**Enterprise-grade MongoDB Intelligence Backend with Advanced Analytics**

A production-ready Node.js + Express + MongoDB application demonstrating advanced database operations, real-time analytics, and professional full-stack development.

## Features

### Advanced MongoDB Operations
- **15+ Aggregation Operators**: `$group`, `$project`, `$sort`, `$limit`, `$match`, `$unwind`, `$addToSet`, `$sum`, `$avg`, `$min`, `$max`, `$ifNull`, `$round`, `$size`, `$filter`, `$switch`
- **Complex Data Structures**: Arrays of documents, embedded documents, document references
- **Real-time Analytics**: Intent frequency classification, session summaries, habit detection
- **CRUD Operations**: Complete Create, Read, Update, Delete for all collections

### Professional Dashboard
- **Modern UI**: Responsive design with dark theme
- **Real-time Updates**: Live data synchronization
- **Interactive Features**: Users, Memories, Intents, Habits, Tasks, Interactions
- **Analytics Visualization**: Advanced aggregation results with frequency classification

### Industry Standards
- **RESTful API Design**: Proper HTTP methods and status codes
- **Error Handling**: Comprehensive error management with stack traces
- **Security**: CORS configuration and input validation
- **Performance**: Optimized aggregation pipelines and indexing

## Quick Start

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/wowthrisha/mongo_db.git
   cd mongo_db
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and preferences
   ```

4. **Start the server**
   ```bash
   # Development mode (auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the dashboard**
   - **Main Dashboard**: http://localhost:5000/demo
   - **API Health**: http://localhost:5000/api/health
   - **Server Status**: http://localhost:5000/health

## API Endpoints

### Core Operations
- `GET /api/health` - Server health check
- `GET /api/dashboard` - Dashboard statistics
- `GET /api/unified` - Advanced aggregation with all features
- `GET /api/analytics/intent-summary` - Intent analytics with frequency classification

### CRUD Operations
- `GET|POST /api/users` - User management
- `GET|POST /api/memories` - Memory storage and retrieval
- `GET|POST /api/intents` - Intent tracking
- `GET|POST /api/habits` - Habit detection and management
- `GET|POST /api/tasks` - Task management
- `GET|POST /api/interactions` - Interaction logging

### Advanced Features
- `GET /api/context/:userId` - User context aggregation
- `GET /api/habits/detect` - Automatic habit detection
- `GET /api/analytics/*` - Advanced analytics endpoints

## MongoDB Operations Showcase

### Aggregation Pipeline Examples

#### Complex Intent Analytics
```javascript
[
  {
    $group: {
      _id: '$intent',
      totalCount: { $sum: '$count' },
      users: { $addToSet: '$userId' },
      avgConfidence: { $avg: '$confidence' },
      maxCount: { $max: '$count' },
      minCount: { $min: '$count' }
    }
  },
  {
    $project: {
      _id: 0,
      intent: '$_id',
      totalCount: 1,
      userCount: { $size: { $filter: { input: '$users', as: 'u', cond: { $ne: ['$$u', null] } } } },
      avgConfidence: { $round: ['$avgConfidence', 2] },
      frequency: {
        $switch: {
          branches: [
            { case: { $gte: ['$totalCount', 10] }, then: 'Very High' },
            { case: { $gte: ['$totalCount', 5] }, then: 'High' },
            { case: { $gte: ['$totalCount', 3] }, then: 'Medium' }
          ],
          default: 'Low'
        }
      }
    }
  },
  { $sort: { totalCount: -1 } },
  { $limit: 20 }
]
```

#### Session Analytics with Array Operations
```javascript
[
  { $match: { _id: ObjectId(userId) } },
  { $unwind: '$sessions' },
  {
    $group: {
      _id: { device: '$sessions.device', region: '$sessions.region' },
      count: { $sum: 1 },
      firstSeen: { $min: '$sessions.startedAt' },
      lastSeen: { $max: '$sessions.startedAt' },
      avgDuration: { $avg: { $ifNull: ['$sessions.duration', 0] } }
    }
  },
  { $sort: { count: -1 } },
  { $limit: 5 }
]
```

## Testing

### API Smoke Test
```bash
# Run comprehensive API tests
./api-smoke-test.sh
```

### Manual Testing
```bash
# Health checks
curl http://localhost:5000/health
curl http://localhost:5000/api/health

# Test unified aggregation
curl http://localhost:5000/api/unified | jq '.'

# Test analytics
curl http://localhost:5000/api/analytics/intent-summary | jq '.'
```

## Project Structure

```
mongo_db/
├── src/
│   └── index.js              # Main application with all routes and schemas
├── aria-dashboard.html       # Professional dashboard UI
├── server.js                 # Application entry point
├── package.json              # Dependencies and scripts
├── .env.example             # Environment configuration template
├── api-smoke-test.sh        # Comprehensive API testing script
├── RUN_GUIDE.md             # Quick start and troubleshooting
├── BOSS_PRESENTATION_GUIDE.md # Demo script for presentations
└── README.md                # This file
```

## Dashboard Features

### Main Sections
- **Users**: User management with embedded profiles
- **Memories**: Conversation history with entity extraction
- **Intents**: Intent tracking with frequency analysis
- **Habits**: Automatic habit detection and confidence scoring
- **Tasks**: Task management and status tracking
- **Interactions**: Interaction logging and analytics

### Advanced Analytics
- **Unified Output**: Comprehensive aggregation with all MongoDB operations
- **Intent Summary**: Frequency classification with advanced grouping
- **Session Analytics**: Device and region-based session analysis
- **Real-time Updates**: Live data synchronization

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-restart
- `npm test` - Run tests (when implemented)

### Environment Variables
```env
MONGO_URI=mongodb://127.0.0.1:27017/aria_intelligence
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=5000
```

## Performance Features

- **Optimized Aggregations**: Efficient MongoDB pipelines
- **Proper Indexing**: Strategic index placement for queries
- **Connection Pooling**: MongoDB connection management
- **Error Handling**: Comprehensive error management
- **Input Validation**: Request sanitization and validation

## Security Features

- **CORS Configuration**: Cross-origin resource sharing setup
- **Input Validation**: Request body validation
- **Error Sanitization**: Secure error responses
- **Environment Variables**: Secure configuration management

## Deployment Ready

This application is designed for production deployment with:
- **Modular Architecture**: Clean separation of concerns
- **Environment Configuration**: Flexible deployment settings
- **Error Handling**: Production-ready error management
- **Performance Optimization**: Efficient database operations
- **Security Best Practices**: Industry-standard security measures

## License

MIT License - feel free to use this project for learning and development.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with using Node.js, Express, MongoDB, and modern web technologies**

