import OpenAI from 'openai';
import { ENV } from '../config.js';
const openai = new OpenAI({
    apiKey: ENV.OPENAI_API_KEY,
});
export class AIService {
    /**
     * Categorize email using AI
     */
    static async categorizeEmail(subject, body, sender) {
        const prompt = `Analyze the following email and provide categorization:

Subject: ${subject}
From: ${sender}
Body: ${body.substring(0, 1000)}${body.length > 1000 ? '...' : ''}

Provide a JSON response with:
- category: One of: "work", "personal", "spam", "newsletter", "notification", "important", "follow-up", "other"
- intent: Brief description of what the sender wants (e.g., "scheduling meeting", "asking question", "providing information")
- urgency: One of: "low", "medium", "high"
- summary: One-sentence summary of the email
- suggestedLabels: Array of suggested Gmail label names (2-4 labels, use existing common labels when possible)

Respond with ONLY valid JSON, no markdown formatting.`;
        const response = await openai.chat.completions.create({
            model: ENV.OPENAI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are an email categorization assistant. Always respond with valid JSON only.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }
        try {
            return JSON.parse(content);
        }
        catch (error) {
            // Fallback if JSON parsing fails
            return {
                category: 'other',
                intent: 'unknown',
                urgency: 'medium',
                summary: subject,
                suggestedLabels: [],
            };
        }
    }
    /**
     * Understand natural language query
     */
    static async understandQuery(query) {
        const prompt = `Analyze this email query and extract filters:

Query: "${query}"

Provide a JSON response with:
- intent: What the user wants (e.g., "find_emails", "categorize_emails", "get_summary")
- filters: Object with optional fields:
  - dateRange: { start: ISO date string, end: ISO date string } (e.g., "last week", "yesterday", "this month")
  - sender: Email address or name to filter by
  - category: Category to filter by
  - urgency: "low", "medium", or "high"
  - keywords: Array of keywords to search for

Examples:
- "emails from last week" → { dateRange: { start: "2024-01-01", end: "2024-01-07" } }
- "urgent emails from clients" → { urgency: "high", category: "work" }
- "emails about project X" → { keywords: ["project X"] }

Respond with ONLY valid JSON, no markdown formatting.`;
        const response = await openai.chat.completions.create({
            model: ENV.OPENAI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a query understanding assistant. Always respond with valid JSON only.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' },
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }
        const parsed = JSON.parse(content);
        // Convert date strings to Date objects
        if (parsed.filters?.dateRange) {
            parsed.filters.dateRange.start = new Date(parsed.filters.dateRange.start);
            parsed.filters.dateRange.end = new Date(parsed.filters.dateRange.end);
        }
        return parsed;
    }
    /**
     * Generate embedding for text
     */
    static async generateEmbedding(text) {
        const response = await openai.embeddings.create({
            model: ENV.OPENAI_EMBEDDING_MODEL,
            input: text.substring(0, 8000), // Limit to model's max input
        });
        return response.data[0].embedding;
    }
}
//# sourceMappingURL=ai.js.map