import express from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'redis';
import { logHealthCheck } from '../lib/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Redis client
let redisClient;
try {
  redisClient = Redis.createClient({
    url: process.env.REDIS_URL
  });
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  await redisClient.connect();
} catch (error) {
  console.log('Redis not available:', error.message);
}

// Health check endpoint
router.get('/', async (req, res) => {
  const startTime = Date.now();
  const checks = {
    database: false,
    redis: false,
    server: true
  };
  
  let status = 'healthy';
  const result = {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: checks
  };

  try {
    // Database health check
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      checks.database = false;
      status = 'unhealthy';
    }

    // Redis health check (if available)
    if (redisClient) {
      try {
        await redisClient.ping();
        checks.redis = true;
      } catch (error) {
        checks.redis = false;
        // Redis is optional, don't mark as unhealthy
      }
    } else {
      checks.redis = false; // Not configured
    }

    // Memory check
    const memUsage = process.memoryUsage();
    const memUsageFormatted = {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
    };

    result.memory = memUsageFormatted;
    result.status = status;
    result.services = checks;
    result.responseTime = `${Date.now() - startTime}ms`;

    // Log health check
    logHealthCheck(status, checks);

    // Return appropriate status code
    const httpStatus = status === 'healthy' ? 200 : 503;
    res.status(httpStatus).json(result);

  } catch (error) {
    // If there's an error in the health check itself
    result.status = 'unhealthy';
    result.error = error.message;
    result.responseTime = `${Date.now() - startTime}ms`;
    
    logHealthCheck('unhealthy', { ...checks, healthCheckError: true });
    
    res.status(503).json(result);
  }
});

// Readiness check (for Kubernetes-style deployments)
router.get('/ready', async (req, res) => {
  try {
    // Check if essential services are ready
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness check (for Kubernetes-style deployments)
router.get('/live', (req, res) => {
  // Simple check that the process is running
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

export default router;