/**
 * SwarmOracle Backend - Optimized Entry Point
 * Collective Intelligence Q&A API
 * Optimized for 10,000+ concurrent agents with <2s consensus calculations
 */

// Use optimized application
module.exports = require('./app-optimized');

// If running directly, start the optimized server
if (require.main === module) {
    console.log('🚀 Starting SwarmOracle Optimized Backend...');
    // The optimized app automatically starts the server
}

// Routes
const agentRoutes = require('./routes/agents');
const questionRoutes = require('./routes/questions');
const answerRoutes = require('./routes/answers');
const consensusRoutes = require('./routes/consensus');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'swarm-oracle',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/agents', agentRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/consensus', consensusRoutes);

// Leaderboard shortcut
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const agents = await prisma.agent.findMany({
      take: limit,
      orderBy: { reputationScore: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        reputationScore: true,
        totalAnswers: true,
        correctAnswers: true,
        accuracyRate: true,
        totalEarned: true,
      }
    });
    res.json({ success: true, agents });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Internal server error' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Not found',
    hint: 'Check the API docs at /api/docs'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔮 SwarmOracle API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
