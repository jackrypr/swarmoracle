#!/usr/bin/env node
/**
 * SwarmOracle Production Entry Point - FIXED VERSION
 * Enhanced Railway deployment with better database connection handling
 */

console.log('🚀 Starting SwarmOracle Backend (Fixed Version)...');
console.log('📋 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Port:', process.env.PORT || 8080);

// Enhanced environment diagnostics
console.log('🔧 Environment Variables:');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ NOT SET');
console.log('   REDIS_URL:', process.env.REDIS_URL ? '✅ Set' : '❌ NOT SET');
console.log('   OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ NOT SET');

// Validate critical environment variables
if (!process.env.DATABASE_URL) {
    console.error('❌ CRITICAL: DATABASE_URL environment variable is not set!');
    console.error('   This should be set to: ${{Postgres.DATABASE_URL}} in Railway');
    process.exit(1);
}

// Log the DATABASE_URL format (without password) for debugging
const dbUrl = process.env.DATABASE_URL;
const urlParts = dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://[USER]:[PASS]@');
console.log('🗄️ Database URL format:', urlParts);

// Enhanced mode selection
if (process.env.REDIS_URL && process.env.OPENAI_API_KEY) {
    console.log('✅ Full mode: Redis + Consensus engine enabled');
    import('./src/app-optimized.js');
} else if (process.env.REDIS_URL) {
    console.log('⚠️  Partial mode: Redis available but missing OpenAI API key');
    import('./src/app-optimized-no-redis-fixed.js');
} else {
    console.log('⚠️  Fallback mode: Basic API without Redis/consensus (using fixed version)');
    import('./src/app-optimized-no-redis-fixed.js');
}