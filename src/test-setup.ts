import { vi } from 'vitest';

// Mock environment variables before any imports
process.env.BASE_URL = 'http://localhost:3001';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.SUPABASE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SLACK_BOT_TOKEN = 'xoxb-test';
process.env.SLACK_SIGNING_SECRET = 'test-secret';
process.env.SLACK_CLIENT_ID = 'test-client-id';
process.env.SLACK_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/auth/google/callback';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!';

