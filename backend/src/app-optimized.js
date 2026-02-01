/**
 * SwarmOracle Optimized Backend Application
 * High-performance collective intelligence platform
 * Target: 10,000+ concurrent agents with <2s consensus calculations
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

// Import optimized services
const ConsensusEngine = require('./services/consensus-engine');
const SwarmOracleWebSocketService = require('./services/websocket-service');

// Import routes
const agentRoutes = require('./routes/agents');
const questionRoutes = require('./routes/questions');
const answerRoutes = require('./routes/answers');
const optimizedConsensusRoutes = require('./routes/optimized-consensus');

const app = express();
const server = http.createServer(app);

// Database and cache connections
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    connectTimeout: 10000,
    commandTimeout: 5000
});

// Initialize optimized services
const consensusEngine = new ConsensusEngine();
const websocketService = new SwarmOracleWebSocketService(server);

// Performance and security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow WebSocket connections
    crossOriginEmbedderPolicy: false
}));

app.use(compression({
    threshold: 1024,
    level: 6
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://swarmoracle.ai', 'https://www.swarmoracle.ai']
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Agent-ID']
}));

// Request parsing with size limits
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
}));

// Request logging middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = duration > 1000 ? 'warn' : 'info';
        
        console[logLevel](`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
        
        // Track slow requests
        if (duration > 2000) {
            console.warn(`SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
        }
    });
    
    next();
});

// Health check endpoint (optimized)
app.get('/health', async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Parallel health checks
        const [dbHealth, redisHealth, consensusHealth] = await Promise.allSettled([
            prisma.$queryRaw`SELECT 1`,
            redis.ping(),
            consensusEngine.queue.getWaiting().then(jobs => ({ queueLength: jobs.length }))
        ]);
        
        const responseTime = Date.now() - startTime;
        
        const health = {
            status: 'healthy',
            service: 'swarm-oracle',
            version: '2.0.0-optimized',
            timestamp: new Date().toISOString(),
            responseTime: `${responseTime}ms`,
            components: {
                database: dbHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
                redis: redisHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
                consensus: consensusHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy'
            },
            metrics: {
                queueLength: consensusHealth.status === 'fulfilled' ? consensusHealth.value.queueLength : 'unknown',
                websocketConnections: websocketService.getConnectionStats().activeConnections
            }
        };
        
        const statusCode = Object.values(health.components).every(status => status === 'healthy') ? 200 : 503;
        res.status(statusCode).json(health);
        
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Performance metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
        const metrics = {
            consensus: {
                avgCalculationTime: consensusEngine.metrics.avgCalculationTime,
                totalCalculations: consensusEngine.metrics.totalCalculations,
                lastCalculationTime: consensusEngine.metrics.lastCalculationTime
            },
            websocket: websocketService.getConnectionStats(),
            queue: {
                waiting: await consensusEngine.queue.getWaiting().then(jobs => jobs.length),
                active: await consensusEngine.queue.getActive().then(jobs => jobs.length),
                completed: await consensusEngine.queue.getCompleted().then(jobs => jobs.length),
                failed: await consensusEngine.queue.getFailed().then(jobs => jobs.length)
            }
        };
        
        res.json({
            success: true,
            metrics,
            timestamp: new Date()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API Routes
app.use('/api/agents', agentRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/consensus', optimizedConsensusRoutes);

// Optimized leaderboard endpoint (cached)
app.get('/api/leaderboard', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const cacheKey = `leaderboard:global:${limit}`;
        
        // Try cache first
        const cached = await redis.get(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                agents: JSON.parse(cached),
                fromCache: true,
                lastUpdated: await redis.get(`${cacheKey}:timestamp`)
            });
        }
        
        // Use materialized view for performance
        const agents = await prisma.$queryRaw`
            SELECT * FROM agent_leaderboard 
            LIMIT ${limit}
        `;
        
        // Cache for 60 seconds
        await Promise.all([
            redis.setex(cacheKey, 60, JSON.stringify(agents)),
            redis.setex(`${cacheKey}:timestamp`, 60, new Date().toISOString())
        ]);
        
        res.json({ 
            success: true, 
            agents,
            fromCache: false,
            lastUpdated: new Date()
        });
        
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch leaderboard' 
        });
    }
});

// Event integration with WebSocket service
consensusEngine.on('consensus:calculated', (result) => {
    // Broadcast via WebSocket
    websocketService.broadcastConsensusReached(result.questionId, result.consensus);
    
    // Publish to Redis for other services
    redis.publish('swarm:events', JSON.stringify({
        type: 'consensus:calculated',
        questionId: result.questionId,
        data: result.consensus,
        timestamp: new Date()
    }));
});

consensusEngine.on('consensus:failed', (error) => {
    console.error('Consensus calculation failed:', error);
    
    // Could broadcast error to relevant subscribers
    redis.publish('swarm:events', JSON.stringify({
        type: 'consensus:failed',
        questionId: error.questionId,
        error: error.error,
        timestamp: new Date()
    }));
});

// Global error handling
app.use((error, req, res, next) => {
    console.error('Application Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date()
    });
    
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : error.message,
        timestamp: new Date()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        path: req.path,
        hint: 'Check the API documentation at /docs',
        timestamp: new Date()
    });
});

// Server startup
const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
    console.log(`🔮 SwarmOracle Optimized API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Metrics: http://localhost:${PORT}/metrics`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    
    try {
        // Initialize database connection
        await prisma.$connect();
        console.log('📊 Database connected successfully');
        
        // Test Redis connection
        await redis.ping();
        console.log('🔄 Redis cache connected successfully');
        
        // Refresh materialized views on startup
        await prisma.$executeRaw`REFRESH MATERIALIZED VIEW agent_leaderboard`;
        console.log('📈 Materialized views refreshed');
        
        console.log('✅ SwarmOracle initialization complete');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 SIGTERM received, shutting down gracefully...');
    
    try {
        // Close server
        server.close();
        
        // Close WebSocket service
        await websocketService.shutdown();
        
        // Disconnect from database
        await prisma.$disconnect();
        
        // Close Redis connection
        redis.disconnect();
        
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    console.log('🔄 SIGINT received, shutting down...');
    await process.emit('SIGTERM');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit in production, just log
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

module.exports = { app, server, prisma, redis, consensusEngine, websocketService };