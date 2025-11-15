import 'dotenv/config';
import { z } from 'zod';
const EnvSchema = z.object({
    PORT: z.string().default('3001'),
    BASE_URL: z.string().url().default('http://localhost:3001'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    // Supabase
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    SUPABASE_DATABASE_URL: z.string().url(),
    // Slack
    SLACK_BOT_TOKEN: z.string(),
    SLACK_SIGNING_SECRET: z.string(),
    SLACK_CLIENT_ID: z.string(),
    SLACK_CLIENT_SECRET: z.string(),
    // Google OAuth
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GOOGLE_REDIRECT_URI: z.string().url(),
    // OpenAI
    OPENAI_API_KEY: z.string(),
    OPENAI_MODEL: z.string().default('gpt-4o-mini'),
    OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
    // Encryption
    ENCRYPTION_KEY: z.string(),
});
export const ENV = EnvSchema.parse(process.env);
export const PORT = parseInt(ENV.PORT, 10);
//# sourceMappingURL=config.js.map