import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: serverEnvPath });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters long for cryptographic security')
    .default('dev_session_secret_former_platform_secure_random_key_32_chars'),
  SESSION_MAX_AGE_MS: z.coerce.number().default(604800000), // 7 days in ms
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('CRITICAL: Environment variable validation failed:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;

export const allowedOrigins = env.ALLOWED_ORIGINS
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
