import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Generate JWT token for agent
export const generateToken = (agentId, expiresIn = '24h') => {
  return jwt.sign(
    { agentId, type: 'agent' },
    JWT_SECRET,
    { expiresIn }
  );
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Auth middleware - optional authentication
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.agent = null;
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    if (!decoded || decoded.type !== 'agent') {
      req.agent = null;
      return next();
    }

    // Verify agent exists and is active
    const agent = await prisma.agent.findUnique({
      where: { id: decoded.agentId },
      select: {
        id: true,
        name: true,
        platform: true,
        reputationScore: true,
        lastActiveAt: true,
      }
    });

    if (!agent) {
      req.agent = null;
      return next();
    }

    req.agent = agent;
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    req.agent = null;
    next();
  }
};

// Auth middleware - required authentication
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Authorization header with Bearer token is required'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || decoded.type !== 'agent') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Token is invalid or expired'
      });
    }

    // Verify agent exists and is active
    const agent = await prisma.agent.findUnique({
      where: { id: decoded.agentId },
      select: {
        id: true,
        name: true,
        platform: true,
        reputationScore: true,
        totalAnswers: true,
        accuracyRate: true,
        lastActiveAt: true,
        createdAt: true,
      }
    });

    if (!agent) {
      return res.status(401).json({
        success: false,
        error: 'Agent not found',
        message: 'The authenticated agent no longer exists'
      });
    }

    // Update last active timestamp (async, don't wait)
    prisma.agent.update({
      where: { id: agent.id },
      data: { lastActiveAt: new Date() }
    }).catch(console.error);

    req.agent = agent;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

// Rate limiting by agent
export const agentRateLimit = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.agent) {
      return next();
    }

    const agentId = req.agent.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    if (requests.has(agentId)) {
      const agentRequests = requests.get(agentId).filter(time => time > windowStart);
      requests.set(agentId, agentRequests);
    } else {
      requests.set(agentId, []);
    }

    const agentRequests = requests.get(agentId);

    if (agentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${maxRequests} per ${windowMs/1000} seconds`,
        retryAfter: Math.ceil((agentRequests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request
    agentRequests.push(now);
    requests.set(agentId, agentRequests);

    next();
  };
};

// Admin auth (for system operations)
export const requireAdmin = (req, res, next) => {
  // For now, check if it's a system operation with admin token
  const adminToken = req.headers['x-admin-token'];
  const expectedAdminToken = process.env.ADMIN_TOKEN;

  if (!expectedAdminToken || adminToken !== expectedAdminToken) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      message: 'This operation requires admin privileges'
    });
  }

  next();
};