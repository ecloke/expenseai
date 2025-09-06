import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Import routes
import authRoutes from './routes/auth.js';
import botRoutes from './routes/bot.js';
import userRoutes from './routes/user.js';
import analyticsRoutes from './routes/analytics.js';
import healthRoutes from './routes/health.js';
import projectRoutes from './routes/projects.js';
import categoriesRoutes from './routes/categories.js';
import webhookRoutes from './routes/webhook.js';
import fortuneRoutes from './routes/fortune.js';

// Import services
import BotManager from './services/BotManager.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(helmet());

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL, 
      'http://localhost:3000',
      'https://wodebi.netlify.app'
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Only log actual CORS blocks (rare)
    console.log(`🚫 CORS BLOCKED: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Make services available to routes
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

// Store bot manager reference for routes
app.set('supabase', supabase);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/user', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/fortune', fortuneRoutes);

// Test endpoints for validation
app.use('/api/test', (req, res) => {
  res.json({ message: 'Test endpoints will be implemented during validation phase' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize Bot Manager
let botManager;

async function startServer() {
  try {
    // Initialize bot manager
    botManager = new BotManager(supabase);
    await botManager.initialize();
    
    // Make bot manager available to routes
    app.set('botManager', botManager);
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🤖 Bot Manager initialized`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (botManager) {
    await botManager.shutdown();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (botManager) {
    await botManager.shutdown();
  }
  process.exit(0);
});

startServer();