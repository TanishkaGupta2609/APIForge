import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import { isDatabaseConnected } from './config/database.js';
import { sendSuccess } from './shared/utils/response.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Security headers with Helmet
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global rate limiting for general API routes
app.use('/api', apiLimiter);

// Body parsing with safe size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isDbUp = isDatabaseConnected();
  sendSuccess(
    res,
    {
      status: 'healthy',
      database: isDbUp ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
    },
    'APIForge server is running'
  );
});

// 404 Handler for unmatched routes
app.use(notFound);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
