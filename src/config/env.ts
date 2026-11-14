import { existsSync } from 'node:fs';

// Node 22+ can load .env natively, so no dotenv dependency is needed.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

function read(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export const env = {
  baseUrl: stripTrailingSlash(read('BASE_URL', 'https://practicesoftwaretesting.com')),
  apiUrl: stripTrailingSlash(read('API_URL', 'https://api.practicesoftwaretesting.com')),
  ci: Boolean(process.env.CI),
  aiAnalysis: read('AI_ANALYSIS', 'false').toLowerCase() === 'true',
  aiModel: read('AI_MODEL', 'claude-opus-5-5'),
} as const;
