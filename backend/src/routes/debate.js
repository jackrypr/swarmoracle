import express from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, NotFoundError, BusinessLogicError, ConflictError } from '../middleware/errorHandler.js';
import { 
  startDebateSchema,
  submitCritiqueSchema,
  questionIdParamSchema,
  validateSchema 
} from '../validation/schemas.js';

const router = express.Router();

// POST /api/debate/start/:questionId - Start debate round
router.post('/start/:questionId',
  requireAuth,
  validateSchema(questionIdParamSchema, 'params'),
  validateSchema(startDebateSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { questionId } = req.params;
    const { topic } = req.body;

    // Check if question exists and has answers
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        answers: {
          select: { id: true }
        },
        debateRounds: {
          select: { roundNumber: true },
          orderBy: { roundNumber: 'desc' },
          take: 1,
        }
      }
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    if (question.answers.length === 0) {
      throw new BusinessLogicError('Cannot start debate: question has no answers');
    }

    if (!['OPEN', 'DEBATING'].includes(question.status)) {
      throw new BusinessLogicError(`Cannot start debate: question status is ${question.status}`);
    }

    // Check if there's an active (unended) debate round
    const activeDebate = await prisma.debateRound.findFirst({
      where: { 
        questionId,
        endedAt: null
      }
    });

    if (activeDebate) {
      throw new ConflictError('There is already an active debate round for this question');
    }

    // Determine next round number
    const nextRoundNumber = (question.debateRounds[0]?.roundNumber || 0) + 1;

    // Create new debate round
    const debateRound = await prisma.debateRound.create({
      data: {
        questionId,
        roundNumber: nextRoundNumber,
        topic,
      },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            category: true,
          }
        }
      }
    });

    // Update question status to DEBATING if it was OPEN
    if (question.status === 'OPEN') {
      await prisma.question.update({
        where: { id: questionId },
        data: { status: 'DEBATING' }
      });
    }

    res.status(201).json({
      success: true,
      data: {
        debateRound: {
          ...debateRound,
          critiqueCount: 0,
        }
      },
      message: `Debate round ${nextRoundNumber} started successfully`
    });
  })
);

// POST /api/debate/critique - Submit critique
router.post('/critique',
  requireAuth,
  validateSchema(submitCritiqueSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { debateRoundId, targetAnswerId, content, type, impact } = req.body;
    const agentId = req.agent.id;

    // Check if debate round exists and is active
    const debateRound = await prisma.debateRound.findUnique({
      where: { id: debateRoundId },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            status: true,
          }
        }
      }
    });

    if (!debateRound) {
      throw new NotFoundError('Debate round not found');
    }

    if (debateRound.endedAt) {
      throw new BusinessLogicError('Cannot submit critique: debate round has ended');
    }

    // Check if target answer exists and belongs to this question
    const targetAnswer = await prisma.answer.findUnique({
      where: { id: targetAnswerId },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!targetAnswer) {
      throw new NotFoundError('Target answer not found');
    }

    if (targetAnswer.questionId !== debateRound.questionId) {
      throw new BusinessLogicError('Target answer does not belong to the debate question');
    }

    // Prevent agents from critiquing their own answers
    if (targetAnswer.agentId === agentId) {
      throw new BusinessLogicError('Cannot critique your own answer');
    }

    // Check for duplicate critiques (same agent, same answer, same round)
    const existingCritique = await prisma.critique.findFirst({
      where: {
        debateRoundId,
        agentId,
        targetAnswerId,
      }
    });

    if (existingCritique) {
      throw new ConflictError('You have already submitted a critique for this answer in this round');
    }

    // Create the critique
    const critique = await prisma.critique.create({
      data: {
        debateRoundId,
        agentId,
        targetAnswerId,
        content,
        type,
        impact,
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
        targetAnswer: {
          select: {
            id: true,
            content: true,
            agent: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        debateRound: {
          select: {
            id: true,
            roundNumber: true,
            topic: true,
            question: {
              select: {
                id: true,
                text: true,
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: critique,
      message: 'Critique submitted successfully'
    });
  })
);

// GET /api/debate/:questionId - Get debate rounds and critiques
router.get('/:questionId',
  validateSchema(questionIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { questionId } = req.params;

    // Check if question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        text: true,
        category: true,
        status: true,
      }
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    // Get all debate rounds for this question
    const debateRounds = await prisma.debateRound.findMany({
      where: { questionId },
      include: {
        critiques: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                platform: true,
                reputationScore: true,
              }
            },
            targetAnswer: {
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
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            critiques: true,
          }
        }
      },
      orderBy: { roundNumber: 'desc' }
    });

    // Get answer summary for context
    const answers = await prisma.answer.findMany({
      where: { questionId },
      select: {
        id: true,
        content: true,
        confidence: true,
        finalWeight: true,
        submittedAt: true,
        agent: {
          select: {
            id: true,
            name: true,
            reputationScore: true,
          }
        }
      },
      orderBy: { finalWeight: 'desc' }
    });

    // Calculate debate statistics
    const totalCritiques = debateRounds.reduce((sum, round) => sum + round._count.critiques, 0);
    const activeRounds = debateRounds.filter(round => !round.endedAt).length;
    
    // Group critiques by type
    const critiqueStats = {};
    debateRounds.forEach(round => {
      round.critiques.forEach(critique => {
        critiqueStats[critique.type] = (critiqueStats[critique.type] || 0) + 1;
      });
    });

    // Format rounds for response
    const formattedRounds = debateRounds.map(round => ({
      id: round.id,
      roundNumber: round.roundNumber,
      topic: round.topic,
      startedAt: round.startedAt,
      endedAt: round.endedAt,
      isActive: !round.endedAt,
      critiqueCount: round._count.critiques,
      critiques: round.critiques.map(critique => ({
        id: critique.id,
        type: critique.type,
        content: critique.content,
        impact: critique.impact,
        createdAt: critique.createdAt,
        author: critique.agent,
        targetAnswer: {
          id: critique.targetAnswer.id,
          preview: critique.targetAnswer.content.substring(0, 100) + '...',
          confidence: critique.targetAnswer.confidence,
          author: critique.targetAnswer.agent,
        }
      }))
    }));

    const response = {
      question,
      debateRounds: formattedRounds,
      answers: answers.map(answer => ({
        ...answer,
        preview: answer.content.substring(0, 150) + '...',
      })),
      statistics: {
        totalRounds: debateRounds.length,
        activeRounds,
        totalCritiques,
        critiquesByType: critiqueStats,
        participantCount: new Set([
          ...debateRounds.flatMap(round => round.critiques.map(c => c.agentId))
        ]).size,
      }
    };

    res.json({
      success: true,
      data: response,
    });
  })
);

// PUT /api/debate/rounds/:id/end - End debate round (admin only)
router.put('/rounds/:id/end',
  requireAuth,
  validateSchema({ id: 'string' }, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // For now, allow any authenticated agent to end rounds
    // In production, you might want to restrict this to moderators/admins
    const debateRound = await prisma.debateRound.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            critiques: true,
          }
        }
      }
    });

    if (!debateRound) {
      throw new NotFoundError('Debate round not found');
    }

    if (debateRound.endedAt) {
      throw new BusinessLogicError('Debate round is already ended');
    }

    // End the debate round
    const updatedRound = await prisma.debateRound.update({
      where: { id },
      data: { endedAt: new Date() }
    });

    res.json({
      success: true,
      data: {
        ...updatedRound,
        critiqueCount: debateRound._count.critiques,
      },
      message: 'Debate round ended successfully'
    });
  })
);

// GET /api/debate/rounds/:id/summary - Get debate round summary
router.get('/rounds/:id/summary',
  validateSchema({ id: 'string' }, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const debateRound = await prisma.debateRound.findUnique({
      where: { id },
      include: {
        question: {
          select: {
            id: true,
            text: true,
          }
        },
        critiques: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                reputationScore: true,
              }
            }
          }
        }
      }
    });

    if (!debateRound) {
      throw new NotFoundError('Debate round not found');
    }

    // Analyze critiques
    const critiqueAnalysis = analyzeCritiques(debateRound.critiques);

    const summary = {
      round: {
        id: debateRound.id,
        roundNumber: debateRound.roundNumber,
        topic: debateRound.topic,
        duration: debateRound.endedAt 
          ? Math.round((debateRound.endedAt - debateRound.startedAt) / (1000 * 60)) + ' minutes'
          : 'Ongoing',
        isActive: !debateRound.endedAt,
      },
      question: debateRound.question,
      participation: {
        totalCritiques: debateRound.critiques.length,
        uniqueParticipants: new Set(debateRound.critiques.map(c => c.agentId)).size,
        avgCritiquesPerAgent: debateRound.critiques.length / new Set(debateRound.critiques.map(c => c.agentId)).size || 0,
      },
      analysis: critiqueAnalysis,
    };

    res.json({
      success: true,
      data: summary,
    });
  })
);

// Helper function to analyze critiques
function analyzeCritiques(critiques) {
  if (critiques.length === 0) {
    return {
      typeDistribution: {},
      impactDistribution: {},
      topCritics: [],
      insights: ['No critiques available for analysis']
    };
  }

  // Type distribution
  const typeDistribution = {};
  critiques.forEach(critique => {
    typeDistribution[critique.type] = (typeDistribution[critique.type] || 0) + 1;
  });

  // Impact distribution
  const impactRanges = {
    'Low (0.0-0.3)': 0,
    'Medium (0.3-0.7)': 0,
    'High (0.7-1.0)': 0,
  };

  critiques.forEach(critique => {
    const impact = Number(critique.impact);
    if (impact < 0.3) impactRanges['Low (0.0-0.3)']++;
    else if (impact < 0.7) impactRanges['Medium (0.3-0.7)']++;
    else impactRanges['High (0.7-1.0)']++;
  });

  // Top critics by reputation
  const criticStats = {};
  critiques.forEach(critique => {
    if (!criticStats[critique.agentId]) {
      criticStats[critique.agentId] = {
        agent: critique.agent,
        critiqueCount: 0,
        avgImpact: 0,
        totalImpact: 0,
      };
    }
    criticStats[critique.agentId].critiqueCount++;
    criticStats[critique.agentId].totalImpact += Number(critique.impact);
  });

  // Calculate averages and sort
  const topCritics = Object.values(criticStats)
    .map(stats => ({
      ...stats,
      avgImpact: stats.totalImpact / stats.critiqueCount,
    }))
    .sort((a, b) => b.agent.reputationScore - a.agent.reputationScore)
    .slice(0, 5);

  // Generate insights
  const insights = [];
  const mostCommonType = Object.entries(typeDistribution)
    .sort(([,a], [,b]) => b - a)[0];
  
  if (mostCommonType) {
    insights.push(`Most common critique type: ${mostCommonType[0]} (${mostCommonType[1]} critiques)`);
  }

  const avgImpact = critiques.reduce((sum, c) => sum + Number(c.impact), 0) / critiques.length;
  insights.push(`Average impact score: ${avgImpact.toFixed(2)}`);

  if (topCritics.length > 0) {
    insights.push(`Most active critic: ${topCritics[0].agent.name} (${topCritics[0].critiqueCount} critiques)`);
  }

  return {
    typeDistribution,
    impactDistribution: impactRanges,
    topCritics,
    insights,
    averageImpact: avgImpact,
  };
}

export default router;