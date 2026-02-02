/**
 * Enhanced Database Connection with Railway Fix
 * Add this to app-optimized-no-redis.js if connection issues persist
 */

const { PrismaClient } = require('@prisma/client');

// Enhanced Prisma client with retry logic for Railway
const createPrismaClient = () => {
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds
    
    return new PrismaClient({
        log: ['error', 'warn'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        },
        // Railway-specific connection settings
        __internal: {
            engine: {
                // Increase connection timeout for Railway
                connectTimeout: 30000,
                pool: {
                    timeout: 30000,
                }
            }
        }
    });
};

// Connection test with retry logic
const testDatabaseConnection = async (prisma) => {
    for (let i = 0; i < 5; i++) {
        try {
            await prisma.$queryRaw`SELECT 1`;
            console.log('✅ Database connection successful');
            return true;
        } catch (error) {
            console.error(`❌ Database connection attempt ${i + 1} failed:`, error.message);
            
            if (i < 4) {
                console.log(`⏳ Retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    
    console.error('💥 Database connection failed after 5 attempts');
    return false;
};

// Enhanced health check that actually tests DB
const createHealthEndpoint = (app, prisma) => {
    app.get('/health', async (req, res) => {
        const healthData = {
            status: 'healthy',
            service: 'aiswarm-backend',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            components: {
                database: 'unknown',
                redis: 'disabled'
            }
        };
        
        try {
            // Actually test database connection
            await prisma.$queryRaw`SELECT 1 as test`;
            healthData.components.database = 'healthy';
            res.status(200).json(healthData);
        } catch (error) {
            console.error('Health check DB error:', error.message);
            healthData.status = 'degraded';
            healthData.components.database = 'unhealthy';
            healthData.error = error.message;
            res.status(503).json(healthData);
        }
    });
};

module.exports = { 
    createPrismaClient, 
    testDatabaseConnection, 
    createHealthEndpoint 
};