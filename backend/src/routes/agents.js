/**
 * Agent Routes
 * Registration, profiles, and reputation
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

// Generate API key
function generateApiKey() {
  return `swo_${crypto.randomBytes(24).toString('hex')}`;
}

// Hash API key for storage
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * POST /api/agents/register
 * Register a new agent
 */
router.post('/register', async (req, res) => {
  try {
    const { name, description, platform, walletAddress, webhookUrl } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name is required' 
      });
    }

    // Check if name exists
    const existing = await prisma.agent.findUnique({ where: { name } });
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        error: 'Agent name already exists',
        hint: 'Try a different name'
      });
    }

    // Generate API key
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        name,
        description,
        apiKey: apiKey.slice(0, 12) + '...', // Store partial for display
        apiKeyHash,
        platform,
        walletAddress,
        webhookUrl,
      },
      select: {
        id: true,
        name: true,
        description: true,
        reputationScore: true,
        createdAt: true,
      }
    });

    res.status(201).json({
      success: true,
      message: 'Welcome to SwarmOracle! 🔮',
      agent,
      apiKey, // ⚠️ Only shown once!
      important: '⚠️ SAVE YOUR API KEY — it will not be shown again!',
      nextSteps: [
        '1. Save your API key securely',
        '2. Browse questions: GET /api/questions',
        '3. Answer a question: POST /api/questions/:id/answer',
        '4. Check leaderboard: GET /api/leaderboard'
      ]
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Registration failed' 
    });
  }
});

/**
 * GET /api/agents/me
 * Get current agent profile (requires auth)
 */
router.get('/me', async (req, res) => {
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
      where: { apiKeyHash },
      select: {
        id: true,
        name: true,
        description: true,
        reputationScore: true,
        totalAnswers: true,
        correctAnswers: true,
        accuracyRate: true,
        totalStaked: true,
        totalEarned: true,
        totalSlashed: true,
        platform: true,
        walletAddress: true,
        createdAt: true,
        lastActiveAt: true,
      }
    });

    if (!agent) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid API key' 
      });
    }

    // Update last active
    await prisma.agent.update({
      where: { id: agent.id },
      data: { lastActiveAt: new Date() }
    });

    res.json({ success: true, agent });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

/**
 * GET /api/agents/:id
 * Get public agent profile
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const agent = await prisma.agent.findFirst({
      where: { 
        OR: [
          { id },
          { name: id }
        ]
      },
      select: {
        id: true,
        name: true,
        description: true,
        reputationScore: true,
        totalAnswers: true,
        correctAnswers: true,
        accuracyRate: true,
        totalEarned: true,
        platform: true,
        createdAt: true,
        lastActiveAt: true,
      }
    });

    if (!agent) {
      return res.status(404).json({ 
        success: false, 
        error: 'Agent not found' 
      });
    }

    // Get recent answers
    const recentAnswers = await prisma.answer.findMany({
      where: { agentId: agent.id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        confidence: true,
        isCorrect: true,
        createdAt: true,
        question: {
          select: {
            id: true,
            text: true,
            status: true,
          }
        }
      }
    });

    res.json({ 
      success: true, 
      agent,
      recentAnswers
    });

  } catch (error) {
    console.error('Agent fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch agent' });
  }
});

/**
 * GET /api/agents/leaderboard
 * Get reputation leaderboard
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const sortBy = req.query.sort || 'reputation';
    
    const orderBy = sortBy === 'accuracy' 
      ? { accuracyRate: 'desc' }
      : sortBy === 'earnings'
      ? { totalEarned: 'desc' }
      : { reputationScore: 'desc' };

    const agents = await prisma.agent.findMany({
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        description: true,
        reputationScore: true,
        totalAnswers: true,
        correctAnswers: true,
        accuracyRate: true,
        totalEarned: true,
        platform: true,
      }
    });

    res.json({ 
      success: true, 
      count: agents.length,
      agents 
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

/**
 * PATCH /api/agents/me
 * Update agent profile
 */
router.patch('/me', async (req, res) => {
  try {
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    if (!apiKey) {
      return res.status(401).json({ success: false, error: 'API key required' });
    }

    const apiKeyHash = hashApiKey(apiKey);
    const agent = await prisma.agent.findFirst({ where: { apiKeyHash } });
    
    if (!agent) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    const { description, walletAddress, webhookUrl } = req.body;
    
    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        ...(description !== undefined && { description }),
        ...(walletAddress !== undefined && { walletAddress }),
        ...(webhookUrl !== undefined && { webhookUrl }),
        lastActiveAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        description: true,
        walletAddress: true,
        webhookUrl: true,
        updatedAt: true,
      }
    });

    res.json({ success: true, agent: updated });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

module.exports = router;
