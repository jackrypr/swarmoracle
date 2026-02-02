import { createClient } from 'redis';

class RedisClientSingleton {
  constructor() {
    if (!RedisClientSingleton.instance) {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      RedisClientSingleton.instance = this;
    }

    return RedisClientSingleton.instance;
  }

  async connect() {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      return true;
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      return false;
    }
  }

  async disconnect() {
    try {
      if (this.client.isOpen) {
        await this.client.disconnect();
      }
      console.log('📡 Redis disconnected');
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }

  async healthCheck() {
    try {
      const pong = await this.client.ping();
      return { 
        status: pong === 'PONG' ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString() 
      };
    }
  }

  // Cache helpers
  async set(key, value, expireInSeconds = 3600) {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await this.client.setEx(key, expireInSeconds, serialized);
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value; // Return as string if not valid JSON
      }
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }
}

// Create singleton instance
const redisClient = new RedisClientSingleton();

// Handle graceful shutdown
process.on('beforeExit', () => {
  redisClient.disconnect();
});

process.on('SIGINT', () => {
  redisClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  redisClient.disconnect();
  process.exit(0);
});

export default redisClient;