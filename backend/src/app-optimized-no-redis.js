/**
 * SwarmOracle Backend - Redis Optional Version
 * Fallback for deployments without Redis
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

// Import routes
const agentRoutes = require('./routes/agents');
const questionRoutes = require('./routes/questions');
const answerRoutes = require('./routes/answers');

const app = express();
const server = http.createServer(app);

// Database connection only
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

// Performance and security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(compression({ threshold: 1024, level: 6 }));

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://swarmoracle.ai', 'https://www.swarmoracle.ai', 'https://swarm-oracle.vercel.app']
        : true,
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple health check (no Redis dependency)
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            status: 'healthy',
            service: 'swarm-oracle',
            version: '2.0.0-basic',
            timestamp: new Date().toISOString(),
            components: { database: 'healthy' }
        });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
    }
});

// API Routes (basic versions without consensus engine)
app.use('/api/agents', agentRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not found', path: req.path });
});

// Global error handling
app.use((error, req, res, next) => {
    console.error('Error:', error.message);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
});

// Server startup
const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
    console.log(`🔮 SwarmOracle API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);

    try {
        await prisma.$connect();
        console.log('📊 Database connected successfully');
        console.log('✅ SwarmOracle basic mode - no Redis/consensus engine');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    server.close();
    await prisma.$disconnect();
    process.exit(0);
});

module.exports = { app, server, prisma };
