import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gmail_v1 } from 'googleapis';

// Mock config before importing
vi.mock('../config.js', () => ({
  ENV: {
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:3001/auth/google/callback',
  },
}));

// Mock googleapis
vi.mock('googleapis', () => {
  const mockGmailInstance = {
    users: {
      messages: {
        list: vi.fn(),
        get: vi.fn(),
        modify: vi.fn(),
      },
      labels: {
        list: vi.fn(),
        create: vi.fn(),
      },
    },
  };

  return {
    google: {
      gmail: vi.fn(() => mockGmailInstance),
    },
    __mockGmailInstance: mockGmailInstance,
  };
});

// Mock OAuthHelper
vi.mock('../utils/oauth.js', () => ({
  OAuthHelper: {
    getAuthenticatedClient: vi.fn().mockResolvedValue({}),
  },
}));

import { GmailService } from './gmail.js';
import { google } from 'googleapis';

describe('GmailService', () => {
  let gmailService: GmailService;
  let mockGmailInstance: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mock instance
    const gmailClient = google.gmail({ version: 'v1', auth: {} });
    mockGmailInstance = (gmailClient as any).__mockGmailInstance || gmailClient;
    
    // Reset mock functions
    mockGmailInstance.users.messages.list = vi.fn();
    mockGmailInstance.users.messages.get = vi.fn();
    mockGmailInstance.users.messages.modify = vi.fn();
    mockGmailInstance.users.labels.list = vi.fn();
    mockGmailInstance.users.labels.create = vi.fn();
    gmailService = await GmailService.create('test-user');
  });

  describe('listLabels', () => {
    it('should return array of labels', async () => {
      const mockLabels: gmail_v1.Schema$Label[] = [
        { id: 'label-1', name: 'GTM' },
        { id: 'label-2', name: 'Other' },
      ];

      mockGmailInstance.users.labels.list.mockResolvedValue({
        data: { labels: mockLabels },
      });

      const result = await gmailService.listLabels();

      expect(result).toEqual(mockLabels);
      expect(mockGmailInstance.users.labels.list).toHaveBeenCalledWith({ userId: 'me' });
    });

    it('should return empty array when no labels exist', async () => {
      mockGmailInstance.users.labels.list.mockResolvedValue({
        data: { labels: undefined },
      });

      const result = await gmailService.listLabels();

      expect(result).toEqual([]);
    });
  });

  describe('getOrCreateLabel', () => {
    it('should return existing label ID when label exists (case-insensitive)', async () => {
      const mockLabels: gmail_v1.Schema$Label[] = [
        { id: 'label-1', name: 'GTM' },
        { id: 'label-2', name: 'Other' },
      ];

      mockGmailInstance.users.labels.list.mockResolvedValue({
        data: { labels: mockLabels },
      });

      const result = await gmailService.getOrCreateLabel('gtm');

      expect(result).toBe('label-1');
      expect(mockGmailInstance.users.labels.create).not.toHaveBeenCalled();
    });

    it('should create new label when label does not exist', async () => {
      const mockLabels: gmail_v1.Schema$Label[] = [
        { id: 'label-1', name: 'Personal' },
      ];

      mockGmailInstance.users.labels.list.mockResolvedValue({
        data: { labels: mockLabels },
      });

      mockGmailInstance.users.labels.create.mockResolvedValue({
        data: { id: 'label-2' },
      });

      const result = await gmailService.getOrCreateLabel('GTM');

      expect(result).toBe('label-2');
      expect(mockGmailInstance.users.labels.create).toHaveBeenCalledWith({
        userId: 'me',
        requestBody: {
          name: 'GTM',
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });
    });
  });

  describe('fetchUnprocessedEmails', () => {
    it('should fetch emails from inbox', async () => {
      const mockMessages = [
        { id: 'msg-1' },
        { id: 'msg-2' },
      ];

      mockGmailInstance.users.messages.list.mockResolvedValue({
        data: { messages: mockMessages },
      });

      mockGmailInstance.users.messages.get.mockImplementation((params: any) => {
        return Promise.resolve({
          data: { id: params.id, threadId: 'thread-1' },
        });
      });

      const result = await gmailService.fetchUnprocessedEmails();

      expect(result).toHaveLength(2);
      expect(mockGmailInstance.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        q: 'in:inbox',
        maxResults: 50,
      });
    });

    it('should include date filter when sinceDate provided', async () => {
      const sinceDate = new Date('2025-01-01');
      mockGmailInstance.users.messages.list.mockResolvedValue({
        data: { messages: [] },
      });

      await gmailService.fetchUnprocessedEmails(sinceDate);

      expect(mockGmailInstance.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        q: 'in:inbox after:2025/01/01',
        maxResults: 50,
      });
    });

    it('should return empty array when no messages', async () => {
      mockGmailInstance.users.messages.list.mockResolvedValue({
        data: { messages: undefined },
      });

      const result = await gmailService.fetchUnprocessedEmails();

      expect(result).toEqual([]);
    });

    it('should respect maxResults parameter', async () => {
      mockGmailInstance.users.messages.list.mockResolvedValue({
        data: { messages: [] },
      });

      await gmailService.fetchUnprocessedEmails(undefined, 10);

      expect(mockGmailInstance.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        q: 'in:inbox',
        maxResults: 10,
      });
    });
  });

  describe('applyLabel', () => {
    it('should apply label to email', async () => {
      mockGmailInstance.users.messages.modify.mockResolvedValue({ data: {} });

      await gmailService.applyLabel('msg-1', 'label-1');

      expect(mockGmailInstance.users.messages.modify).toHaveBeenCalledWith({
        userId: 'me',
        id: 'msg-1',
        requestBody: {
          addLabelIds: ['label-1'],
        },
      });
    });
  });
});

