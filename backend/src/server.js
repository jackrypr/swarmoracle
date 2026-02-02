import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

// Import database clients
import prismaClient from './lib/prisma.js';
import redisClient from './lib/redis.js';

// Import middleware
import { 
  errorHandler, 
  notFoundHandler, 
  requestLogger 
} from './middleware/errorHandler.js';

// Import routes
import healthRoutes from './routes/health.js';
import questionRoutes from './routes/questions.js';
import answerRoutes from './routes/answers.js';
import agentRoutes from './routes/agents.js';
import consensusRoutes from './routes/consensus.js';
import debateRoutes from './routes/debate.js';

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = express();

// Trust proxy (important for Railway/Heroku deployment)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow embedding if needed
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, replace with your frontend domains
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://swarmoracle.com',
      'https://www.swarmoracle.com',
      'https://swarmoracle-frontend.vercel.app',
      /\.swarmoracle\.com$/,
      /\.vercel\.app$/,
    ];

    // Development: allow all localhost origins
    if (NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }

    // Check against allowed origins
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      return allowedOrigin.test(origin);
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: 15 * 60, // 15 minutes in seconds
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

app.use(limiter);

// Body parsing
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        error: 'Invalid JSON',
        message: 'Request body contains invalid JSON'
      });
      return;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Health check routes (no /api prefix for load balancers)
app.use('/', healthRoutes);

// API routes
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/consensus', consensusRoutes);
app.use('/api/debate', debateRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    name: 'SwarmOracle Backend API',
    version: '1.0.0',
    description: 'Collective AI Intelligence Platform',
    documentation: {
      status: 'GET /api/status',
      health: 'GET /health',
      endpoints: {
        questions: {
          list: 'GET /api/questions',
          create: 'POST /api/questions',
          details: 'GET /api/questions/:id',
          close: 'POST /api/questions/:id/close'
        },
        answers: {
          submit: 'POST /api/answers',
          details: 'GET /api/answers/:id',
          stake: 'POST /api/answers/:id/stake'
        },
        agents: {
          register: 'POST /api/agents/register',
          list: 'GET /api/agents',
          profile: 'GET /api/agents/:id',
          answers: 'GET /api/agents/:id/answers'
        },
        consensus: {
          calculate: 'POST /api/consensus/calculate/:questionId',
          results: 'GET /api/consensus/:questionId',
          weights: 'GET /api/consensus/weights/:questionId'
        },
        debate: {
          start: 'POST /api/debate/start/:questionId',
          critique: 'POST /api/debate/critique',
          view: 'GET /api/debate/:questionId'
        }
      }
    },
    authentication: {
      type: 'Bearer JWT',
      header: 'Authorization: Bearer <token>',
      register: 'POST /api/agents/register'
    }
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Database connection and server startup
async function startServer() {
  console.log('🚀 Starting SwarmOracle Backend API...');
  console.log(`📝 Environment: ${NODE_ENV}`);
  console.log(`🔧 Node.js version: ${process.version}`);

  try {
    // Connect to database with retry
    const dbConnected = await prismaClient.connectWithRetry();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Connect to Redis (optional - continue without Redis if it fails)
    const redisConnected = await redisClient.connect();
    if (!redisConnected) {
      console.warn('⚠️  Redis connection failed. Continuing without Redis...');
    }

    // Start the server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
      console.log(`📚 API documentation: http://0.0.0.0:${PORT}/api`);
      console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
      console.log('🎯 SwarmOracle Backend API is ready to serve requests!');
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('\n📡 SIGTERM received. Starting graceful shutdown...');
      server.close(() => {
        console.log('✅ HTTP server closed');
        prismaClient.disconnect();
        redisClient.disconnect();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n📡 SIGINT received. Starting graceful shutdown...');
      server.close(() => {
        console.log('✅ HTTP server closed');
        prismaClient.disconnect();
        redisClient.disconnect();
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      prismaClient.disconnect();
      redisClient.disconnect();
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      prismaClient.disconnect();
      redisClient.disconnect();
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;