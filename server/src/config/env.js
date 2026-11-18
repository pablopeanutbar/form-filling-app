import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: serverEnvPath });

const extensionIdList = z.string().default('').refine(
  (value) => value.split(',').map((id) => id.trim()).filter(Boolean).every((id) => /^[a-p]{32}$/.test(id)),
  'Must contain comma-separated Chrome extension IDs (32 lowercase letters a-p)'
);

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters long for cryptographic security')
    .default('dev_session_secret_former_platform_secure_random_key_32_chars'),
  SESSION_MAX_AGE_MS: z.coerce.number().default(604800000), // 7 days in ms
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  EXTENSION_IDS: extensionIdList,
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_PRIVATE_SYNTHETIC_DEV: z.string().optional().default('false'),
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-3.5-flash-lite'),
  GEMINI_MATCHING_ENABLED: z.union([z.boolean(), z.enum(['true', 'false'])]).default('false').transform((value) => String(value) === 'true'),
  EXTENSION_DEV_IDS: extensionIdList
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('CRITICAL: Environment variable validation failed:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
// Admission configuration only, never authentication. Never merge development IDs into production.
const activeExtensionIds = env.NODE_ENV === 'production' ? env.EXTENSION_IDS : env.EXTENSION_DEV_IDS;
export const extensionIds = activeExtensionIds.split(',').map((id) => id.trim()).filter(Boolean);

export const allowedOrigins = env.ALLOWED_ORIGINS
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
