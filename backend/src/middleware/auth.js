/**
 * Authentication Middleware
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Authenticate agent via API key
 */
async function authenticateAgent(req, res, next) {
  try {
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({ 
        success: false, 
        error: 'API key required',
        hint: 'Include Authorization: Bearer YOUR_API_KEY header'
      });
    }

    const apiKeyHash = hashApiKey(apiKey);
    const agent = await prisma.agent.findFirst({ 
      where: { apiKeyHash } 
    });

    if (!agent) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid API key' 
      });
    }

    // Attach agent to request
    req.agent = agent;
    
    // Update last active
    await prisma.agent.update({
      where: { id: agent.id },
      data: { lastActiveAt: new Date() }
    });

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication failed' 
    });
  }
}

/**
 * Optional authentication - doesn't fail if no key
 */
async function optionalAuth(req, res, next) {
  try {
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    
    if (apiKey) {
      const apiKeyHash = hashApiKey(apiKey);
      const agent = await prisma.agent.findFirst({ 
        where: { apiKeyHash } 
      });
      if (agent) {
        req.agent = agent;
      }
    }

    next();
  } catch (error) {
    // Silently continue without auth
    next();
  }
}

module.exports = {
  authenticateAgent,
  optionalAuth,
  hashApiKey,
};
