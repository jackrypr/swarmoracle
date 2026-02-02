import express from 'express';
import { prisma } from '../lib/prisma.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { asyncHandler, NotFoundError, BusinessLogicError } from '../middleware/errorHandler.js';
import { 
  createQuestionSchema, 
  questionQuerySchema, 
  closeQuestionSchema,
  idParamSchema,
  validateSchema 
} from '../validation/schemas.js';

const router = express.Router();

// POST /api/questions - Create new question
router.post('/', 
  requireAuth,
  validateSchema(createQuestionSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { text, description, category, minAnswers, maxAnswers, consensusThreshold, openUntil } = req.body;
    
    // Create the question
    const question = await prisma.question.create({
      data: {
        text,
        description,
        category,
        minAnswers,
        maxAnswers,
        consensusThreshold,
        openUntil: openUntil ? new Date(openUntil) : null,
        status: 'OPEN',
      },
      include: {
        _count: {
          select: {
            answers: true,
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        ...question,
        answerCount: question._count.answers,
        _count: undefined, // Remove _count from response
      },
      message: 'Question created successfully'
    });
  })
);

// GET /api/questions - List all questions with filters
router.get('/',
  optionalAuth,
  validateSchema(questionQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, status, category, sortBy, sortOrder } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;

    // Get questions with pagination
    const [questions, totalCount] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              answers: true,
            }
          },
          answers: {
            select: {
              id: true,
              confidence: true,
              submittedAt: true,
              agent: {
                select: {
                  id: true,
                  name: true,
                  reputationScore: true,
                }
              }
            },
            orderBy: { finalWeight: 'desc' },
            take: 3, // Show top 3 answers
          }
        }
      }),
      prisma.question.count({ where })
    ]);

    // Format response
    const formattedQuestions = questions.map(question => ({
      ...question,
      answerCount: question._count.answers,
      topAnswers: question.answers,
      _count: undefined,
      answers: undefined,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: formattedQuestions,
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

// GET /api/questions/:id - Get question details with answers
router.get('/:id',
  optionalAuth,
  validateSchema(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            answers: true,
            stakes: {
              through: {
                answers: true
              }
            }
          }
        },
        answers: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                platform: true,
                reputationScore: true,
                accuracyRate: true,
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
                id: true,
                amount: true,
                status: true,
                agent: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              }
            }
          },
          orderBy: [
            { finalWeight: 'desc' },
            { submittedAt: 'asc' }
          ]
        },
        consensusLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            algorithm: true,
            participantCount: true,
            confidenceLevel: true,
            consensusStrength: true,
            createdAt: true,
          }
        },
        debateRounds: {
          select: {
            id: true,
            roundNumber: true,
            topic: true,
            startedAt: true,
            endedAt: true,
            _count: {
              select: {
                critiques: true,
              }
            }
          },
          orderBy: { roundNumber: 'desc' },
          take: 5,
        }
      }
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    // Format answers
    const formattedAnswers = question.answers.map(answer => ({
      ...answer,
      stakeCount: answer._count.stakes,
      critiqueCount: answer._count.critiques,
      totalStaked: answer.stakes.reduce((sum, stake) => sum + Number(stake.amount), 0),
      _count: undefined,
    }));

    const response = {
      ...question,
      answerCount: question._count.answers,
      answers: formattedAnswers,
      latestConsensus: question.consensusLogs[0] || null,
      recentDebateRounds: question.debateRounds.map(round => ({
        ...round,
        critiqueCount: round._count.critiques,
        _count: undefined,
      })),
      _count: undefined,
      consensusLogs: undefined,
      debateRounds: undefined,
    };

    res.json({
      success: true,
      data: response,
    });
  })
);

// POST /api/questions/:id/close - Close question for new answers
router.post('/:id/close',
  requireAuth,
  validateSchema(idParamSchema, 'params'),
  validateSchema(closeQuestionSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    // Check if question exists and is not already closed
    const existingQuestion = await prisma.question.findUnique({
      where: { id },
      select: { id: true, status: true, text: true }
    });

    if (!existingQuestion) {
      throw new NotFoundError('Question not found');
    }

    if (existingQuestion.status === 'CLOSED') {
      throw new BusinessLogicError('Question is already closed');
    }

    // Update question status
    const updatedQuestion = await prisma.question.update({
      where: { id },
      data: { 
        status: 'CLOSED',
        // Could add a reason field to the schema if needed
      },
      include: {
        _count: {
          select: {
            answers: true,
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        ...updatedQuestion,
        answerCount: updatedQuestion._count.answers,
        _count: undefined,
      },
      message: `Question closed successfully${reason ? ': ' + reason : ''}`
    });
  })
);

export default router;