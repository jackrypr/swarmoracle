/**
 * Authentication and Rate Limiting Middleware
 */

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Authenticate Agent via JWT
 */
const authenticateAgent = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.query.token;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication token required'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'swarm-oracle-secret');
        
        const agent = await prisma.agent.findUnique({
            where: { id: decoded.sub },
            select: {
                id: true,
                name: true,
                reputationScore: true,
                isActive: true,
                capabilities: true
            }
        });
        
        if (!agent || !agent.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or inactive agent'
            });
        }
        
        req.agent = agent;
        next();
        
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid authentication token'
        });
    }
};

/**
 * Rate limiting based on reputation
 */
const checkRateLimit = (req, res, next) => {
    const reputation = req.agent?.reputationScore || 0;
    
    // Higher reputation = higher rate limits
    let maxRequests = 10; // Base rate
    if (reputation > 80) maxRequests = 100;
    else if (reputation > 60) maxRequests = 50;
    else if (reputation > 40) maxRequests = 25;
    
    const limiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: maxRequests,
        message: {
            success: false,
            error: 'Rate limit exceeded',
            retryAfter: '1 minute'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
    
    limiter(req, res, next);
};

module.exports = {
    authenticateAgent,
    checkRateLimit
};