#!/usr/bin/env node
/**
 * SwarmOracle Production Entry Point
 * Explicitly starts the server for Railway deployment
 */

console.log('🚀 Starting SwarmOracle Backend...');
console.log('📋 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Port:', process.env.PORT || 3000);

// Import and start the optimized application
require('./src/app-optimized');
