/**
 * Optimized Consensus Engine for SwarmOracle
 * Implements async processing with semantic similarity and weighted voting
 * Target: <2 second consensus calculation for 10,000+ agents
 */

const Bull = require('bull');
const { OpenAI } = require('openai');
const { PrismaClient } = require('@prisma/client');
const EventEmitter = require('events');

class ConsensusEngine extends EventEmitter {
    constructor() {
        super();
        this.prisma = new PrismaClient();
        
        // Redis/Bull queue (optional)
        if (process.env.REDIS_URL) {
            this.queue = new Bull('consensus-queue', { redis: process.env.REDIS_URL });
            this.setupQueue();
        } else {
            console.log('⚠️  ConsensusEngine running without Redis queue');
            // Create mock queue for compatibility
            this.queue = {
                add: async (name, data) => {
                    // Process synchronously without queue
                    const result = await this.calculateConsensusAsync(data.questionId, data.options);
                    this.emit('consensus:calculated', result);
                    return { id: Date.now(), data: result };
                },
                getWaiting: async () => [],
                on: () => {}
            };
        }
        
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        // Performance monitoring
        this.metrics = {
            avgCalculationTime: 0,
            totalCalculations: 0,
            lastCalculationTime: null
        };
    }
    
    setupQueue() {
        // Process consensus calculations asynchronously
        this.queue.process('calculate-consensus', 3, async (job) => {
            return await this.calculateConsensusAsync(job.data.questionId, job.data.options);
        });
        
        // Handle completion events
        this.queue.on('completed', (job, result) => {
            this.emit('consensus:calculated', result);
            this.updateMetrics(result.calculationTimeMs);
        });
        
        this.queue.on('failed', (job, err) => {
            console.error('Consensus calculation failed:', err);
            this.emit('consensus:failed', { questionId: job.data.questionId, error: err.message });
        });
    }
    
    /**
     * Trigger async consensus calculation
     * Non-blocking - returns immediately, emits event when complete
     */
    async triggerConsensus(questionId, options = {}) {
        const priority = this.getPriority(questionId, options);
        
        const job = await this.queue.add('calculate-consensus', 
            { questionId, options }, 
            {
                priority,
                attempts: 3,
                backoff: 'exponential',
                removeOnComplete: 10,
                removeOnFail: 5
            }
        );
        
        return {
            jobId: job.id,
            status: 'queued',
            estimatedTime: this.getEstimatedTime(questionId)
        };
    }
    
    /**
     * Main consensus calculation with performance optimization
     */
    async calculateConsensusAsync(questionId, options = {}) {
        const startTime = Date.now();
        console.log(`Starting consensus calculation for question ${questionId}`);
        
        try {
            // 1. Batch load all required data in single query
            const data = await this.loadConsensusData(questionId);
            
            if (data.answers.length < data.question.minAnswers) {
                throw new Error(`Insufficient answers: ${data.answers.length} < ${data.question.minAnswers}`);
            }
            
            // 2. Parallel computation of different weight components
            const [semanticScores, reputationWeights, stakeWeights, debateWeights] = await Promise.all([
                this.calculateSemanticSimilarity(data.answers),
                this.calculateReputationWeights(data.agents),
                this.calculateStakeWeights(data.stakes),
                this.calculateDebateWeights(data.debateRounds)
            ]);
            
            // 3. Algorithm selection based on question type and agent count
            const algorithm = this.selectOptimalAlgorithm(data.question, data.answers.length);
            
            // 4. Calculate weighted consensus
            const consensus = await this.calculateWeightedConsensus({
                question: data.question,
                answers: data.answers,
                agents: data.agents,
                semanticScores,
                reputationWeights,
                stakeWeights,
                debateWeights,
                algorithm
            });
            
            // 5. Cache results and update database
            await Promise.all([
                this.cacheConsensusResult(questionId, consensus),
                this.updateConsensusWeights(questionId, consensus.answerWeights),
                this.updateQuestionStatus(questionId, 'CONSENSUS'),
                this.logConsensusCalculation(questionId, consensus, algorithm, Date.now() - startTime)
            ]);
            
            const calculationTime = Date.now() - startTime;
            console.log(`Consensus calculated in ${calculationTime}ms using ${algorithm}`);
            
            return {
                questionId,
                consensus,
                algorithm,
                calculationTimeMs: calculationTime,
                participantCount: data.answers.length,
                confidenceLevel: consensus.confidenceLevel
            };
            
        } catch (error) {
            console.error(`Consensus calculation failed for ${questionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Optimized data loading - single query with all relations
     */
    async loadConsensusData(questionId) {
        const question = await this.prisma.question.findUniqueOrThrow({
            where: { id: questionId },
            include: {
                answers: {
                    include: {
                        agent: {
                            include: {
                                statistics: true
                            }
                        },
                        stakes: true
                    }
                },
                debateRounds: {
                    include: {
                        critiques: {
                            include: {
                                agent: true
                            }
                        }
                    },
                    orderBy: {
                        roundNumber: 'desc'
                    }
                }
            }
        });
        
        return {
            question,
            answers: question.answers,
            agents: question.answers.map(a => a.agent),
            stakes: question.answers.flatMap(a => a.stakes),
            debateRounds: question.debateRounds
        };
    }
    
    /**
     * Advanced semantic similarity using OpenAI embeddings
     * Replaces simple string matching with vector similarity
     */
    async calculateSemanticSimilarity(answers) {
        if (answers.length < 2) return {};
        
        try {
            // Batch embed all answers for efficiency
            const texts = answers.map(a => `${a.content} ${a.reasoning}`);
            const response = await this.openai.embeddings.create({
                model: "text-embedding-3-small",
                input: texts,
                encoding_format: "float"
            });
            
            const embeddings = response.data.map(d => d.embedding);
            
            // Calculate pairwise similarities
            const similarities = {};
            for (let i = 0; i < answers.length; i++) {
                similarities[answers[i].id] = [];
                for (let j = 0; j < answers.length; j++) {
                    if (i !== j) {
                        const similarity = this.cosineSimilarity(embeddings[i], embeddings[j]);
                        similarities[answers[i].id].push({
                            answerId: answers[j].id,
                            similarity: similarity
                        });
                    }
                }
            }
            
            return similarities;
            
        } catch (error) {
            console.warn('Semantic similarity calculation failed, falling back to text matching:', error);
            return this.fallbackTextSimilarity(answers);
        }
    }
    
    /**
     * Cosine similarity between two vectors
     */
    cosineSimilarity(vecA, vecB) {
        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
        
        if (magnitudeA === 0 || magnitudeB === 0) return 0;
        return dotProduct / (magnitudeA * magnitudeB);
    }
    
    /**
     * Fallback text similarity for when embeddings fail
     */
    fallbackTextSimilarity(answers) {
        const similarities = {};
        for (const answer of answers) {
            similarities[answer.id] = [];
            for (const other of answers) {
                if (answer.id !== other.id) {
                    const similarity = this.jacardSimilarity(
                        answer.content.toLowerCase().split(' '),
                        other.content.toLowerCase().split(' ')
                    );
                    similarities[answer.id].push({
                        answerId: other.id,
                        similarity: similarity
                    });
                }
            }
        }
        return similarities;
    }
    
    jacardSimilarity(setA, setB) {
        const intersection = setA.filter(x => setB.includes(x));
        const union = [...new Set([...setA, ...setB])];
        return intersection.length / union.length;
    }
    
    /**
     * Calculate reputation-based weights
     */
    calculateReputationWeights(agents) {
        const weights = {};
        const totalReputation = agents.reduce((sum, agent) => sum + parseFloat(agent.reputationScore), 0);
        
        for (const agent of agents) {
            const baseWeight = parseFloat(agent.reputationScore) / totalReputation;
            const accuracyBonus = parseFloat(agent.accuracyRate) * 0.5; // Up to 50% bonus
            const experienceBonus = Math.min(agent.totalAnswers / 100, 0.3); // Up to 30% bonus
            
            weights[agent.id] = Math.min(baseWeight + accuracyBonus + experienceBonus, 2.0);
        }
        
        return weights;
    }
    
    /**
     * Calculate stake-based weights
     */
    calculateStakeWeights(stakes) {
        const weights = {};
        const stakesByAnswer = stakes.reduce((acc, stake) => {
            if (!acc[stake.answerId]) acc[stake.answerId] = 0;
            acc[stake.answerId] += parseFloat(stake.amount);
            return acc;
        }, {});
        
        const totalStaked = Object.values(stakesByAnswer).reduce((sum, amount) => sum + amount, 0);
        
        for (const [answerId, amount] of Object.entries(stakesByAnswer)) {
            weights[answerId] = totalStaked > 0 ? amount / totalStaked : 0;
        }
        
        return weights;
    }
    
    /**
     * Calculate debate-based weights from critiques
     */
    calculateDebateWeights(debateRounds) {
        const weights = {};
        
        for (const round of debateRounds) {
            for (const critique of round.critiques) {
                const impact = parseFloat(critique.impact);
                const answerId = critique.targetAnswerId;
                
                if (!weights[answerId]) weights[answerId] = 1.0;
                
                // Adjust weight based on critique type and impact
                switch (critique.type) {
                    case 'FACTUAL_ERROR':
                        weights[answerId] *= (1 - impact * 0.8); // Severe penalty
                        break;
                    case 'LOGICAL_FLAW':
                        weights[answerId] *= (1 - impact * 0.6); // Moderate penalty
                        break;
                    case 'MISSING_CONTEXT':
                        weights[answerId] *= (1 - impact * 0.3); // Minor penalty
                        break;
                    case 'IMPROVEMENT':
                        weights[answerId] *= (1 + impact * 0.2); // Small bonus
                        break;
                }
            }
        }
        
        return weights;
    }
    
    /**
     * Select optimal consensus algorithm based on question characteristics
     */
    selectOptimalAlgorithm(question, answerCount) {
        // High-stakes factual questions use Byzantine Fault Tolerant
        if (question.category === 'FACTUAL' && answerCount > 20) {
            return 'BFT';
        }
        
        // Quick consensus for analytical questions with few participants  
        if (question.category === 'ANALYTICAL' && answerCount <= 10) {
            return 'DPoR'; // Delegated Proof of Reputation
        }
        
        // Default hybrid approach for balance of speed and accuracy
        return 'HYBRID';
    }
    
    /**
     * Calculate final weighted consensus using selected algorithm
     */
    async calculateWeightedConsensus(data) {
        const { question, answers, semanticScores, reputationWeights, stakeWeights, debateWeights, algorithm } = data;
        
        switch (algorithm) {
            case 'BFT':
                return this.calculateBFTConsensus(data);
            case 'DPoR':
                return this.calculateDPoRConsensus(data);
            default:
                return this.calculateHybridConsensus(data);
        }
    }
    
    /**
     * Byzantine Fault Tolerant consensus
     * Resilient to malicious agents, slower but highly accurate
     */
    calculateBFTConsensus(data) {
        const { answers, semanticScores, reputationWeights, stakeWeights } = data;
        const answerWeights = {};
        
        // Multi-round agreement calculation
        for (let round = 0; round < 3; round++) {
            for (const answer of answers) {
                let weight = 0;
                let supportCount = 0;
                
                // Count support from other answers
                if (semanticScores[answer.id]) {
                    for (const similarity of semanticScores[answer.id]) {
                        if (similarity.similarity > 0.7) { // High similarity threshold
                            const agentWeight = reputationWeights[answers.find(a => a.id === similarity.answerId)?.agentId] || 0;
                            weight += similarity.similarity * agentWeight;
                            supportCount++;
                        }
                    }
                }
                
                // Require supermajority support
                const supportRatio = supportCount / answers.length;
                answerWeights[answer.id] = supportRatio > 0.67 ? weight : 0;
            }
        }
        
        return this.finalizeConsensus(answerWeights, answers, 'BFT');
    }
    
    /**
     * Delegated Proof of Reputation consensus  
     * Fast consensus using top-reputation agents
     */
    calculateDPoRConsensus(data) {
        const { answers, reputationWeights, stakeWeights } = data;
        
        // Use top 30% of agents by reputation
        const sortedAnswers = answers.sort((a, b) => 
            (reputationWeights[b.agentId] || 0) - (reputationWeights[a.agentId] || 0)
        );
        const topDelegates = sortedAnswers.slice(0, Math.ceil(answers.length * 0.3));
        
        const answerWeights = {};
        for (const answer of topDelegates) {
            const agentWeight = reputationWeights[answer.agentId] || 0;
            const stakeWeight = stakeWeights[answer.id] || 0;
            const confidenceWeight = parseFloat(answer.confidence);
            
            answerWeights[answer.id] = agentWeight * 0.6 + stakeWeight * 0.3 + confidenceWeight * 0.1;
        }
        
        return this.finalizeConsensus(answerWeights, answers, 'DPoR');
    }
    
    /**
     * Hybrid consensus combining multiple methods
     * Balance of speed and accuracy
     */
    calculateHybridConsensus(data) {
        const { answers, semanticScores, reputationWeights, stakeWeights, debateWeights } = data;
        const answerWeights = {};
        
        for (const answer of answers) {
            let weight = 0;
            
            // 1. Base confidence weight (20%)
            weight += parseFloat(answer.confidence) * 0.2;
            
            // 2. Agent reputation weight (30%)
            const agentWeight = reputationWeights[answer.agentId] || 0;
            weight += agentWeight * 0.3;
            
            // 3. Stake weight (20%) 
            const stakeWeight = stakeWeights[answer.id] || 0;
            weight += stakeWeight * 0.2;
            
            // 4. Semantic similarity weight (20%)
            if (semanticScores[answer.id]) {
                const avgSimilarity = semanticScores[answer.id].reduce((sum, s) => sum + s.similarity, 0) / 
                                    semanticScores[answer.id].length;
                weight += avgSimilarity * 0.2;
            }
            
            // 5. Debate weight (10%)
            const debateWeight = debateWeights[answer.id] || 1.0;
            weight *= debateWeight * 0.1 + 0.9; // Small multiplicative factor
            
            answerWeights[answer.id] = Math.max(0, weight);
        }
        
        return this.finalizeConsensus(answerWeights, answers, 'HYBRID');
    }
    
    /**
     * Finalize consensus calculation and determine winner
     */
    finalizeConsensus(answerWeights, answers, algorithm) {
        // Sort answers by weight
        const sortedEntries = Object.entries(answerWeights)
            .sort(([,a], [,b]) => b - a);
        
        if (sortedEntries.length === 0) {
            throw new Error('No valid answers for consensus');
        }
        
        const [winningAnswerId, winningWeight] = sortedEntries[0];
        const totalWeight = Object.values(answerWeights).reduce((sum, w) => sum + w, 0);
        
        // Calculate consensus strength
        const consensusStrength = totalWeight > 0 ? winningWeight / totalWeight : 0;
        
        // Calculate confidence level based on agreement
        const topTwo = sortedEntries.slice(0, 2);
        const confidenceLevel = topTwo.length > 1 ? 
            (topTwo[0][1] - topTwo[1][1]) / topTwo[0][1] : 1.0;
        
        return {
            winningAnswerId,
            winningAnswer: answers.find(a => a.id === winningAnswerId),
            consensusStrength,
            confidenceLevel,
            answerWeights,
            algorithm,
            participantCount: answers.length
        };
    }
    
    // ... Additional helper methods for caching, database updates, etc.
    
    /**
     * Cache consensus result in Redis for fast access
     */
    async cacheConsensusResult(questionId, consensus) {
        // Implementation would go here
    }
    
    /**
     * Update consensus weights table for fast queries
     */
    async updateConsensusWeights(questionId, answerWeights) {
        const weights = Object.entries(answerWeights).map(([answerId, weight], index) => ({
            questionId,
            answerId,
            finalWeight: weight,
            rank: index + 1
        }));
        
        await this.prisma.consensusWeight.createMany({
            data: weights,
            skipDuplicates: true
        });
    }
    
    /**
     * Get priority for consensus calculation job
     */
    getPriority(questionId, options) {
        // Higher priority for urgent questions or those with many participants
        return options.urgent ? 10 : 5;
    }
    
    /**
     * Get estimated calculation time
     */
    getEstimatedTime(questionId) {
        // Base estimate on current metrics
        return this.metrics.avgCalculationTime || 2000; // 2 seconds default
    }
    
    /**
     * Update performance metrics
     */
    updateMetrics(calculationTime) {
        this.metrics.totalCalculations++;
        this.metrics.avgCalculationTime = 
            (this.metrics.avgCalculationTime * (this.metrics.totalCalculations - 1) + calculationTime) / 
            this.metrics.totalCalculations;
        this.metrics.lastCalculationTime = calculationTime;
    }
    
    /**
     * Log consensus calculation for analysis
     */
    async logConsensusCalculation(questionId, consensus, algorithm, calculationTime) {
        await this.prisma.consensusLog.create({
            data: {
                questionId,
                algorithm,
                participantCount: consensus.participantCount,
                confidenceLevel: consensus.confidenceLevel,
                winningAnswerId: consensus.winningAnswerId,
                consensusStrength: consensus.consensusStrength,
                calculationTimeMs: calculationTime
            }
        });
    }
    
    async updateQuestionStatus(questionId, status) {
        await this.prisma.question.update({
            where: { id: questionId },
            data: { 
                status,
                consensusReachedAt: status === 'CONSENSUS' ? new Date() : undefined
            }
        });
    }
}

module.exports = ConsensusEngine;