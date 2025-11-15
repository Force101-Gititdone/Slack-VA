import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GmailLabelerService } from './gmail-labeler.js';
import { GmailService } from './gmail.js';
import { AIService } from './ai.js';
import { sendLabelApplicationNotification } from './slack.js';
import { db } from '../db/client.js';

// Mock all dependencies
const mockGmailService = {
  fetchUnprocessedEmails: vi.fn(),
  parseEmail: vi.fn(),
  applyLabel: vi.fn(),
  getOrCreateLabel: vi.fn(),
  storeEmail: vi.fn(),
};

vi.mock('./gmail.js', () => ({
  GmailService: {
    create: vi.fn(() => Promise.resolve(mockGmailService)),
  },
}));

vi.mock('./ai.js', () => ({
  AIService: {
    classifyEmailForLabeling: vi.fn(),
  },
}));

vi.mock('./slack.js', () => ({
  sendLabelApplicationNotification: vi.fn(),
  slackApp: {
    client: {
      chat: {
        postMessage: vi.fn(),
      },
    },
  },
}));

const mockProcessedEmailsQuery = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
};

const mockEmailsQuery = {
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../db/client.js', () => ({
  db: {
    select: vi.fn(() => mockProcessedEmailsQuery),
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue(undefined),
    })),
    update: vi.fn(() => mockEmailsQuery),
  },
}));

vi.mock('../config.js', () => ({
  ENV: {
    GMAIL_LABELER_ENABLED: true,
    GMAIL_LABELER_ACCOUNTS: ['test-user'],
    GMAIL_LABELER_POLL_INTERVAL: 60000,
    GMAIL_LABELER_SLACK_CHANNEL: 'C123456',
    OPENAI_API_KEY: 'test-key',
  },
}));

describe('GmailLabelerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processUnprocessedEmails', () => {
    it('should process emails and apply labels', async () => {
      const mockEmail = { id: 'msg-1', threadId: 'thread-1' };
      mockGmailService.fetchUnprocessedEmails.mockResolvedValue([mockEmail]);
      mockGmailService.parseEmail.mockReturnValue({
        messageId: 'msg-1',
        subject: 'Test Subject',
        body: 'Test Body',
        sender: 'test@example.com',
        recipient: 'bc@force101.com',
        receivedAt: new Date(),
        labels: [],
      });

      mockProcessedEmailsQuery.limit.mockResolvedValueOnce([]); // Not processed yet

      vi.mocked(AIService.classifyEmailForLabeling).mockResolvedValue({
        label: 'GTM',
      });
      mockGmailService.getOrCreateLabel.mockResolvedValue('label-1');

      const result = await GmailLabelerService.processUnprocessedEmails('test-user', 50, false);

      expect(result.processed).toBe(1);
      expect(result.labeled).toBe(1);
      expect(mockGmailService.applyLabel).toHaveBeenCalledWith('msg-1', 'label-1');
    });

    it('should skip already processed emails', async () => {
      const mockEmail = { id: 'msg-1', threadId: 'thread-1' };
      mockGmailService.fetchUnprocessedEmails.mockResolvedValue([mockEmail]);

      // Email already processed
      mockProcessedEmailsQuery.limit.mockResolvedValueOnce([{ id: '1' }]);

      const result = await GmailLabelerService.processUnprocessedEmails('test-user', 50, false);

      expect(result.processed).toBe(0);
      expect(mockGmailService.applyLabel).not.toHaveBeenCalled();
    });
  });

  describe('processEmail', () => {
    it('should process single email by message ID', async () => {
      const mockGmailClient = {
        users: {
          messages: {
            get: vi.fn().mockResolvedValue({
              data: {
                id: 'msg-1',
                threadId: 'thread-1',
                payload: {
                  headers: [
                    { name: 'Subject', value: 'Test' },
                    { name: 'From', value: 'test@example.com' },
                    { name: 'To', value: 'me@example.com' },
                    { name: 'Date', value: new Date().toISOString() },
                  ],
                  body: { data: Buffer.from('Test body').toString('base64') },
                },
              },
            }),
          },
        },
      };

      // Mock GmailService to return client
      (mockGmailService as any).gmail = mockGmailClient;
      mockGmailService.parseEmail.mockReturnValue({
        messageId: 'msg-1',
        subject: 'Test',
        body: 'Test body',
        sender: 'test@example.com',
        recipient: 'bc@force101.com',
        receivedAt: new Date(),
        labels: [],
      });

      mockProcessedEmailsQuery.limit.mockResolvedValueOnce([]); // Not processed

      vi.mocked(AIService.classifyEmailForLabeling).mockResolvedValue({
        label: 'Other',
      });
      mockGmailService.getOrCreateLabel.mockResolvedValue('label-1');

      const result = await GmailLabelerService.processEmail('test-user', 'msg-1', false);

      expect(result.labeled).toBe(true);
      expect(result.labelName).toBe('Other');
      expect(mockGmailService.applyLabel).toHaveBeenCalledWith('msg-1', 'label-1');
    });

    it('should return existing label if email already processed', async () => {
      mockProcessedEmailsQuery.limit.mockResolvedValueOnce([
        { id: '1', labelName: 'GTM' },
      ]);

      const result = await GmailLabelerService.processEmail('test-user', 'msg-1', false);

      expect(result.labeled).toBe(true);
      expect(result.labelName).toBe('GTM');
      expect(mockGmailService.applyLabel).not.toHaveBeenCalled();
    });
  });
});

