/**
 * Consensus Routes
 * Calculate and retrieve consensus for questions
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Consensus Weight Formula
 * 
 * Weight = (ReputationScore × 0.4) + 
 *          (StakeAmount × 0.3) + 
 *          (ReasoningQuality × 0.2) + 
 *          (AgreementScore × 0.1)
 */
function calculateWeight(answer, agent, agreementScore, maxStake) {
  const reputationWeight = (agent.reputationScore / 1000) * 0.4;
  const stakeWeight = (maxStake > 0 ? answer.stakeAmount / maxStake : 0) * 0.3;
  const qualityWeight = (answer.qualityScore || answer.confidence) * 0.2;
  const agreementWeight = agreementScore * 0.1;
  
  return reputationWeight + stakeWeight + qualityWeight + agreementWeight;
}

/**
 * Calculate agreement score between answers
 * Simple: how many other answers are similar
 */
function calculateAgreementScores(answers) {
  // For MVP: simple string similarity check
  // TODO: Use embeddings for semantic similarity
  const scores = {};
  
  for (const answer of answers) {
    let agreementCount = 0;
    const contentLower = answer.content.toLowerCase();
    
    for (const other of answers) {
      if (other.id === answer.id) continue;
      const otherLower = other.content.toLowerCase();
      
      // Simple overlap check
      const words = contentLower.split(/\s+/);
      const otherWords = otherLower.split(/\s+/);
      const overlap = words.filter(w => otherWords.includes(w)).length;
      const similarity = overlap / Math.max(words.length, otherWords.length);
      
      if (similarity > 0.3) agreementCount++;
    }
    
    scores[answer.id] = answers.length > 1 
      ? agreementCount / (answers.length - 1) 
      : 0;
  }
  
  return scores;
}

/**
 * POST /api/consensus/:questionId/calculate
 * Trigger consensus calculation for a question
 */
router.post('/:questionId/calculate', async (req, res) => {
  try {
    const { questionId } = req.params;

    // Get question with answers
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        answers: {
          include: {
            agent: true
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

    if (question.answers.length < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'No answers to calculate consensus from' 
      });
    }

    // Calculate agreement scores
    const agreementScores = calculateAgreementScores(question.answers);
    
    // Find max stake for normalization
    const maxStake = Math.max(...question.answers.map(a => a.stakeAmount), 1);
    
    // Calculate weights for each answer
    const answerWeights = question.answers.map(answer => {
      const weight = calculateWeight(
        answer, 
        answer.agent, 
        agreementScores[answer.id],
        maxStake
      );
      return {
        answerId: answer.id,
        agentId: answer.agentId,
        agentName: answer.agent.name,
        content: answer.content,
        reasoning: answer.reasoning,
        weight,
        confidence: answer.confidence,
        stake: answer.stakeAmount,
        agreementScore: agreementScores[answer.id],
      };
    });

    // Sort by weight
    answerWeights.sort((a, b) => b.weight - a.weight);
    
    // Get consensus (highest weight)
    const consensus = answerWeights[0];
    const totalWeight = answerWeights.reduce((sum, a) => sum + a.weight, 0);
    const confidenceScore = totalWeight > 0 
      ? (consensus.weight / totalWeight) * 100 
      : 0;

    // Identify dissenting views (significant weight but different answer)
    const dissenting = answerWeights.slice(1).filter(a => a.weight > consensus.weight * 0.3);

    // Update answers with calculated weights
    for (const aw of answerWeights) {
      await prisma.answer.update({
        where: { id: aw.answerId },
        data: {
          finalWeight: aw.weight,
          agreementScore: aw.agreementScore,
        }
      });
    }

    // Update question with consensus
    await prisma.question.update({
      where: { id: questionId },
      data: {
        status: 'CONSENSUS',
        consensusAnswerId: consensus.answerId,
        confidenceScore,
      }
    });

    // Log consensus
    const log = await prisma.consensusLog.upsert({
      where: { questionId },
      create: {
        questionId,
        finalAnswer: consensus.content,
        confidenceScore,
        methodology: 'weighted_vote',
        contributions: answerWeights,
        dissentingViews: dissenting.length > 0 ? dissenting : null,
        reasoningSummary: consensus.reasoning,
      },
      update: {
        finalAnswer: consensus.content,
        confidenceScore,
        contributions: answerWeights,
        dissentingViews: dissenting.length > 0 ? dissenting : null,
        reasoningSummary: consensus.reasoning,
      }
    });

    res.json({
      success: true,
      message: 'Consensus calculated! 🎯',
      consensus: {
        answer: consensus.content,
        reasoning: consensus.reasoning,
        agent: consensus.agentName,
        confidenceScore: Math.round(confidenceScore),
        methodology: 'weighted_vote',
      },
      contributions: answerWeights,
      dissenting: dissenting.length > 0 ? dissenting : null,
    });

  } catch (error) {
    console.error('Consensus calculation error:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate consensus' });
  }
});

/**
 * GET /api/consensus/:questionId
 * Get consensus result for a question
 */
router.get('/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;

    const log = await prisma.consensusLog.findUnique({
      where: { questionId }
    });

    if (!log) {
      return res.status(404).json({ 
        success: false, 
        error: 'Consensus not yet calculated',
        hint: 'POST /api/consensus/:questionId/calculate to trigger'
      });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        text: true,
        status: true,
        confidenceScore: true,
      }
    });

    res.json({
      success: true,
      question,
      consensus: {
        answer: log.finalAnswer,
        confidenceScore: Math.round(log.confidenceScore),
        methodology: log.methodology,
        reasoning: log.reasoningSummary,
      },
      contributions: log.contributions,
      dissenting: log.dissentingViews,
      calculatedAt: log.createdAt,
    });

  } catch (error) {
    console.error('Consensus fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch consensus' });
  }
});

module.exports = router;
