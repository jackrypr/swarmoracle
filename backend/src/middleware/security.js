import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { logSecurityEvent } from '../lib/logger.js';

// Environment configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);

    // Development: Allow localhost
    if (isDevelopment) {
      const allowedDevelopmentOrigins = [
        'http://localhost:3000',
        'http://localhost:5173', // Vite dev server
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
      ];
      
      if (allowedDevelopmentOrigins.some(allowed => origin.startsWith(allowed))) {
        return callback(null, true);
      }
    }

    // Production: Strict origin control
    const allowedOrigins = process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) :
      [
        'https://swarm-oracle.vercel.app',
        'https://swarmoracle.com',
        'https://www.swarmoracle.com'
      ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logSecurityEvent('cors_blocked', {
        origin,
        userAgent: null // Will be added in middleware
      });
      callback(new Error('CORS: Origin not allowed'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Correlation-ID'
  ],
  exposedHeaders: ['X-Correlation-ID', 'X-RateLimit-Remaining'],
  maxAge: 86400 // 24 hours
};

// Rate Limiting Configuration
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000),
      type: 'rate_limit_exceeded'
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      logSecurityEvent('rate_limit_exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method
      });
      
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        type: 'rate_limit_exceeded'
      });
    },
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    }
  });
};

// Different rate limits for different types of endpoints
export const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  parseInt(process.env.API_RATE_LIMIT) || 100, // Default 100 requests per 15 minutes
  'Too many requests from this IP, please try again later.'
);

export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per 15 minutes
  'Too many authentication attempts, please try again later.',
  true // Skip successful requests
);

export const strictRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 requests per minute
  'Rate limit exceeded for this endpoint.',
  false
);

// Helmet Security Configuration
const helmetOptions = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  
  // Cross Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Disable if causing issues with third-party resources
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // Frameguard (X-Frame-Options)
  frameguard: { action: 'deny' },
  
  // Hide Powered-By Header
  hidePoweredBy: true,
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // No Sniff
  noSniff: true,
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Permitted Cross Domain Policies
  permittedCrossDomainPolicies: false,
  
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  
  // X-XSS-Protection
  xssFilter: true
};

// IP Whitelist middleware for admin endpoints
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length === 0) {
      return next(); // No restrictions if no IPs specified
    }
    
    if (!allowedIPs.includes(clientIP)) {
      logSecurityEvent('ip_blocked', {
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method
      });
      
      return res.status(403).json({
        error: 'Access denied',
        type: 'ip_not_allowed'
      });
    }
    
    next();
  };
};

// Request size limiting
export const requestSizeLimit = '10mb'; // Adjust as needed

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Additional security headers
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  // Remove server fingerprinting
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

// Suspicious activity detection
export const suspiciousActivityDetection = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const suspicious = [
    'sqlmap',
    'nikto',
    'nmap',
    'masscan',
    'zap',
    'burp',
    'python-requests',
    'curl/7.', // Basic curl without proper user agent
  ];
  
  const isSuspicious = suspicious.some(pattern => 
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (isSuspicious) {
    logSecurityEvent('suspicious_user_agent', {
      ip: req.ip,
      userAgent,
      endpoint: req.path,
      method: req.method
    });
    
    // Don't block, just log and potentially slow down
    setTimeout(() => next(), 1000); // 1 second delay
  } else {
    next();
  }
};

// Security configuration factory
export const createSecurityMiddleware = () => {
  return [
    // Trust proxy headers
    (req, res, next) => {
      req.app.set('trust proxy', 1);
      next();
    },
    
    // Basic security headers
    helmet(helmetOptions),
    
    // CORS
    cors(corsOptions),
    
    // Custom security headers
    securityHeaders,
    
    // Suspicious activity detection
    suspiciousActivityDetection,
    
    // General rate limiting
    generalRateLimit
  ];
};

// Health check endpoint (bypasses most security)
export const healthCheckSecurity = [
  // Minimal security for health checks
  (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache');
    next();
  }
];

// Export middleware sets for different environments
export const developmentSecurity = createSecurityMiddleware();
export const productionSecurity = [
  ...createSecurityMiddleware(),
  // Additional production-only security
];

// Default export
export default isProduction ? productionSecurity : developmentSecurity;