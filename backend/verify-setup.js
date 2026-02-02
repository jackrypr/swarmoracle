#!/usr/bin/env node

// SwarmOracle Backend Setup Verification
// Checks if all required files exist and are properly configured

import fs from 'fs';
import path from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function success(msg) {
    console.log(`${GREEN}✅ ${msg}${RESET}`);
}

function error(msg) {
    console.log(`${RED}❌ ${msg}${RESET}`);
}

function warning(msg) {
    console.log(`${YELLOW}⚠️  ${msg}${RESET}`);
}

function info(msg) {
    console.log(`📝 ${msg}`);
}

const requiredFiles = [
    'package.json',
    'src/server.js',
    'src/lib/prisma.js',
    'src/lib/redis.js',
    'src/middleware/auth.js',
    'src/middleware/errorHandler.js',
    'src/routes/health.js',
    'src/routes/questions.js',
    'src/routes/answers.js',
    'src/routes/agents.js',
    'src/routes/consensus.js',
    'src/routes/debate.js',
    'src/validation/schemas.js',
    'prisma/schema.prisma',
    '.env.example',
    'Dockerfile',
    'railway.json'
];

const optionalFiles = [
    '.env',
    'README.md',
    'test-api.sh'
];

function checkFileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (err) {
        return false;
    }
}

function checkPackageJson() {
    try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        const requiredDeps = [
            'express', 'cors', 'helmet', 'jsonwebtoken', 'bcryptjs',
            'zod', 'redis', '@prisma/client', 'dotenv', 'express-rate-limit'
        ];
        
        const requiredDevDeps = ['prisma'];
        
        const missingDeps = requiredDeps.filter(dep => !pkg.dependencies?.[dep]);
        const missingDevDeps = requiredDevDeps.filter(dep => !pkg.devDependencies?.[dep]);
        
        if (missingDeps.length === 0 && missingDevDeps.length === 0) {
            success('All required dependencies found in package.json');
        } else {
            error(`Missing dependencies: ${[...missingDeps, ...missingDevDeps].join(', ')}`);
        }
        
        return missingDeps.length === 0 && missingDevDeps.length === 0;
    } catch (err) {
        error(`Error reading package.json: ${err.message}`);
        return false;
    }
}

function checkPrismaSchema() {
    try {
        const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
        
        // Check for required models
        const requiredModels = [
            'Agent', 'Question', 'Answer', 'Stake', 'DebateRound', 'Critique', 'ConsensusLog'
        ];
        
        const missingModels = requiredModels.filter(model => !schema.includes(`model ${model}`));
        
        if (missingModels.length === 0) {
            success('All required Prisma models found');
        } else {
            error(`Missing Prisma models: ${missingModels.join(', ')}`);
        }
        
        return missingModels.length === 0;
    } catch (err) {
        error(`Error reading Prisma schema: ${err.message}`);
        return false;
    }
}

function checkEnvironmentExample() {
    try {
        const envExample = fs.readFileSync('.env.example', 'utf8');
        
        const requiredVars = [
            'DATABASE_URL', 'JWT_SECRET', 'PORT', 'NODE_ENV'
        ];
        
        const missingVars = requiredVars.filter(varName => !envExample.includes(varName));
        
        if (missingVars.length === 0) {
            success('All required environment variables found in .env.example');
        } else {
            error(`Missing environment variables in .env.example: ${missingVars.join(', ')}`);
        }
        
        return missingVars.length === 0;
    } catch (err) {
        error(`Error reading .env.example: ${err.message}`);
        return false;
    }
}

function main() {
    console.log('🚀 SwarmOracle Backend Setup Verification');
    console.log('==========================================\n');
    
    // Check required files
    info('Checking required files...');
    let allFilesExist = true;
    
    requiredFiles.forEach(file => {
        if (checkFileExists(file)) {
            success(`${file} exists`);
        } else {
            error(`${file} missing`);
            allFilesExist = false;
        }
    });
    
    console.log();
    
    // Check optional files
    info('Checking optional files...');
    optionalFiles.forEach(file => {
        if (checkFileExists(file)) {
            success(`${file} exists`);
        } else {
            warning(`${file} missing (optional)`);
        }
    });
    
    console.log();
    
    // Detailed checks
    info('Running detailed checks...');
    const packageJsonOk = checkPackageJson();
    const prismaSchemaOk = checkPrismaSchema();
    const envExampleOk = checkEnvironmentExample();
    
    console.log();
    
    // Summary
    const allChecksPass = allFilesExist && packageJsonOk && prismaSchemaOk && envExampleOk;
    
    if (allChecksPass) {
        success('🎉 All checks passed! SwarmOracle backend is ready to deploy.');
        console.log();
        info('Next steps:');
        console.log('1. Set up your database (PostgreSQL)');
        console.log('2. Configure environment variables (.env)');
        console.log('3. Run: npm install');
        console.log('4. Run: npm run db:generate');
        console.log('5. Run: npm run db:push');
        console.log('6. Run: npm start');
        console.log();
        info('For testing: ./test-api.sh (after server is running)');
    } else {
        error('❌ Some checks failed. Please fix the issues above before deploying.');
    }
    
    console.log('\n📊 Setup Status:');
    console.log(`Files: ${allFilesExist ? 'OK' : 'ISSUES'}`);
    console.log(`Dependencies: ${packageJsonOk ? 'OK' : 'ISSUES'}`);
    console.log(`Prisma Schema: ${prismaSchemaOk ? 'OK' : 'ISSUES'}`);
    console.log(`Environment: ${envExampleOk ? 'OK' : 'ISSUES'}`);
}

// Run verification
main();