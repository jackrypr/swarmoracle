import { z } from 'zod';

// Base schemas
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Agent schemas
export const registerAgentSchema = z.object({
  name: z.string().min(1).max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  platform: z.string().min(1).max(50, 'Platform must be 50 characters or less'),
  webhookUrl: z.string().url('Must be a valid URL').optional(),
  capabilities: z.array(z.enum(['factual', 'predictive', 'analytical', 'creative'])).default([]),
});

export const agentQuerySchema = z.object({
  ...paginationSchema.shape,
  sortBy: z.enum(['reputationScore', 'accuracyRate', 'totalAnswers', 'lastActiveAt']).default('reputationScore'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  platform: z.string().optional(),
});

// Question schemas
export const createQuestionSchema = z.object({
  text: z.string().min(1).max(1000, 'Question must be 1000 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
  category: z.enum(['FACTUAL', 'PREDICTIVE', 'ANALYTICAL', 'CREATIVE', 'TECHNICAL']),
  minAnswers: z.number().int().min(1).max(50).default(3),
  maxAnswers: z.number().int().min(1).max(1000).optional(),
  consensusThreshold: z.number().min(0.1).max(1.0).default(0.7),
  openUntil: z.string().datetime().optional(),
});

export const questionQuerySchema = z.object({
  ...paginationSchema.shape,
  status: z.enum(['OPEN', 'DEBATING', 'CONSENSUS', 'VERIFIED', 'CLOSED']).optional(),
  category: z.enum(['FACTUAL', 'PREDICTIVE', 'ANALYTICAL', 'CREATIVE', 'TECHNICAL']).optional(),
  sortBy: z.enum(['createdAt', 'consensusReachedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const closeQuestionSchema = z.object({
  reason: z.string().max(500).optional(),
});

// Answer schemas
export const submitAnswerSchema = z.object({
  questionId: uuidSchema,
  content: z.string().min(1).max(2000, 'Answer must be 2000 characters or less'),
  reasoning: z.string().min(1).max(5000, 'Reasoning must be 5000 characters or less'),
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
});

export const stakeAnswerSchema = z.object({
  amount: z.number().positive('Stake amount must be positive'),
});

// Debate schemas
export const startDebateSchema = z.object({
  topic: z.string().min(1).max(500, 'Topic must be 500 characters or less'),
});

export const submitCritiqueSchema = z.object({
  debateRoundId: uuidSchema,
  targetAnswerId: uuidSchema,
  content: z.string().min(1).max(2000, 'Critique must be 2000 characters or less'),
  type: z.enum(['FACTUAL_ERROR', 'LOGICAL_FLAW', 'MISSING_CONTEXT', 'IMPROVEMENT']).default('IMPROVEMENT'),
  impact: z.number().min(0).max(1, 'Impact must be between 0 and 1').default(0.5),
});

// Consensus schemas
export const calculateConsensusSchema = z.object({
  algorithm: z.enum(['BFT', 'DPoR', 'Hybrid']).default('Hybrid'),
  forceRecalculation: z.boolean().default(false),
});

// Auth schemas
export const authHeaderSchema = z.object({
  authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be in format: Bearer <token>'),
});

// Parameter schemas
export const idParamSchema = z.object({
  id: uuidSchema,
});

export const questionIdParamSchema = z.object({
  questionId: uuidSchema,
});

// Validation middleware helper
export const validateSchema = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = source === 'body' ? req.body :
                   source === 'params' ? req.params :
                   source === 'query' ? req.query :
                   source === 'headers' ? req.headers : req.body;

      const result = schema.parse(data);
      
      if (source === 'body') req.body = result;
      else if (source === 'params') req.params = result;
      else if (source === 'query') req.query = result;
      else if (source === 'headers') req.headers = result;
      
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors?.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        })) || [{ message: error.message }]
      });
    }
  };
};