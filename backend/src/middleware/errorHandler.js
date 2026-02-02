import { Prisma } from '@prisma/client';

// Custom error classes
export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  constructor(message = 'Resource already exists') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

export class BusinessLogicError extends Error {
  constructor(message, statusCode = 422) {
    super(message);
    this.name = 'BusinessLogicError';
    this.statusCode = statusCode;
  }
}

// Async error wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('API Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    agent: req.agent?.id || 'unauthenticated',
  });

  // Prisma specific errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        const target = err.meta?.target;
        error = new ConflictError(
          target ? `${target.join(', ')} already exists` : 'Unique constraint violation'
        );
        break;
      case 'P2025':
        // Record not found
        error = new NotFoundError('Record not found');
        break;
      case 'P2003':
        // Foreign key constraint violation
        error = new ValidationError('Invalid reference to related record');
        break;
      case 'P2021':
        // Table does not exist
        error = new Error('Database table does not exist');
        error.statusCode = 500;
        break;
      default:
        error = new Error('Database operation failed');
        error.statusCode = 500;
    }
  }

  // Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    error = new ValidationError('Invalid data provided to database');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ValidationError('Invalid token format');
    error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error = new ValidationError('Token has expired');
    error.statusCode = 401;
  }

  // Mongoose/MongoDB-like cast errors (if needed)
  if (err.name === 'CastError') {
    error = new ValidationError('Invalid ID format');
  }

  // Handle custom error types
  const statusCode = error.statusCode || err.statusCode || 500;

  const response = {
    success: false,
    error: error.message || 'Internal server error',
  };

  // Add additional fields for specific error types
  if (error.details) {
    response.details = error.details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  // Add helpful hints for common errors
  if (statusCode === 404 && req.originalUrl.includes('/api/')) {
    response.hint = 'Check the API endpoint URL and ensure the resource exists';
  }

  if (statusCode === 401) {
    response.hint = 'Ensure you are providing a valid Bearer token in the Authorization header';
  }

  if (statusCode === 429) {
    response.retryAfter = err.retryAfter;
  }

  res.status(statusCode).json(response);
};

// 404 handler for undefined routes
export const notFoundHandler = (req, res) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  
  res.status(404).json({
    success: false,
    error: error.message,
    availableRoutes: {
      health: 'GET /health',
      status: 'GET /api/status',
      questions: 'GET /api/questions',
      agents: 'GET /api/agents',
      // Could add more route hints here
    }
  });
};

// Request logger middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      agent: req.agent?.id || 'unauthenticated',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    };

    // Log different levels based on status code
    if (res.statusCode >= 500) {
      console.error('API Error:', logData);
    } else if (res.statusCode >= 400) {
      console.warn('API Warning:', logData);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', logData);
    }
  });

  next();
};

// Health check for error handling system
export const errorHandlerHealthCheck = () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    errorHandlerVersion: '1.0.0',
  };
};