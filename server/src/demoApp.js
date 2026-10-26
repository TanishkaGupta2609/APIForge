import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env.js';
import demoRoutes from './modules/demo/demo.routes.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

const demoApp = express();

// Security headers with Helmet
demoApp.use(helmet());

// Dedicated CORS allowing client dev server and APIForge frontend
demoApp.use(
  cors({
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

demoApp.use(express.json());

// Root health probe for demo sandbox instance
demoApp.get('/', (req, res) => {
  res.json({
    name: 'APIForge Demo Sandbox API',
    port: env.DEMO_PORT,
    health: '/api/demo/health',
    endpoints: [
      '/api/demo/ping',
      '/api/demo/delayed?ms=250',
      '/api/demo/error?status=500',
      '/api/demo/rate-limited',
    ],
  });
});

// Mount Demo scenarios under /api/demo
demoApp.use('/api/demo', demoRoutes);

// Unmatched routes
demoApp.use(notFound);

// Centralized error handling
demoApp.use(errorHandler);

export default demoApp;
