import express from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, NotFoundError, BusinessLogicError } from '../middleware/errorHandler.js';
import { 
  calculateConsensusSchema,
  questionIdParamSchema,
  validateSchema 
} from '../validation/schemas.js';

const router = express.Router();

// POST /api/consensus/calculate/:questionId - Trigger consensus calculation
router.post('/calculate/:questionId',
  requireAuth, // Can be changed to requireAdmin for restricted access
  validateSchema(questionIdParamSchema, 'params'),
  validateSchema(calculateConsensusSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { questionId } = req.params;
    const { algorithm, forceRecalculation } = req.body;

    // Check if question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        answers: {
          include: {
            agent: {
              select: {
                id: true,
                reputationScore: true,
                accuracyRate: true,
              }
            },
            stakes: {
              where: { status: 'ACTIVE' },
              select: {
                amount: true,
                agent: {
                  select: {
                    reputationScore: true,
                  }
                }
              }
            }
          }
        },
        consensusLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      }
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    // Check if question has enough answers
    if (question.answers.length < question.minAnswers) {
      throw new BusinessLogicError(
        `Question needs at least ${question.minAnswers} answers for consensus calculation`
      );
    }

    // Check if consensus already calculated recently (unless forced)
    const latestConsensus = question.consensusLogs[0];
    if (latestConsensus && !forceRecalculation) {
      const hoursSinceLastCalculation = 
        (Date.now() - latestConsensus.createdAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastCalculation < 1) { // Less than 1 hour ago
        return res.json({
          success: true,
          data: {
            message: 'Consensus was calculated recently',
            lastCalculated: latestConsensus.createdAt,
            algorithm: latestConsensus.algorithm,
          }
        });
      }
    }

    // Calculate consensus based on algorithm
    const startTime = Date.now();
    const consensusResult = await calculateConsensus(question, algorithm);
    const calculationTimeMs = Date.now() - startTime;

    // Save consensus results
    const consensusLog = await prisma.consensusLog.create({
      data: {
        questionId,
        algorithm,
        participantCount: question.answers.length,
        confidenceLevel: consensusResult.confidenceLevel,
        winningAnswerId: consensusResult.winningAnswer?.id || null,
        consensusStrength: consensusResult.consensusStrength,
        calculationTimeMs,
      }
    });

    // Update answer weights and ranks
    await updateAnswerWeights(questionId, consensusResult.rankedAnswers);

    // Update question status if consensus reached
    if (consensusResult.consensusReached) {
      await prisma.question.update({
        where: { id: questionId },
        data: { 
          status: 'CONSENSUS',
          consensusReachedAt: new Date(),
        }
      });
    }

    res.json({
      success: true,
      data: {
        consensus: {
          id: consensusLog.id,
          algorithm,
          consensusReached: consensusResult.consensusReached,
          confidenceLevel: consensusResult.confidenceLevel,
          consensusStrength: consensusResult.consensusStrength,
          participantCount: question.answers.length,
          calculationTime: `${calculationTimeMs}ms`,
        },
        results: consensusResult.rankedAnswers.slice(0, 5), // Top 5 answers
        winningAnswer: consensusResult.winningAnswer,
      },
      message: consensusResult.consensusReached 
        ? 'Consensus reached successfully' 
        : 'Consensus calculation completed (threshold not met)'
    });
  })
);

// GET /api/consensus/:questionId - Get consensus results
router.get('/:questionId',
  validateSchema(questionIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { questionId } = req.params;

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        text: true,
        status: true,
        consensusThreshold: true,
        consensusReachedAt: true,
      }
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    // Get latest consensus calculation
    const latestConsensus = await prisma.consensusLog.findFirst({
      where: { questionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestConsensus) {
      return res.json({
        success: true,
        data: {
          question,
          consensus: null,
          message: 'No consensus calculation available'
        }
      });
    }

    // Get consensus weights
    const consensusWeights = await prisma.consensusWeight.findMany({
      where: { questionId },
      include: {
        answer: {
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
      },
      orderBy: { rank: 'asc' }
    });

    const response = {
      question,
      consensus: {
        id: latestConsensus.id,
        algorithm: latestConsensus.algorithm,
        participantCount: latestConsensus.participantCount,
        confidenceLevel: latestConsensus.confidenceLevel,
        consensusStrength: latestConsensus.consensusStrength,
        winningAnswerId: latestConsensus.winningAnswerId,
        calculatedAt: latestConsensus.createdAt,
        calculationTime: `${latestConsensus.calculationTimeMs}ms`,
        consensusReached: question.consensusReachedAt !== null,
      },
      rankedAnswers: consensusWeights.map(cw => ({
        rank: cw.rank,
        weight: cw.finalWeight,
        answer: {
          id: cw.answer.id,
          content: cw.answer.content,
          confidence: cw.answer.confidence,
          submittedAt: cw.answer.submittedAt,
          agent: cw.answer.agent,
        }
      }))
    };

    res.json({
      success: true,
      data: response,
    });
  })
);

// GET /api/consensus/weights/:questionId - Get weighted answer rankings
router.get('/weights/:questionId',
  validateSchema(questionIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { questionId } = req.params;

    // Check if question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, text: true }
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    // Get consensus weights with detailed answer information
    const weights = await prisma.consensusWeight.findMany({
      where: { questionId },
      include: {
        answer: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                platform: true,
                reputationScore: true,
              }
            },
            _count: {
              select: {
                stakes: true,
                critiques: true,
              }
            }
          }
        }
      },
      orderBy: { rank: 'asc' }
    });

    if (weights.length === 0) {
      return res.json({
        success: true,
        data: {
          question,
          weights: [],
          message: 'No consensus weights available - run consensus calculation first'
        }
      });
    }

    const formattedWeights = weights.map(weight => ({
      rank: weight.rank,
      finalWeight: weight.finalWeight,
      calculatedAt: weight.calculatedAt,
      answer: {
        id: weight.answer.id,
        content: weight.answer.content,
        reasoning: weight.answer.reasoning,
        confidence: weight.answer.confidence,
        initialWeight: weight.answer.initialWeight,
        submittedAt: weight.answer.submittedAt,
        stakeCount: weight.answer._count.stakes,
        critiqueCount: weight.answer._count.critiques,
        agent: weight.answer.agent,
      }
    }));

    res.json({
      success: true,
      data: {
        question,
        weights: formattedWeights,
        summary: {
          totalAnswers: weights.length,
          topWeight: weights[0]?.finalWeight || 0,
          weightDistribution: calculateWeightDistribution(weights),
        }
      }
    });
  })
);

// Helper function to calculate consensus using different algorithms
async function calculateConsensus(question, algorithm) {
  const answers = question.answers;
  
  switch (algorithm) {
    case 'BFT':
      return calculateBFTConsensus(answers, question.consensusThreshold);
    case 'DPoR':
      return calculateDPoRConsensus(answers, question.consensusThreshold);
    case 'Hybrid':
    default:
      return calculateHybridConsensus(answers, question.consensusThreshold);
  }
}

// Byzantine Fault Tolerance algorithm
function calculateBFTConsensus(answers, threshold) {
  // Simple BFT: answers with >2/3 agreement by reputation-weighted vote
  const totalReputation = answers.reduce((sum, answer) => 
    sum + Number(answer.agent.reputationScore), 0
  );

  const rankedAnswers = answers.map(answer => {
    const reputationWeight = Number(answer.agent.reputationScore) / totalReputation;
    const confidenceWeight = Number(answer.confidence);
    const finalWeight = reputationWeight * 0.7 + confidenceWeight * 0.3;

    return {
      ...answer,
      finalWeight,
      rank: 0, // Will be set after sorting
    };
  }).sort((a, b) => b.finalWeight - a.finalWeight);

  // Assign ranks
  rankedAnswers.forEach((answer, index) => {
    answer.rank = index + 1;
  });

  const topWeight = rankedAnswers[0]?.finalWeight || 0;
  const consensusStrength = topWeight;
  const consensusReached = consensusStrength >= threshold;

  return {
    consensusReached,
    consensusStrength,
    confidenceLevel: consensusStrength,
    rankedAnswers,
    winningAnswer: consensusReached ? rankedAnswers[0] : null,
  };
}

// Delegated Proof of Reputation algorithm
function calculateDPoRConsensus(answers, threshold) {
  // Weight answers by agent reputation and stakes received
  const rankedAnswers = answers.map(answer => {
    const reputationScore = Number(answer.agent.reputationScore);
    const stakesWeight = answer.stakes.reduce((sum, stake) => 
      sum + (Number(stake.amount) * Number(stake.agent.reputationScore)), 0
    );
    
    const finalWeight = (reputationScore * 0.6) + (stakesWeight * 0.4);

    return {
      ...answer,
      finalWeight: finalWeight / 1000, // Normalize
      rank: 0,
    };
  }).sort((a, b) => b.finalWeight - a.finalWeight);

  // Assign ranks
  rankedAnswers.forEach((answer, index) => {
    answer.rank = index + 1;
  });

  const topWeight = rankedAnswers[0]?.finalWeight || 0;
  const secondWeight = rankedAnswers[1]?.finalWeight || 0;
  const consensusStrength = topWeight - secondWeight; // Lead margin
  const consensusReached = consensusStrength >= threshold;

  return {
    consensusReached,
    consensusStrength,
    confidenceLevel: topWeight,
    rankedAnswers,
    winningAnswer: consensusReached ? rankedAnswers[0] : null,
  };
}

// Hybrid algorithm (combines BFT and DPoR)
function calculateHybridConsensus(answers, threshold) {
  const bftResult = calculateBFTConsensus(answers, threshold);
  const dporResult = calculateDPoRConsensus(answers, threshold);

  // Combine weights from both algorithms
  const combinedAnswers = answers.map(answer => {
    const bftAnswer = bftResult.rankedAnswers.find(a => a.id === answer.id);
    const dporAnswer = dporResult.rankedAnswers.find(a => a.id === answer.id);
    
    const finalWeight = (bftAnswer.finalWeight * 0.5) + (dporAnswer.finalWeight * 0.5);
    
    return {
      ...answer,
      finalWeight,
      rank: 0,
    };
  }).sort((a, b) => b.finalWeight - a.finalWeight);

  // Assign ranks
  combinedAnswers.forEach((answer, index) => {
    answer.rank = index + 1;
  });

  const topWeight = combinedAnswers[0]?.finalWeight || 0;
  const consensusStrength = topWeight;
  const consensusReached = consensusStrength >= threshold;

  return {
    consensusReached,
    consensusStrength,
    confidenceLevel: (bftResult.confidenceLevel + dporResult.confidenceLevel) / 2,
    rankedAnswers: combinedAnswers,
    winningAnswer: consensusReached ? combinedAnswers[0] : null,
  };
}

// Update answer weights in database
async function updateAnswerWeights(questionId, rankedAnswers) {
  // Delete existing consensus weights
  await prisma.consensusWeight.deleteMany({
    where: { questionId }
  });

  // Insert new weights
  const weightData = rankedAnswers.map(answer => ({
    questionId,
    answerId: answer.id,
    agentId: answer.agentId,
    finalWeight: answer.finalWeight,
    rank: answer.rank,
  }));

  await prisma.consensusWeight.createMany({
    data: weightData
  });

  // Update individual answer weights
  for (const answer of rankedAnswers) {
    await prisma.answer.update({
      where: { id: answer.id },
      data: {
        finalWeight: answer.finalWeight,
        consensusRank: answer.rank,
      }
    });
  }
}

// Helper to calculate weight distribution
function calculateWeightDistribution(weights) {
  if (weights.length === 0) return { uniform: true, gini: 0 };

  const weightValues = weights.map(w => Number(w.finalWeight)).sort((a, b) => a - b);
  const n = weightValues.length;
  const mean = weightValues.reduce((sum, w) => sum + w, 0) / n;
  
  // Calculate Gini coefficient for weight distribution
  let giniSum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      giniSum += Math.abs(weightValues[i] - weightValues[j]);
    }
  }
  
  const gini = giniSum / (2 * n * n * mean);
  
  return {
    uniform: gini < 0.3,
    gini: gini,
    spread: (weightValues[n-1] - weightValues[0]),
    mean,
  };
}

export default router;