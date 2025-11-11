/**
 * Environment configuration loader.
 * Exposes typed accessors for required runtime configuration.
 */
import dotenv from 'dotenv';
dotenv.config();

const toNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: toNumber(process.env.PORT, 4000),
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_KEY ??
      process.env.SUPABASE_ANON_KEY,
    schema: process.env.SUPABASE_SCHEMA ?? 'public',
  },
  cors: {
    origins: (process.env.CORS_ALLOWED_ORIGINS ?? '*')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
};

export function assertRequiredEnv() {
  const missing = [];
  if (!env.supabase.url) {
    missing.push('SUPABASE_URL');
  }
  if (!env.supabase.serviceKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

