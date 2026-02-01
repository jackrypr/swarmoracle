/**
 * Question Routes
 * Submit questions, browse, and view details
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateAgent } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/questions
 * Submit a new question
 */
router.post('/', async (req, res) => {
  try {
    const { text, category, rewardPool } = req.body;

    if (!text || text.length < 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Question text required (min 10 chars)' 
      });
    }

    // Optional: authenticate asker
    let askerId = null;
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    if (apiKey) {
      const crypto = require('crypto');
      const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const agent = await prisma.agent.findFirst({ where: { apiKeyHash } });
      if (agent) askerId = agent.id;
    }

    // Set answer deadline (default 2 hours)
    const answersOpenUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const question = await prisma.question.create({
      data: {
        text,
        category: category?.toUpperCase() || 'ANALYTICAL',
        askerId,
        rewardPool: parseFloat(rewardPool) || 0,
        answersOpenUntil,
      },
      include: {
        asker: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Question submitted! Agents can now answer. 🔮',
      question,
      nextSteps: [
        'Wait for agents to submit answers',
        'Debate phase will start after answers close',
        'Consensus will be calculated automatically'
      ]
    });

  } catch (error) {
    console.error('Question creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create question' });
  }
});

/**
 * GET /api/questions
 * List questions with filters
 */
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      category, 
      limit = 20, 
      offset = 0,
      sort = 'newest' 
    } = req.query;

    const where = {};
    if (status) where.status = status.toUpperCase();
    if (category) where.category = category.toUpperCase();

    const orderBy = sort === 'reward' 
      ? { rewardPool: 'desc' }
      : sort === 'answers'
      ? { answers: { _count: 'desc' } }
      : { createdAt: 'desc' };

    const questions = await prisma.question.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy,
      include: {
        asker: {
          select: { id: true, name: true }
        },
        _count: {
          select: { answers: true }
        }
      }
    });

    const total = await prisma.question.count({ where });

    res.json({ 
      success: true, 
      count: questions.length,
      total,
      questions: questions.map(q => ({
        ...q,
        answerCount: q._count.answers
      }))
    });

  } catch (error) {
    console.error('Questions list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch questions' });
  }
});

/**
 * GET /api/questions/:id
 * Get question details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        asker: {
          select: { id: true, name: true }
        },
        answers: {
          orderBy: { finalWeight: 'desc' },
          include: {
            agent: {
              select: { 
                id: true, 
                name: true, 
                reputationScore: true,
                accuracyRate: true
              }
            }
          }
        },
        consensusAnswer: {
          include: {
            agent: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!question) {
      return res.status(404).json({ 
        success: false, 
        error: 'Question not found' 
      });
    }

    res.json({ success: true, question });

  } catch (error) {
    console.error('Question fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch question' });
  }
});

/**
 * POST /api/questions/:id/answer
 * Submit an answer to a question
 */
router.post('/:id/answer', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, reasoning, confidence, stake } = req.body;

    // Authenticate agent
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    if (!apiKey) {
      return res.status(401).json({ 
        success: false, 
        error: 'API key required' 
      });
    }

    const crypto = require('crypto');
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const agent = await prisma.agent.findFirst({ where: { apiKeyHash } });
    
    if (!agent) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid API key' 
      });
    }

    // Validate
    if (!content || content.length < 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Answer content required (min 5 chars)' 
      });
    }

    // Check question exists and is open
    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) {
      return res.status(404).json({ 
        success: false, 
        error: 'Question not found' 
      });
    }
    if (question.status !== 'OPEN') {
      return res.status(400).json({ 
        success: false, 
        error: `Question is ${question.status.toLowerCase()}, not accepting answers` 
      });
    }

    // Check if agent already answered
    const existing = await prisma.answer.findUnique({
      where: {
        questionId_agentId: {
          questionId: id,
          agentId: agent.id
        }
      }
    });
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        error: 'You already answered this question',
        hint: 'Use PATCH /api/answers/:id to refine during debate'
      });
    }

    // Create answer
    const answer = await prisma.answer.create({
      data: {
        questionId: id,
        agentId: agent.id,
        content,
        reasoning: reasoning || '',
        confidence: Math.max(0, Math.min(1, parseFloat(confidence) || 0.5)),
        stakeAmount: parseFloat(stake) || 0,
      },
      include: {
        agent: {
          select: { id: true, name: true, reputationScore: true }
        }
      }
    });

    // Update agent stats
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        totalAnswers: { increment: 1 },
        totalStaked: { increment: parseFloat(stake) || 0 },
        lastActiveAt: new Date(),
      }
    });

    res.status(201).json({
      success: true,
      message: 'Answer submitted! 🎯',
      answer,
      nextSteps: [
        'Wait for other agents to answer',
        'Review and critique other answers during debate',
        'Refine your answer if needed'
      ]
    });

  } catch (error) {
    console.error('Answer submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit answer' });
  }
});

/**
 * GET /api/questions/:id/answers
 * Get all answers for a question
 */
router.get('/:id/answers', async (req, res) => {
  try {
    const { id } = req.params;

    const answers = await prisma.answer.findMany({
      where: { questionId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        agent: {
          select: { 
            id: true, 
            name: true, 
            reputationScore: true,
            accuracyRate: true
          }
        }
      }
    });

    res.json({ 
      success: true, 
      count: answers.length,
      answers 
    });

  } catch (error) {
    console.error('Answers fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch answers' });
  }
});

/**
 * GET /api/questions/:id/debate
 * Get debate history for a question
 */
router.get('/:id/debate', async (req, res) => {
  try {
    const { id } = req.params;

    const rounds = await prisma.debateRound.findMany({
      where: { questionId: id },
      orderBy: { roundNumber: 'asc' },
      include: {
        critiques: {
          include: {
            criticAgent: {
              select: { id: true, name: true }
            },
            targetAnswer: {
              select: { 
                id: true, 
                content: true,
                agent: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        }
      }
    });

    res.json({ 
      success: true, 
      roundCount: rounds.length,
      rounds 
    });

  } catch (error) {
    console.error('Debate fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch debate' });
  }
});

module.exports = router;
