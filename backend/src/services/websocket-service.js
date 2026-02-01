/**
 * Optimized WebSocket Service for SwarmOracle
 * Real-time updates with batching and performance optimization
 * Target: <100ms update latency for 10,000+ concurrent agents
 */

const { Server } = require('socket.io');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');

class SwarmOracleWebSocketService {
    constructor(httpServer) {
        this.io = new Server(httpServer, {
            cors: { origin: "*" },
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000
        });
        
        this.redis = new Redis(process.env.REDIS_URL);
        
        // Performance optimization: batch updates
        this.updateBatches = new Map();
        this.batchTimeout = 100; // ms
        this.compressionThreshold = 1024; // bytes
        
        // Connection tracking
        this.agentConnections = new Map();
        this.questionSubscriptions = new Map();
        this.metrics = {
            totalConnections: 0,
            activeConnections: 0,
            messagesPerSecond: 0,
            avgLatency: 0
        };
        
        this.setupEventHandlers();
        this.setupRedisSubscriptions();
        this.startMetricsCollection();
    }
    
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.metrics.activeConnections++;
            console.log(`New connection: ${socket.id}, total: ${this.metrics.activeConnections}`);
            
            // Authentication for agents
            socket.on('auth:agent', async (data) => {
                try {
                    const { apiKey, agentId } = data;
                    const agent = await this.authenticateAgent(apiKey, agentId);
                    
                    if (agent) {
                        socket.agentId = agent.id;
                        socket.agentName = agent.name;
                        socket.reputation = agent.reputationScore;
                        socket.join(`agent:${agent.id}`);
                        
                        this.agentConnections.set(agent.id, {
                            socketId: socket.id,
                            connectedAt: new Date(),
                            lastActivity: new Date()
                        });
                        
                        socket.emit('auth:success', {
                            agentId: agent.id,
                            reputation: agent.reputationScore,
                            capabilities: agent.capabilities
                        });
                        
                        console.log(`Agent ${agent.name} authenticated successfully`);
                    } else {
                        socket.emit('auth:failed', { message: 'Invalid credentials' });
                    }
                } catch (error) {
                    console.error('Authentication failed:', error);
                    socket.emit('auth:failed', { message: 'Authentication error' });
                }
            });
            
            // Subscribe to question updates
            socket.on('subscribe:question', (data) => {
                const { questionId } = data;
                socket.join(`question:${questionId}`);
                
                // Track subscriptions for metrics
                if (!this.questionSubscriptions.has(questionId)) {
                    this.questionSubscriptions.set(questionId, new Set());
                }
                this.questionSubscriptions.get(questionId).add(socket.id);
                
                console.log(`Socket ${socket.id} subscribed to question ${questionId}`);
            });
            
            // Subscribe to leaderboard updates
            socket.on('subscribe:leaderboard', () => {
                socket.join('leaderboard');
                console.log(`Socket ${socket.id} subscribed to leaderboard`);
            });
            
            // Subscribe to global updates
            socket.on('subscribe:global', () => {
                socket.join('global');
            });
            
            // Handle agent answer submissions (real-time feedback)
            socket.on('answer:submit', async (data) => {
                try {
                    // Validate and process answer
                    const result = await this.handleAnswerSubmission(socket.agentId, data);
                    
                    // Immediate feedback to submitter
                    socket.emit('answer:submitted', {
                        success: true,
                        answerId: result.id,
                        timestamp: new Date()
                    });
                    
                    // Broadcast to question subscribers
                    this.broadcastAnswerSubmitted(data.questionId, {
                        answerId: result.id,
                        agentName: socket.agentName,
                        confidence: data.confidence,
                        timestamp: new Date()
                    });
                    
                } catch (error) {
                    socket.emit('answer:error', {
                        message: error.message,
                        timestamp: new Date()
                    });
                }
            });
            
            // Handle disconnection
            socket.on('disconnect', () => {
                this.metrics.activeConnections--;
                
                if (socket.agentId) {
                    this.agentConnections.delete(socket.agentId);
                    console.log(`Agent ${socket.agentName} disconnected`);
                }
                
                // Clean up subscriptions
                for (const [questionId, subscribers] of this.questionSubscriptions.entries()) {
                    subscribers.delete(socket.id);
                    if (subscribers.size === 0) {
                        this.questionSubscriptions.delete(questionId);
                    }
                }
                
                console.log(`Connection closed: ${socket.id}, remaining: ${this.metrics.activeConnections}`);
            });
            
            // Heartbeat for connection health
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: Date.now() });
                
                if (socket.agentId) {
                    const connection = this.agentConnections.get(socket.agentId);
                    if (connection) {
                        connection.lastActivity = new Date();
                    }
                }
            });
        });
    }
    
    /**
     * Setup Redis pub/sub for cross-service communication
     */
    setupRedisSubscriptions() {
        const subscriber = new Redis(process.env.REDIS_URL);
        
        subscriber.subscribe('swarm:events');
        
        subscriber.on('message', (channel, message) => {
            if (channel === 'swarm:events') {
                try {
                    const event = JSON.parse(message);
                    this.handleRedisEvent(event);
                } catch (error) {
                    console.error('Failed to parse Redis event:', error);
                }
            }
        });
    }
    
    /**
     * Handle events from other services via Redis
     */
    handleRedisEvent(event) {
        switch (event.type) {
            case 'answer:submitted':
                this.broadcastAnswerSubmitted(event.questionId, event.data);
                break;
            case 'consensus:calculated':
                this.broadcastConsensusReached(event.questionId, event.data);
                break;
            case 'question:created':
                this.broadcastNewQuestion(event.data);
                break;
            case 'leaderboard:updated':
                this.broadcastLeaderboardUpdate(event.data);
                break;
            case 'agent:reputation:updated':
                this.broadcastReputationUpdate(event.agentId, event.data);
                break;
        }
    }
    
    /**
     * Optimized broadcasting with batching and compression
     */
    scheduleUpdate(roomId, updateType, data) {
        const updateKey = `${roomId}:${updateType}`;
        
        if (!this.updateBatches.has(updateKey)) {
            this.updateBatches.set(updateKey, []);
            
            // Schedule batch send
            setTimeout(() => {
                const batch = this.updateBatches.get(updateKey);
                if (batch && batch.length > 0) {
                    this.sendBatchedUpdates(roomId, updateType, batch);
                    this.updateBatches.delete(updateKey);
                }
            }, this.batchTimeout);
        }
        
        this.updateBatches.get(updateKey).push({
            ...data,
            timestamp: Date.now()
        });
    }
    
    /**
     * Send batched updates with deduplication and compression
     */
    sendBatchedUpdates(roomId, updateType, updates) {
        // Deduplicate updates for same entity
        const optimized = this.deduplicateUpdates(updates);
        
        const payload = {
            type: `batch:${updateType}`,
            updates: optimized,
            count: optimized.length,
            timestamp: Date.now()
        };
        
        // Compress large payloads
        const serialized = JSON.stringify(payload);
        if (serialized.length > this.compressionThreshold) {
            // Could implement compression here
            console.log(`Large payload (${serialized.length} bytes) for room ${roomId}`);
        }
        
        this.io.to(roomId).emit('batch_update', payload);
        this.metrics.messagesPerSecond++;
    }
    
    /**
     * Remove duplicate updates for same entity
     */
    deduplicateUpdates(updates) {
        const latest = new Map();
        
        updates.forEach(update => {
            const key = update.id || update.answerId || update.agentId || 'global';
            if (!latest.has(key) || latest.get(key).timestamp < update.timestamp) {
                latest.set(key, update);
            }
        });
        
        return Array.from(latest.values());
    }
    
    /**
     * Broadcast new answer submission
     */
    broadcastAnswerSubmitted(questionId, answerData) {
        this.scheduleUpdate(`question:${questionId}`, 'answer', {
            type: 'answer:submitted',
            ...answerData
        });
        
        // Also notify global subscribers
        this.scheduleUpdate('global', 'activity', {
            type: 'answer:submitted',
            questionId,
            agentName: answerData.agentName,
            timestamp: answerData.timestamp
        });
    }
    
    /**
     * Broadcast consensus reached
     */
    broadcastConsensusReached(questionId, consensusData) {
        const payload = {
            type: 'consensus:reached',
            questionId,
            winningAnswer: consensusData.winningAnswer,
            consensusStrength: consensusData.consensusStrength,
            confidenceLevel: consensusData.confidenceLevel,
            participantCount: consensusData.participantCount,
            algorithm: consensusData.algorithm,
            timestamp: new Date()
        };
        
        // Immediate broadcast (don't batch consensus results)
        this.io.to(`question:${questionId}`).emit('consensus:reached', payload);
        this.io.to('global').emit('consensus:reached', payload);
        
        console.log(`Consensus reached for question ${questionId}`);
    }
    
    /**
     * Broadcast new question to relevant agents
     */
    broadcastNewQuestion(questionData) {
        // Send to agents based on their capabilities
        this.agentConnections.forEach((connection, agentId) => {
            // Could filter by agent capabilities here
            this.io.to(`agent:${agentId}`).emit('question:new', {
                type: 'question:new',
                question: questionData,
                timestamp: new Date()
            });
        });
        
        // Also broadcast globally
        this.scheduleUpdate('global', 'question', {
            type: 'question:new',
            question: questionData
        });
    }
    
    /**
     * Broadcast leaderboard updates
     */
    broadcastLeaderboardUpdate(leaderboardData) {
        this.scheduleUpdate('leaderboard', 'leaderboard', {
            type: 'leaderboard:updated',
            leaderboard: leaderboardData
        });
    }
    
    /**
     * Broadcast agent reputation updates
     */
    broadcastReputationUpdate(agentId, reputationData) {
        // Notify the specific agent
        this.io.to(`agent:${agentId}`).emit('reputation:updated', {
            type: 'reputation:updated',
            newReputation: reputationData.newReputation,
            change: reputationData.change,
            reason: reputationData.reason,
            timestamp: new Date()
        });
        
        // Update leaderboard if this affects rankings
        this.scheduleUpdate('leaderboard', 'reputation', {
            agentId,
            newReputation: reputationData.newReputation,
            change: reputationData.change
        });
    }
    
    /**
     * Authenticate agent using JWT token
     */
    async authenticateAgent(apiKey, agentId) {
        try {
            const decoded = jwt.verify(apiKey, process.env.JWT_SECRET);
            
            if (decoded.sub !== agentId) {
                throw new Error('Agent ID mismatch');
            }
            
            return {
                id: decoded.sub,
                name: decoded.name,
                reputationScore: decoded.reputation,
                capabilities: decoded.capabilities
            };
            
        } catch (error) {
            console.error('JWT verification failed:', error);
            return null;
        }
    }
    
    /**
     * Handle answer submission from WebSocket
     */
    async handleAnswerSubmission(agentId, answerData) {
        // This would integrate with your answer service
        // For now, just return a mock response
        return {
            id: `answer_${Date.now()}`,
            agentId,
            questionId: answerData.questionId,
            content: answerData.content,
            confidence: answerData.confidence,
            timestamp: new Date()
        };
    }
    
    /**
     * Get real-time connection statistics
     */
    getConnectionStats() {
        return {
            totalConnections: this.metrics.totalConnections,
            activeConnections: this.metrics.activeConnections,
            agentConnections: this.agentConnections.size,
            questionSubscriptions: this.questionSubscriptions.size,
            messagesPerSecond: this.metrics.messagesPerSecond,
            avgLatency: this.metrics.avgLatency
        };
    }
    
    /**
     * Start collecting metrics
     */
    startMetricsCollection() {
        setInterval(() => {
            // Reset per-second counters
            this.metrics.messagesPerSecond = 0;
            
            // Update total connections
            this.metrics.totalConnections = this.io.engine.clientsCount;
            
            // Log metrics periodically
            if (this.metrics.activeConnections > 0) {
                console.log(`WebSocket Metrics: ${this.metrics.activeConnections} active, ${this.agentConnections.size} agents`);
            }
        }, 1000);
        
        // Health check for stale connections
        setInterval(() => {
            const now = new Date();
            const staleThreshold = 5 * 60 * 1000; // 5 minutes
            
            for (const [agentId, connection] of this.agentConnections.entries()) {
                if (now - connection.lastActivity > staleThreshold) {
                    console.log(`Removing stale connection for agent ${agentId}`);
                    this.agentConnections.delete(agentId);
                }
            }
        }, 60000); // Check every minute
    }
    
    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('Shutting down WebSocket service...');
        
        // Notify all connected agents
        this.io.emit('server:shutdown', {
            message: 'Server is shutting down',
            timestamp: new Date()
        });
        
        // Wait a bit for messages to be sent
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Close all connections
        this.io.close();
        
        // Close Redis connection
        this.redis.disconnect();
        
        console.log('WebSocket service shutdown complete');
    }
}

module.exports = SwarmOracleWebSocketService;