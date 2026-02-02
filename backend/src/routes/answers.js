import express from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, NotFoundError, ConflictError, BusinessLogicError } from '../middleware/errorHandler.js';
import { 
  submitAnswerSchema, 
  stakeAnswerSchema,
  idParamSchema,
  validateSchema 
} from '../validation/schemas.js';

const router = express.Router();

// POST /api/answers - Submit agent answer
router.post('/',
  requireAuth,
  validateSchema(submitAnswerSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { questionId, content, reasoning, confidence } = req.body;
    const agentId = req.agent.id;

    // Check if question exists and is open
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        _count: {
          select: {
            answers: true,
          }
        }
      }
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    if (question.status !== 'OPEN') {
      throw new BusinessLogicError(`Cannot submit answer: question status is ${question.status}`);
    }

    // Check if question is still open (openUntil date)
    if (question.openUntil && new Date() > question.openUntil) {
      throw new BusinessLogicError('Question deadline has passed');
    }

    // Check if max answers limit reached
    if (question.maxAnswers && question._count.answers >= question.maxAnswers) {
      throw new BusinessLogicError('Maximum number of answers reached');
    }

    // Check if agent already answered this question
    const existingAnswer = await prisma.answer.findUnique({
      where: {
        questionId_agentId: {
          questionId,
          agentId,
        }
      }
    });

    if (existingAnswer) {
      throw new ConflictError('You have already submitted an answer to this question');
    }

    // Calculate initial weight based on agent reputation
    const initialWeight = calculateInitialWeight(req.agent.reputationScore, confidence);

    // Create the answer
    const answer = await prisma.answer.create({
      data: {
        questionId,
        agentId,
        content,
        reasoning,
        confidence,
        initialWeight,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            platform: true,
            reputationScore: true,
          }
        },
        question: {
          select: {
            id: true,
            text: true,
            category: true,
            status: true,
          }
        }
      }
    });

    // Update agent's total answers count (async)
    prisma.agent.update({
      where: { id: agentId },
      data: { totalAnswers: { increment: 1 } }
    }).catch(console.error);

    res.status(201).json({
      success: true,
      data: answer,
      message: 'Answer submitted successfully'
    });
  })
);

// GET /api/answers/:id - Get answer details
router.get('/:id',
  validateSchema(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const answer = await prisma.answer.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            platform: true,
            reputationScore: true,
            accuracyRate: true,
            totalAnswers: true,
          }
        },
        question: {
          select: {
            id: true,
            text: true,
            category: true,
            status: true,
            createdAt: true,
          }
        },
        stakes: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                reputationScore: true,
              }
            }
          },
          orderBy: { amount: 'desc' }
        },
        critiques: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
              }
            },
            debateRound: {
              select: {
                id: true,
                roundNumber: true,
                topic: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            stakes: true,
            critiques: true,
          }
        }
      }
    });

    if (!answer) {
      throw new NotFoundError('Answer not found');
    }

    // Calculate aggregated stats
    const totalStaked = answer.stakes.reduce((sum, stake) => sum + Number(stake.amount), 0);
    const averageStake = answer.stakes.length > 0 ? totalStaked / answer.stakes.length : 0;

    const response = {
      ...answer,
      stakeCount: answer._count.stakes,
      critiqueCount: answer._count.critiques,
      totalStaked,
      averageStake,
      _count: undefined,
    };

    res.json({
      success: true,
      data: response,
    });
  })
);

// POST /api/answers/:id/stake - Stake tokens on answer
router.post('/:id/stake',
  requireAuth,
  validateSchema(idParamSchema, 'params'),
  validateSchema(stakeAnswerSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    const agentId = req.agent.id;

    // Check if answer exists
    const answer = await prisma.answer.findUnique({
      where: { id },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            status: true,
            openUntil: true,
          }
        },
        agent: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!answer) {
      throw new NotFoundError('Answer not found');
    }

    // Check if question is still stakeable
    if (!['OPEN', 'DEBATING'].includes(answer.question.status)) {
      throw new BusinessLogicError(`Cannot stake on answer: question status is ${answer.question.status}`);
    }

    // Check if agent is trying to stake on their own answer
    if (answer.agentId === agentId) {
      throw new BusinessLogicError('Cannot stake on your own answer');
    }

    // Check if agent already has an active stake on this answer
    const existingStake = await prisma.stake.findFirst({
      where: {
        answerId: id,
        agentId,
        status: 'ACTIVE'
      }
    });

    if (existingStake) {
      throw new ConflictError('You already have an active stake on this answer');
    }

    // For a full implementation, you'd want to check if agent has sufficient balance
    // This would require an agent balance/wallet system

    // Create the stake
    const stake = await prisma.stake.create({
      data: {
        answerId: id,
        agentId,
        amount,
        status: 'ACTIVE',
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            reputationScore: true,
          }
        },
        answer: {
          select: {
            id: true,
            content: true,
            confidence: true,
            agent: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: stake,
      message: `Staked ${amount} tokens on answer`
    });
  })
);

// Helper function to calculate initial weight
function calculateInitialWeight(reputationScore, confidence) {
  // Simple algorithm: combine reputation and confidence
  // Reputation range: typically 0-1000, normalize to 0-1
  // Confidence range: 0-1
  
  const normalizedReputation = Math.min(Number(reputationScore) / 1000, 1);
  const reputationWeight = 0.6;
  const confidenceWeight = 0.4;
  
  return normalizedReputation * reputationWeight + Number(confidence) * confidenceWeight;
}

export default router;