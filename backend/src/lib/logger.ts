import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

// Environment-based log level
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create Pino logger with optimal configuration
const logger = pino({
  level: LOG_LEVEL,
  
  // Production formatting (structured JSON)
  ...(process.env.NODE_ENV === 'production' ? {
    formatters: {
      level: (label) => {
        return { level: label };
      },
      log: (object) => {
        const { req, res, ...rest } = object;
        return rest;
      }
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'password',
        'token',
        'authorization',
        'cookie',
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.token'
      ],
      remove: true
    }
  } : {
    // Development formatting (pretty print)
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        messageFormat: '[{req.method} {req.url}] {msg}'
      }
    }
  }),

  // Base context
  base: {
    service: 'swarm-oracle-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },

  // Serializers for request/response objects
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type']
      },
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': res.getHeader('content-type'),
        'cache-control': res.getHeader('cache-control')
      }
    }),
    err: pino.stdSerializers.err
  }
});

// Request correlation middleware
export const correlationMiddleware = (req: any, res: any, next: any) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Add correlation ID to all logs in this request
  req.log = logger.child({ correlationId, requestId: correlationId });
  
  next();
};

// Request logging middleware
export const requestLoggingMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  // Log incoming request
  req.log.info({
    req,
    message: 'Incoming request'
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    req.log.info({
      res,
      duration,
      message: 'Request completed'
    });
  });

  next();
};

// Error logging middleware
export const errorLoggingMiddleware = (err: any, req: any, res: any, next: any) => {
  const logger = req.log || logger;
  
  // Log the error
  logger.error({
    err,
    req,
    message: err.message || 'Unhandled error'
  });

  // Send error response (don't expose internal errors in production)
  if (process.env.NODE_ENV === 'production') {
    res.status(err.status || 500).json({
      error: err.status < 500 ? err.message : 'Internal Server Error',
      correlationId: req.correlationId
    });
  } else {
    res.status(err.status || 500).json({
      error: err.message,
      stack: err.stack,
      correlationId: req.correlationId
    });
  }
};

// Security event logger
export const logSecurityEvent = (event: string, details: Record<string, any>) => {
  logger.warn({
    event: 'security',
    type: event,
    ...details,
    timestamp: new Date().toISOString()
  }, `Security event: ${event}`);
};

// Performance monitoring
export const performanceLogger = (operation: string, duration: number, metadata?: Record<string, any>) => {
  logger.info({
    event: 'performance',
    operation,
    duration,
    ...metadata
  }, `Operation completed: ${operation} (${duration}ms)`);
};

// Database operation logger
export const logDatabaseOperation = (operation: string, table?: string, duration?: number) => {
  logger.debug({
    event: 'database',
    operation,
    table,
    duration
  }, `Database operation: ${operation}${table ? ` on ${table}` : ''}${duration ? ` (${duration}ms)` : ''}`);
};

// Health check logger
export const logHealthCheck = (status: 'healthy' | 'unhealthy', checks: Record<string, boolean>) => {
  const level = status === 'healthy' ? 'info' : 'error';
  
  logger[level]({
    event: 'health_check',
    status,
    checks,
    timestamp: new Date().toISOString()
  }, `Health check: ${status}`);
};

// Startup logger
export const logStartup = (port: number, environment: string) => {
  logger.info({
    event: 'startup',
    port,
    environment,
    pid: process.pid,
    nodeVersion: process.version
  }, `🚀 SwarmOracle API started on port ${port} (${environment})`);
};

// Graceful shutdown logger
export const logShutdown = (signal: string) => {
  logger.info({
    event: 'shutdown',
    signal,
    timestamp: new Date().toISOString()
  }, `📴 SwarmOracle API shutting down (${signal})`);
};

export default logger;

// Types for TypeScript users
export interface LogContext {
  correlationId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface SecurityEventDetails {
  ip?: string;
  userAgent?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  reason?: string;
}