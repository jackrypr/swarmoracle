import { PrismaClient } from '@prisma/client';

class PrismaClientSingleton {
  constructor() {
    if (!PrismaClientSingleton.instance) {
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        errorFormat: 'pretty',
      });
      
      PrismaClientSingleton.instance = this;
    }
    
    return PrismaClientSingleton.instance;
  }

  async connect() {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
    console.log('📡 Database disconnected');
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString() 
      };
    }
  }

  // Connection retry logic
  async connectWithRetry(maxRetries = 5, delay = 5000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const connected = await this.connect();
      if (connected) return true;

      if (attempt < maxRetries) {
        console.log(`⏳ Retrying connection in ${delay/1000}s (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // Exponential backoff
      }
    }
    
    console.error('❌ Failed to connect after', maxRetries, 'attempts');
    return false;
  }
}

// Create singleton instance
const prismaClient = new PrismaClientSingleton();

// Handle graceful shutdown
process.on('beforeExit', () => {
  prismaClient.disconnect();
});

process.on('SIGINT', () => {
  prismaClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  prismaClient.disconnect();
  process.exit(0);
});

export const prisma = prismaClient.prisma;
export default prismaClient;