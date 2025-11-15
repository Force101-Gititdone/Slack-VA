import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock OpenAI module before importing AIService
const mockCreate = vi.fn();

vi.mock('openai', () => {
  const mockCreateFn = vi.fn();
  return {
    default: vi.fn(() => ({
      chat: {
        completions: {
          create: mockCreateFn,
        },
      },
    })),
    __mockCreate: mockCreateFn,
  };
});

// Mock config before importing
vi.mock('../config.js', () => ({
  ENV: {
    OPENAI_API_KEY: 'test-key',
    OPENAI_MODEL: 'gpt-4o-mini',
    OPENAI_EMBEDDING_MODEL: 'text-embedding-3-small',
  },
}));

import { AIService } from './ai.js';
import OpenAI from 'openai';

describe('AIService.classifyEmailForLabeling', () => {
  let mockCreateFn: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mock function from the OpenAI instance
    const openaiInstance = new OpenAI({ apiKey: 'test' });
    mockCreateFn = (openaiInstance as any).chat.completions.create;
    vi.mocked(mockCreateFn).mockClear();
  });

  it('should classify email and return valid label for force101.com', async () => {
    // Mock successful response
    mockCreateFn.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ label: 'GTM' }),
          },
        },
      ],
    });

    const result = await AIService.classifyEmailForLabeling(
      'Test Subject',
      'Test body content',
      'bc@force101.com'
    );

    expect(result).toEqual({ label: 'GTM' });
    expect(mockCreateFn).toHaveBeenCalled();
  });

  it('should classify email and return valid label for coloradocollins.com', async () => {
    // Mock successful response
    mockCreateFn.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ label: 'Friends' }),
          },
        },
      ],
    });

    const result = await AIService.classifyEmailForLabeling(
      'Test Subject',
      'Test body content',
      'bc@coloradocollins.com'
    );

    expect(result).toEqual({ label: 'Friends' });
    expect(mockCreateFn).toHaveBeenCalled();
  });

  it('should return Other label when AI returns invalid label', async () => {
    // Mock response with invalid label
    mockCreateFn.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ label: 'InvalidLabel' }),
          },
        },
      ],
    });

    const result = await AIService.classifyEmailForLabeling(
      'Test Subject',
      'Test body',
      'bc@force101.com'
    );

    expect(result).toEqual({ label: 'Other' });
  });

  it('should return Other label when JSON parsing fails', async () => {
    // Mock response with invalid JSON
    mockCreateFn.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Invalid JSON response',
          },
        },
      ],
    });

    const result = await AIService.classifyEmailForLabeling(
      'Test Subject',
      'Test body',
      'bc@coloradocollins.com'
    );

    expect(result).toEqual({ label: 'Other' });
  });

  it('should throw error when response is empty', async () => {
    // Mock response with no content
    mockCreateFn.mockResolvedValue({
      choices: [
        {
          message: {
            content: null,
          },
        },
      ],
    });

    await expect(
      AIService.classifyEmailForLabeling('Test Subject', 'Test body')
    ).rejects.toThrow('No response from OpenAI');
  });

  it('should handle empty subject and body', async () => {
    mockCreateFn.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ label: 'Other' }),
          },
        },
      ],
    });

    const result = await AIService.classifyEmailForLabeling('', '', 'bc@force101.com');

    expect(result).toEqual({ label: 'Other' });
    expect(mockCreateFn).toHaveBeenCalled();
  });

  it('should truncate long body text', async () => {
    const longBody = 'a'.repeat(2000);
    mockCreateFn.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ label: 'Other' }),
          },
        },
      ],
    });

    await AIService.classifyEmailForLabeling('Subject', longBody, 'bc@force101.com');

    const callArgs = mockCreateFn.mock.calls[0][0];
    const userMessage = callArgs.messages.find((m: any) => m.role === 'user');
    expect(userMessage.content).toContain('...');
    expect(userMessage.content.length).toBeLessThan(2500);
  });

  it('should use correct model and parameters', async () => {
    mockCreateFn.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ label: 'CSX' }),
          },
        },
      ],
    });

    await AIService.classifyEmailForLabeling('Subject', 'Body', 'bc@force101.com');

    const callArgs = mockCreateFn.mock.calls[0][0];
    expect(callArgs.model).toBe('gpt-4o-mini');
    expect(callArgs.temperature).toBe(0);
    expect(callArgs.max_tokens).toBe(30);
    expect(callArgs.response_format).toEqual({ type: 'json_object' });
  });

  it('should return valid labels for force101.com account', async () => {
    const force101Labels = [
      'Calendar',
      'CSX',
      'GTM',
      'LinkedIn-Interesting-Post',
      'LinkedIn-Message',
      'Other',
    ];

    for (const label of force101Labels) {
      mockCreateFn.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ label }),
            },
          },
        ],
      });

      const result = await AIService.classifyEmailForLabeling('Subject', 'Body', 'bc@force101.com');
      expect(result.label).toBe(label);
    }
  });

  it('should return valid labels for coloradocollins.com account', async () => {
    const coloradoCollinsLabels = [
      'Ads',
      'Friends',
      'Other',
      'Social Media',
    ];

    for (const label of coloradoCollinsLabels) {
      mockCreateFn.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ label }),
            },
          },
        ],
      });

      const result = await AIService.classifyEmailForLabeling('Subject', 'Body', 'bc@coloradocollins.com');
      expect(result.label).toBe(label);
    }
  });

  it('should use account-specific labels based on recipient email', async () => {
    // Test force101.com labels
    mockCreateFn.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ label: 'GTM' }),
          },
        },
      ],
    });

    const force101Result = await AIService.classifyEmailForLabeling(
      'Subject',
      'Body',
      'bc@force101.com'
    );
    expect(force101Result.label).toBe('GTM');

    // Verify the prompt includes force101 labels
    const force101CallArgs = mockCreateFn.mock.calls[0][0];
    const force101UserMessage = force101CallArgs.messages.find((m: any) => m.role === 'user');
    expect(force101UserMessage.content).toContain('GTM');
    expect(force101UserMessage.content).toContain('LinkedIn-Interesting-Post');

    // Reset mock
    mockCreateFn.mockClear();

    // Test coloradocollins.com labels
    mockCreateFn.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ label: 'Friends' }),
          },
        },
      ],
    });

    const coloradoResult = await AIService.classifyEmailForLabeling(
      'Subject',
      'Body',
      'bc@coloradocollins.com'
    );
    expect(coloradoResult.label).toBe('Friends');

    // Verify the prompt includes coloradocollins labels
    const coloradoCallArgs = mockCreateFn.mock.calls[0][0];
    const coloradoUserMessage = coloradoCallArgs.messages.find((m: any) => m.role === 'user');
    expect(coloradoUserMessage.content).toContain('Friends');
    expect(coloradoUserMessage.content).toContain('Social Media');
  });

  it('should use all labels when recipient email is not provided', async () => {
    mockCreateFn.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ label: 'Other' }),
          },
        },
      ],
    });

    const result = await AIService.classifyEmailForLabeling('Subject', 'Body');

    expect(result.label).toBe('Other');
    
    // Verify the prompt includes labels from both accounts
    const callArgs = mockCreateFn.mock.calls[0][0];
    const userMessage = callArgs.messages.find((m: any) => m.role === 'user');
    expect(userMessage.content).toContain('GTM'); // force101 label
    expect(userMessage.content).toContain('Friends'); // coloradocollins label
  });
});

