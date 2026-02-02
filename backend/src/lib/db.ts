import { PrismaClient } from '@prisma/client';
import { createPool, Pool } from 'generic-pool';

declare global {
  // Allow global `var` declarations
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Connection pool configuration
interface PoolConfig {
  max?: number;
  min?: number;
  acquireTimeoutMillis?: number;
  createTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  reapIntervalMillis?: number;
  createRetryIntervalMillis?: number;
  maxUses?: number;
}

const defaultPoolConfig: PoolConfig = {
  max: 20,              // Maximum number of connections
  min: 5,               // Minimum number of connections
  acquireTimeoutMillis: 30000,  // 30 seconds
  createTimeoutMillis: 10000,   // 10 seconds
  idleTimeoutMillis: 300000,    // 5 minutes
  reapIntervalMillis: 60000,    // 1 minute
  createRetryIntervalMillis: 2000,  // 2 seconds
  maxUses: 1000,        // Max uses before connection refresh
};

// Prisma client configuration
const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    errorFormat: 'pretty',
  });
};

// Global prisma instance (for development)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Connection pool for high-load scenarios
let connectionPool: Pool<PrismaClient> | null = null;

const createConnectionPool = (config: PoolConfig = {}): Pool<PrismaClient> => {
  const poolConfig = { ...defaultPoolConfig, ...config };
  
  return createPool(
    {
      create: async () => {
        const client = createPrismaClient();
        await client.$connect();
        return client;
      },
      destroy: async (client: PrismaClient) => {
        await client.$disconnect();
      },
      validate: async (client: PrismaClient) => {
        try {
          await client.$queryRaw`SELECT 1`;
          return true;
        } catch {
          return false;
        }
      }
    },
    poolConfig
  );
};

// Get connection pool instance (singleton)
export const getConnectionPool = (config?: PoolConfig): Pool<PrismaClient> => {
  if (!connectionPool) {
    connectionPool = createConnectionPool(config);
  }
  return connectionPool;
};

// Execute with connection pool
export const withPoolConnection = async <T>(
  operation: (client: PrismaClient) => Promise<T>
): Promise<T> => {
  const pool = getConnectionPool();
  const client = await pool.acquire();
  
  try {
    return await operation(client);
  } finally {
    await pool.release(client);
  }
};

// Retry mechanism for database operations
interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitterMax?: number;
}

const defaultRetryConfig: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,     // 1 second
  maxDelay: 10000,        // 10 seconds
  backoffFactor: 2,       // Exponential backoff
  jitterMax: 1000,        // Max jitter in ms
};

const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

const addJitter = (delay: number, maxJitter: number): number => 
  delay + Math.floor(Math.random() * maxJitter);

export const withRetry = async <T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> => {
  const { maxRetries, initialDelay, maxDelay, backoffFactor, jitterMax } = {
    ...defaultRetryConfig,
    ...config
  };

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt > maxRetries) {
        break;
      }
      
      // Check if error is retryable
      const isRetryable = isRetryableError(error as Error);
      if (!isRetryable) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const baseDelay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );
      const delayWithJitter = addJitter(baseDelay, jitterMax);
      
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries + 1}). Retrying in ${delayWithJitter}ms...`, {
        error: error.message,
        attempt,
        delay: delayWithJitter
      });
      
      await sleep(delayWithJitter);
    }
  }
  
  throw lastError!;
};

// Determine if an error is retryable
const isRetryableError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  
  // Prisma-specific retryable errors
  const retryableErrors = [
    'connection refused',
    'connection timeout',
    'connection lost',
    'connection terminated',
    'connection reset',
    'pool exhausted',
    'connection limit exceeded',
    'server closed the connection',
    'connection is not open',
    'could not connect',
    'network error',
    'timeout',
    'econnrefused',
    'econnreset',
    'enotfound',
    'etimedout',
    'socket hang up'
  ];
  
  return retryableErrors.some(retryableError => 
    message.includes(retryableError)
  );
};

// Database health check
export interface HealthCheckResult {
  healthy: boolean;
  latency?: number;
  error?: string;
  timestamp: Date;
  connectionCount?: number;
}

export const healthCheck = async (): Promise<HealthCheckResult> => {
  const timestamp = new Date();
  const startTime = Date.now();
  
  try {
    // Test basic connectivity
    await prisma.$queryRaw`SELECT 1 as health_check`;
    
    // Test a more complex query
    const agentCount = await prisma.agent.count();
    
    const latency = Date.now() - startTime;
    
    // Get connection pool info if available
    let connectionCount: number | undefined;
    if (connectionPool) {
      connectionCount = connectionPool.size;
    }
    
    return {
      healthy: true,
      latency,
      timestamp,
      connectionCount,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    return {
      healthy: false,
      latency,
      error: (error as Error).message,
      timestamp,
    };
  }
};

// Database connection monitoring
export const getConnectionInfo = async () => {
  try {
    const [connectionInfo, dbSize] = await Promise.all([
      prisma.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      ` as Promise<Array<{
        total_connections: bigint;
        active_connections: bigint; 
        idle_connections: bigint;
      }>>,
      
      prisma.$queryRaw`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      ` as Promise<Array<{ size: string }>>
    ]);
    
    const poolInfo = connectionPool ? {
      size: connectionPool.size,
      available: connectionPool.available,
      pending: connectionPool.pending,
      max: connectionPool.max,
      min: connectionPool.min
    } : null;
    
    return {
      database: {
        totalConnections: Number(connectionInfo[0]?.total_connections ?? 0),
        activeConnections: Number(connectionInfo[0]?.active_connections ?? 0), 
        idleConnections: Number(connectionInfo[0]?.idle_connections ?? 0),
        size: dbSize[0]?.size || 'unknown'
      },
      pool: poolInfo
    };
  } catch (error) {
    throw new Error(`Failed to get connection info: ${(error as Error).message}`);
  }
};

// Graceful shutdown
export const gracefulShutdown = async (): Promise<void> => {
  console.log('🔄 Starting database graceful shutdown...');
  
  try {
    // Close connection pool first
    if (connectionPool) {
      console.log('📦 Closing connection pool...');
      await connectionPool.drain();
      await connectionPool.clear();
      connectionPool = null;
      console.log('✅ Connection pool closed');
    }
    
    // Disconnect main Prisma client
    console.log('🔌 Disconnecting Prisma client...');
    await prisma.$disconnect();
    console.log('✅ Prisma client disconnected');
    
    console.log('🎉 Database shutdown completed');
  } catch (error) {
    console.error('❌ Error during database shutdown:', error);
    throw error;
  }
};

// Utility functions for common operations
export const dbUtils = {
  // Safe transaction wrapper
  transaction: async <T>(
    operations: (tx: PrismaClient) => Promise<T>,
    retryConfig?: RetryConfig
  ): Promise<T> => {
    return withRetry(
      () => prisma.$transaction(operations),
      retryConfig
    );
  },
  
  // Batch operations with automatic chunking
  batchCreate: async <T, D>(
    model: any,
    data: D[],
    chunkSize: number = 1000
  ): Promise<T[]> => {
    const results: T[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkResults = await model.createMany({
        data: chunk,
        skipDuplicates: true
      });
      results.push(...chunkResults);
    }
    
    return results;
  },
  
  // Safe upsert operations
  upsertSafe: async <T>(
    model: any,
    where: any,
    create: any,
    update: any,
    retryConfig?: RetryConfig
  ): Promise<T> => {
    return withRetry(
      () => model.upsert({ where, create, update }),
      retryConfig
    );
  },
};

// Export types for use in other files
export type { PrismaClient } from '@prisma/client';
export { Prisma } from '@prisma/client';

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  process.on('beforeExit', gracefulShutdown);
}