import express from 'express';
import { prisma } from '../lib/prisma.js';
import { optionalAuth, generateToken } from '../middleware/auth.js';
import { asyncHandler, NotFoundError, ConflictError } from '../middleware/errorHandler.js';
import { 
  registerAgentSchema, 
  agentQuerySchema,
  idParamSchema,
  paginationSchema,
  validateSchema 
} from '../validation/schemas.js';

const router = express.Router();

// POST /api/agents/register - Register new agent
router.post('/register',
  validateSchema(registerAgentSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { name, description, platform, webhookUrl, capabilities } = req.body;

    // Check if agent name is already taken (optional uniqueness)
    const existingAgent = await prisma.agent.findFirst({
      where: { 
        name,
        platform // Allow same name on different platforms
      }
    });

    if (existingAgent) {
      throw new ConflictError(`Agent name '${name}' is already taken on platform '${platform}'`);
    }

    // Create the agent
    const agent = await prisma.agent.create({
      data: {
        name,
        description,
        platform,
        webhookUrl,
        capabilities,
      }
    });

    // Generate JWT token for the agent
    const token = generateToken(agent.id);

    res.status(201).json({
      success: true,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          platform: agent.platform,
          capabilities: agent.capabilities,
          reputationScore: agent.reputationScore,
          createdAt: agent.createdAt,
        },
        token,
        expiresIn: '24h',
      },
      message: 'Agent registered successfully'
    });
  })
);

// GET /api/agents - List agents with leaderboard sorting
router.get('/',
  optionalAuth,
  validateSchema(agentQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, sortBy, sortOrder, platform } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where = {};
    if (platform) where.platform = platform;

    // Get agents with pagination
    const [agents, totalCount] = await Promise.all([
      prisma.agent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          description: true,
          platform: true,
          capabilities: true,
          reputationScore: true,
          totalAnswers: true,
          correctAnswers: true,
          accuracyRate: true,
          totalEarned: true,
          lastActiveAt: true,
          createdAt: true,
          _count: {
            select: {
              answers: true,
              stakes: true,
            }
          }
        }
      }),
      prisma.agent.count({ where })
    ]);

    // Calculate additional metrics for each agent
    const formattedAgents = await Promise.all(
      agents.map(async (agent) => {
        // Get recent activity (last 30 days)
        const recentAnswers = await prisma.answer.count({
          where: {
            agentId: agent.id,
            submittedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        });

        // Calculate rank (based on reputation score)
        const rank = await prisma.agent.count({
          where: {
            reputationScore: { gt: agent.reputationScore }
          }
        }) + 1;

        return {
          ...agent,
          answerCount: agent._count.answers,
          stakeCount: agent._count.stakes,
          recentActivity: recentAnswers,
          rank,
          _count: undefined,
        };
      })
    );

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: formattedAgents,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      leaderboard: {
        sortedBy: sortBy,
        sortOrder,
        platform: platform || 'all',
      }
    });
  })
);

// GET /api/agents/:id - Get agent profile + stats
router.get('/:id',
  optionalAuth,
  validateSchema(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            answers: true,
            stakes: true,
            critiques: true,
          }
        },
        statistics: true,
      }
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // Get detailed statistics
    const [
      recentAnswers,
      bestAnswer,
      totalStakesReceived,
      averageConfidence,
      categoryBreakdown,
      rank
    ] = await Promise.all([
      // Recent activity (last 30 days)
      prisma.answer.count({
        where: {
          agentId: id,
          submittedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Best performing answer (highest final weight)
      prisma.answer.findFirst({
        where: { agentId: id },
        orderBy: { finalWeight: 'desc' },
        include: {
          question: {
            select: {
              id: true,
              text: true,
              category: true,
            }
          }
        }
      }),
      
      // Total stakes received on their answers
      prisma.stake.aggregate({
        where: {
          answer: { agentId: id },
          status: 'ACTIVE'
        },
        _sum: { amount: true },
        _count: true,
      }),
      
      // Average confidence in their answers
      prisma.answer.aggregate({
        where: { agentId: id },
        _avg: { confidence: true }
      }),
      
      // Category breakdown
      prisma.answer.groupBy({
        by: ['questionId'],
        where: { agentId: id },
        _count: true,
      }).then(results => 
        prisma.question.findMany({
          where: { id: { in: results.map(r => r.questionId) } },
          select: { category: true }
        })
      ).then(questions => {
        const categoryCount = {};
        questions.forEach(q => {
          categoryCount[q.category] = (categoryCount[q.category] || 0) + 1;
        });
        return categoryCount;
      }),
      
      // Calculate rank
      prisma.agent.count({
        where: { reputationScore: { gt: agent.reputationScore } }
      }).then(count => count + 1)
    ]);

    const response = {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      platform: agent.platform,
      capabilities: agent.capabilities,
      webhookUrl: agent.webhookUrl,
      reputationScore: agent.reputationScore,
      totalAnswers: agent.totalAnswers,
      correctAnswers: agent.correctAnswers,
      accuracyRate: agent.accuracyRate,
      totalEarned: agent.totalEarned,
      lastActiveAt: agent.lastActiveAt,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      
      // Counts
      answerCount: agent._count.answers,
      stakeCount: agent._count.stakes,
      critiqueCount: agent._count.critiques,
      
      // Detailed stats
      statistics: {
        rank,
        recentActivity: recentAnswers,
        stakesReceived: {
          total: Number(totalStakesReceived._sum.amount || 0),
          count: totalStakesReceived._count,
        },
        averageConfidence: Number(averageConfidence._avg.confidence || 0),
        categoryBreakdown,
        bestAnswer: bestAnswer ? {
          id: bestAnswer.id,
          content: bestAnswer.content.substring(0, 100) + '...',
          confidence: bestAnswer.confidence,
          finalWeight: bestAnswer.finalWeight,
          question: bestAnswer.question,
        } : null,
        
        // Include pre-computed stats if available
        ...(agent.statistics ? {
          last24hAnswers: agent.statistics.last24hAnswers,
          last7dAccuracy: agent.statistics.last7dAccuracy,
          avgConsensusWeight: agent.statistics.avgConsensusWeight,
          specialtyCategories: agent.statistics.specialtyCategories,
        } : {}),
      }
    };

    res.json({
      success: true,
      data: response,
    });
  })
);

// GET /api/agents/:id/answers - Get agent's answer history
router.get('/:id/answers',
  optionalAuth,
  validateSchema(idParamSchema, 'params'),
  validateSchema(paginationSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page, limit } = req.query;

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    const skip = (page - 1) * limit;

    // Get agent's answers with question details
    const [answers, totalCount] = await Promise.all([
      prisma.answer.findMany({
        where: { agentId: id },
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          question: {
            select: {
              id: true,
              text: true,
              category: true,
              status: true,
              createdAt: true,
            }
          },
          _count: {
            select: {
              stakes: true,
              critiques: true,
            }
          },
          stakes: {
            select: {
              amount: true,
              status: true,
            }
          }
        }
      }),
      prisma.answer.count({ where: { agentId: id } })
    ]);

    // Format responses with additional metrics
    const formattedAnswers = answers.map(answer => ({
      ...answer,
      stakeCount: answer._count.stakes,
      critiqueCount: answer._count.critiques,
      totalStaked: answer.stakes.reduce((sum, stake) => sum + Number(stake.amount), 0),
      _count: undefined,
      stakes: undefined, // Remove detailed stakes from response
    }));

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
        },
        answers: formattedAnswers,
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    });
  })
);

export default router;