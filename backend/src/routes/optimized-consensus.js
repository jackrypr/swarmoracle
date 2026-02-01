/**
 * Optimized Consensus Routes for SwarmOracle
 * High-performance endpoints for consensus operations
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const ConsensusEngine = require('../services/consensus-engine');
const { authenticateAgent, checkRateLimit } = require('../middleware/auth');
const redis = require('redis');

const router = express.Router();
const prisma = new PrismaClient();
const consensusEngine = new ConsensusEngine();
const redisClient = redis.createClient({ url: process.env.REDIS_URL });

/**
 * GET /consensus/:questionId - Get consensus result
 * Optimized with Redis caching for instant responses
 */
router.get('/:questionId', async (req, res) => {
    try {
        const { questionId } = req.params;
        
        // Try cache first
        const cached = await redisClient.get(`consensus:${questionId}`);
        if (cached) {
            return res.json({
                success: true,
                consensus: JSON.parse(cached),
                fromCache: true
            });
        }
        
        // Fallback to database with optimized query
        const consensusWeights = await prisma.consensusWeight.findMany({
            where: { questionId },
            include: {
                answer: {
                    include: {
                        agent: {
                            select: {
                                id: true,
                                name: true,
                                reputationScore: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                rank: 'asc'
            }
        });
        
        const consensusLog = await prisma.consensusLog.findFirst({
            where: { questionId },
            orderBy: { createdAt: 'desc' }
        });
        
        const consensus = {
            questionId,
            weights: consensusWeights,
            algorithm: consensusLog?.algorithm || 'UNKNOWN',
            confidenceLevel: consensusLog?.confidenceLevel || 0,
            consensusStrength: consensusLog?.consensusStrength || 0,
            calculationTime: consensusLog?.calculationTimeMs || 0,
            participantCount: consensusLog?.participantCount || 0
        };
        
        // Cache for future requests
        await redisClient.setex(`consensus:${questionId}`, 300, JSON.stringify(consensus));
        
        res.json({
            success: true,
            consensus
        });
        
    } catch (error) {
        console.error('Consensus retrieval error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /consensus/:questionId/trigger - Trigger consensus calculation
 * Async processing with immediate response
 */
router.post('/:questionId/trigger', authenticateAgent, checkRateLimit, async (req, res) => {
    try {
        const { questionId } = req.params;
        const { urgent = false, algorithm = null } = req.body;
        
        // Check if question exists and is eligible for consensus
        const question = await prisma.question.findUnique({
            where: { id: questionId },
            include: {
                answers: true
            }
        });
        
        if (!question) {
            return res.status(404).json({
                success: false,
                error: 'Question not found'
            });
        }
        
        if (question.status !== 'OPEN' && question.status !== 'DEBATING') {
            return res.status(400).json({
                success: false,
                error: 'Question not eligible for consensus calculation'
            });
        }
        
        if (question.answers.length < question.minAnswers) {
            return res.status(400).json({
                success: false,
                error: `Insufficient answers: ${question.answers.length} < ${question.minAnswers}`
            });
        }
        
        // Trigger async consensus calculation
        const job = await consensusEngine.triggerConsensus(questionId, {
            urgent,
            algorithm,
            requestedBy: req.agent.id
        });
        
        res.json({
            success: true,
            message: 'Consensus calculation initiated',
            jobId: job.jobId,
            status: job.status,
            estimatedTime: job.estimatedTime
        });
        
    } catch (error) {
        console.error('Consensus trigger error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /consensus/:questionId/status - Get consensus calculation status
 * Real-time status updates
 */
router.get('/:questionId/status', async (req, res) => {
    try {
        const { questionId } = req.params;
        
        // Check current calculation status
        const question = await prisma.question.findUnique({
            where: { id: questionId },
            select: {
                status: true,
                consensusReachedAt: true,
                _count: {
                    select: {
                        answers: true,
                        consensusLogs: true
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
        
        // Check if consensus calculation is in progress
        const jobs = await consensusEngine.queue.getJobs(['waiting', 'active'], 0, -1);
        const activeJob = jobs.find(job => job.data.questionId === questionId);
        
        let status = 'idle';
        let progress = null;
        
        if (activeJob) {
            status = activeJob.opts.jobId ? 'processing' : 'queued';
            progress = activeJob.progress();
        } else if (question.status === 'CONSENSUS') {
            status = 'completed';
        }
        
        res.json({
            success: true,
            questionId,
            status: {
                calculation: status,
                questionStatus: question.status,
                answerCount: question._count.answers,
                consensusReachedAt: question.consensusReachedAt,
                hasConsensus: question._count.consensusLogs > 0,
                progress
            }
        });
        
    } catch (error) {
        console.error('Consensus status error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /consensus/leaderboard - Get consensus algorithm leaderboard
 * Cached with materialized view for performance
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const { limit = 20, algorithm = null } = req.query;
        
        // Try cache first
        const cacheKey = `leaderboard:consensus:${algorithm || 'all'}:${limit}`;
        const cached = await redisClient.get(cacheKey);
        
        if (cached) {
            return res.json({
                success: true,
                leaderboard: JSON.parse(cached),
                fromCache: true
            });
        }
        
        // Query with optimized aggregation
        const whereClause = algorithm ? { algorithm } : {};
        
        const leaderboard = await prisma.$queryRaw`
            SELECT 
                a.id,
                a.name,
                a.reputation_score as "reputationScore",
                COUNT(DISTINCT cl.question_id) as "consensusParticipations",
                AVG(cw.final_weight) as "avgWeight",
                COUNT(CASE WHEN cw.rank = 1 THEN 1 END) as "wins",
                AVG(cl.confidence_level) as "avgConfidence"
            FROM agents a
            JOIN consensus_weights cw ON a.id = cw.agent_id
            JOIN consensus_logs cl ON cw.question_id = cl.question_id
            ${algorithm ? 'WHERE cl.algorithm = ${algorithm}' : ''}
            GROUP BY a.id, a.name, a.reputation_score
            ORDER BY "avgWeight" DESC, "wins" DESC
            LIMIT ${parseInt(limit)}
        `;
        
        // Process results
        const processedLeaderboard = leaderboard.map((agent, index) => ({
            rank: index + 1,
            agentId: agent.id,
            agentName: agent.name,
            reputationScore: parseFloat(agent.reputationScore),
            consensusParticipations: parseInt(agent.consensusParticipations),
            avgWeight: parseFloat(agent.avgWeight),
            wins: parseInt(agent.wins),
            avgConfidence: parseFloat(agent.avgConfidence),
            winRate: agent.consensusParticipations > 0 ? 
                (parseInt(agent.wins) / parseInt(agent.consensusParticipations)) : 0
        }));
        
        // Cache for 5 minutes
        await redisClient.setex(cacheKey, 300, JSON.stringify(processedLeaderboard));
        
        res.json({
            success: true,
            leaderboard: processedLeaderboard,
            algorithm: algorithm || 'all',
            lastUpdated: new Date()
        });
        
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /consensus/analytics - Get consensus performance analytics
 * Real-time metrics and historical data
 */
router.get('/analytics', async (req, res) => {
    try {
        const { timeframe = '24h' } = req.query;
        
        let timeFilter;
        switch (timeframe) {
            case '1h':
                timeFilter = new Date(Date.now() - 60 * 60 * 1000);
                break;
            case '24h':
                timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                timeFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            default:
                timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
        }
        
        // Parallel queries for different metrics
        const [
            consensusStats,
            algorithmPerformance,
            calculationTimes,
            accuracyTrends
        ] = await Promise.all([
            // Basic consensus statistics
            prisma.consensusLog.aggregate({
                where: {
                    createdAt: { gte: timeFilter }
                },
                _count: { id: true },
                _avg: {
                    calculationTimeMs: true,
                    confidenceLevel: true,
                    consensusStrength: true,
                    participantCount: true
                }
            }),
            
            // Algorithm performance comparison
            prisma.consensusLog.groupBy({
                by: ['algorithm'],
                where: {
                    createdAt: { gte: timeFilter }
                },
                _count: { id: true },
                _avg: {
                    calculationTimeMs: true,
                    confidenceLevel: true
                }
            }),
            
            // Calculation time distribution
            prisma.$queryRaw`
                SELECT 
                    CASE 
                        WHEN calculation_time_ms < 1000 THEN '<1s'
                        WHEN calculation_time_ms < 2000 THEN '1-2s'
                        WHEN calculation_time_ms < 5000 THEN '2-5s'
                        ELSE '>5s'
                    END as time_bucket,
                    COUNT(*) as count
                FROM consensus_logs 
                WHERE created_at >= ${timeFilter}
                GROUP BY time_bucket
                ORDER BY 
                    CASE time_bucket
                        WHEN '<1s' THEN 1
                        WHEN '1-2s' THEN 2  
                        WHEN '2-5s' THEN 3
                        ELSE 4
                    END
            `,
            
            // Accuracy trends (would need verification data)
            prisma.$queryRaw`
                SELECT 
                    DATE_TRUNC('hour', created_at) as hour,
                    AVG(confidence_level) as avg_confidence,
                    COUNT(*) as consensus_count
                FROM consensus_logs
                WHERE created_at >= ${timeFilter}
                GROUP BY DATE_TRUNC('hour', created_at)
                ORDER BY hour
            `
        ]);
        
        res.json({
            success: true,
            timeframe,
            analytics: {
                overview: {
                    totalConsensus: consensusStats._count.id || 0,
                    avgCalculationTime: consensusStats._avg.calculationTimeMs || 0,
                    avgConfidence: consensusStats._avg.confidenceLevel || 0,
                    avgConsensusStrength: consensusStats._avg.consensusStrength || 0,
                    avgParticipants: consensusStats._avg.participantCount || 0
                },
                algorithmPerformance,
                calculationTimeDistribution: calculationTimes,
                accuracyTrends
            },
            lastUpdated: new Date()
        });
        
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;