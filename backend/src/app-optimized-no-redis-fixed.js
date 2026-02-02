/**
 * SwarmOracle Backend - Fixed Railway Database Connection
 * Enhanced version with connection retry and proper health checks
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const { createPrismaClient, testDatabaseConnection, createHealthEndpoint } = require('./database-fix');

// Import routes
const agentRoutes = require('./routes/agents');
const questionRoutes = require('./routes/questions');
const answerRoutes = require('./routes/answers');

const app = express();
const server = http.createServer(app);

// Enhanced database connection
const prisma = createPrismaClient();

// Performance and security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(compression({ threshold: 1024, level: 6 }));

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? [
            'https://swarmoracle.ai', 
            'https://www.swarmoracle.ai', 
            'https://swarm-oracle.vercel.app',
            'https://ai-swarm-dashboard-production.up.railway.app'
        ]
        : true,
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced health check that actually tests the database
createHealthEndpoint(app, prisma);

// Root endpoint for basic connectivity test
app.get('/', (req, res) => {
    res.json({
        service: 'SwarmOracle Backend',
        status: 'running',
        version: '2.0.0-fixed',
        endpoints: {
            health: '/health',
            agents: '/api/agents',
            questions: '/api/questions', 
            answers: '/api/answers'
        }
    });
});

// API Routes with error handling
app.use('/api/agents', agentRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Not found', 
        path: req.path,
        availableEndpoints: ['/', '/health', '/api/agents', '/api/questions', '/api/answers']
    });
});

// Global error handling
app.use((error, req, res, next) => {
    console.error('Global Error:', error.message);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        timestamp: new Date().toISOString()
    });
});

// Enhanced server startup with database connection retry
const PORT = process.env.PORT || 8080;

server.listen(PORT, async () => {
    console.log(`🔮 SwarmOracle API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Root: http://localhost:${PORT}/`);

    // Test database connection with retry logic
    const dbConnected = await testDatabaseConnection(prisma);
    
    if (dbConnected) {
        console.log('✅ SwarmOracle ready - Database connected successfully');
    } else {
        console.error('❌ SwarmOracle starting in degraded mode - Database connection failed');
        console.error('   Check DATABASE_URL environment variable');
        console.error('   Current DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'NOT SET');
        
        // Don't exit - let the service run in degraded mode
        // process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    server.close();
    await prisma.$disconnect();
    process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't crash the process, just log it
});

module.exports = { app, server, prisma };