import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env relative to server root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/apiforge'),
  MONGODB_TEST_URI: z.string().default('mongodb://localhost:27017/apiforge_test'),
  JWT_SECRET: z.string().min(32, {
    message: 'JWT_SECRET must be at least 32 characters long for cryptographic security',
  }),
  JWT_EXPIRES_IN: z.string().default('7d'),
  MAX_VIRTUAL_USERS: z.coerce.number().positive().default(500),
  MAX_TEST_DURATION: z.coerce.number().positive().default(300),
  MAX_CONCURRENT_TESTS: z.coerce.number().positive().default(2),
  K6_PATH: z.string().default('k6'),
  DEMO_PORT: z.coerce.number().default(5001),
  DEMO_API_URL: z.string().url().default('http://localhost:5001'),
});

export function validateEnv(config = process.env) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    throw new Error(`Environment validation failed: ${errorDetails}`);
  }
  return result.data;
}

export const env = validateEnv();
export default env;
