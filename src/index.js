const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const memoryRoutes = require('./routes/memoryRoutes');
const interactionRoutes = require('./routes/interactionRoutes');
const taskRoutes = require('./routes/taskRoutes');
const contextRoutes = require('./routes/contextRoutes');

const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();

const app = express();

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      // Allow requests with no origin (like mobile apps or file://)
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/demo', (req, res) => {
  const demoPath = path.join(__dirname, '..', 'public-demo.html');
  res.sendFile(demoPath);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/context', contextRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/assistant_app';

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;

