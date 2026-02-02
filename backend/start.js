#!/usr/bin/env node
/**
 * SwarmOracle Production Entry Point
 * Explicitly starts the server for Railway deployment
 */

console.log('🚀 Starting SwarmOracle Backend...');
console.log('📋 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Port:', process.env.PORT || 3000);
console.log('🔧 Redis URL:', process.env.REDIS_URL ? 'configured' : 'NOT SET - using fallback mode');

// Use full features if Redis available, otherwise use basic mode
if (process.env.REDIS_URL && process.env.OPENAI_API_KEY) {
    console.log('✅ Full mode: Redis + Consensus engine enabled');
    require('./src/app-optimized');
} else {
    console.log('⚠️  Fallback mode: Basic API without Redis/consensus');
    require('./src/app-optimized-no-redis');
}
