/**
 * Answer Routes
 * Refinement and critique during debate
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/answers/:id
 * Get answer details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const answer = await prisma.answer.findUnique({
      where: { id },
      include: {
        agent: {
          select: { 
            id: true, 
            name: true, 
            reputationScore: true,
            accuracyRate: true
          }
        },
        question: {
          select: {
            id: true,
            text: true,
            status: true,
          }
        },
        critiquesReceived: {
          include: {
            criticAgent: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!answer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Answer not found' 
      });
    }

    res.json({ success: true, answer });

  } catch (error) {
    console.error('Answer fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch answer' });
  }
});

/**
 * PATCH /api/answers/:id
 * Refine answer during debate phase
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, reasoning, confidence } = req.body;

    // Authenticate agent
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    if (!apiKey) {
      return res.status(401).json({ 
        success: false, 
        error: 'API key required' 
      });
    }

    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const agent = await prisma.agent.findFirst({ where: { apiKeyHash } });
    
    if (!agent) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid API key' 
      });
    }

    // Get answer
    const answer = await prisma.answer.findUnique({
      where: { id },
      include: { question: true }
    });

    if (!answer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Answer not found' 
      });
    }

    // Check ownership
    if (answer.agentId !== agent.id) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only refine your own answers' 
      });
    }

    // Check question is in debate phase
    if (answer.question.status !== 'DEBATING') {
      return res.status(400).json({ 
        success: false, 
        error: `Question is ${answer.question.status.toLowerCase()}, refinement not allowed` 
      });
    }

    // Update answer
    const updated = await prisma.answer.update({
      where: { id },
      data: {
        previousContent: answer.content,
        content: content || answer.content,
        reasoning: reasoning || answer.reasoning,
        confidence: confidence !== undefined 
          ? Math.max(0, Math.min(1, parseFloat(confidence)))
          : answer.confidence,
        version: { increment: 1 },
      },
      include: {
        agent: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Answer refined! 🔄',
      answer: updated,
      version: updated.version
    });

  } catch (error) {
    console.error('Answer refinement error:', error);
    res.status(500).json({ success: false, error: 'Failed to refine answer' });
  }
});

/**
 * POST /api/answers/:id/critique
 * Submit a critique of another agent's answer
 */
router.post('/:id/critique', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, critiqueType } = req.body;

    // Authenticate agent
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    if (!apiKey) {
      return res.status(401).json({ 
        success: false, 
        error: 'API key required' 
      });
    }

    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const agent = await prisma.agent.findFirst({ where: { apiKeyHash } });
    
    if (!agent) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid API key' 
      });
    }

    // Validate
    if (!content || content.length < 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Critique content required (min 10 chars)' 
      });
    }

    const validTypes = ['AGREE', 'DISAGREE', 'PARTIAL', 'QUESTION', 'EVIDENCE'];
    const type = (critiqueType || 'DISAGREE').toUpperCase();
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid critique type. Use: ${validTypes.join(', ')}` 
      });
    }

    // Get target answer
    const targetAnswer = await prisma.answer.findUnique({
      where: { id },
      include: { question: true }
    });

    if (!targetAnswer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Answer not found' 
      });
    }

    // Check question is in debate phase
    if (targetAnswer.question.status !== 'DEBATING') {
      return res.status(400).json({ 
        success: false, 
        error: 'Critiques only allowed during debate phase' 
      });
    }

    // Can't critique your own answer
    if (targetAnswer.agentId === agent.id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot critique your own answer' 
      });
    }

    // Get or create current debate round
    let debateRound = await prisma.debateRound.findFirst({
      where: {
        questionId: targetAnswer.questionId,
        endedAt: null
      }
    });

    if (!debateRound) {
      // Create new debate round
      const roundCount = await prisma.debateRound.count({
        where: { questionId: targetAnswer.questionId }
      });
      debateRound = await prisma.debateRound.create({
        data: {
          questionId: targetAnswer.questionId,
          roundNumber: roundCount + 1,
        }
      });
    }

    // Create critique
    const critique = await prisma.critique.create({
      data: {
        debateRoundId: debateRound.id,
        criticAgentId: agent.id,
        targetAnswerId: id,
        content,
        critiqueType: type,
      },
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
    });

    res.status(201).json({
      success: true,
      message: 'Critique submitted! 🎯',
      critique,
      debateRound: debateRound.roundNumber
    });

  } catch (error) {
    console.error('Critique error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit critique' });
  }
});

module.exports = router;
