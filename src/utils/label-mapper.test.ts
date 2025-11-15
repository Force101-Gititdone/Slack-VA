import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LabelMapper } from './label-mapper.js';
import { GmailService } from '../services/gmail.js';
import { gmail_v1 } from 'googleapis';

describe('LabelMapper', () => {
  let mockGmailService: any;

  beforeEach(() => {
    mockGmailService = {
      listLabels: vi.fn(),
      getOrCreateLabel: vi.fn(),
    };
  });

  describe('mapLabelNameToId', () => {
    it('should return existing label ID when label exists (case-insensitive)', async () => {
      const mockLabels: gmail_v1.Schema$Label[] = [
        { id: 'label-1', name: 'GTM' },
        { id: 'label-2', name: 'Other' },
      ];

      mockGmailService.listLabels.mockResolvedValue(mockLabels);

      const result = await LabelMapper.mapLabelNameToId(
        mockGmailService,
        'gtm'
      );

      expect(result).toBe('label-1');
      expect(mockGmailService.listLabels).toHaveBeenCalledOnce();
      expect(mockGmailService.getOrCreateLabel).not.toHaveBeenCalled();
    });

    it('should create new label when label does not exist', async () => {
      const mockLabels: gmail_v1.Schema$Label[] = [
        { id: 'label-1', name: 'Other' },
      ];

      mockGmailService.listLabels.mockResolvedValue(mockLabels);
      mockGmailService.getOrCreateLabel.mockResolvedValue('label-2');

      const result = await LabelMapper.mapLabelNameToId(
        mockGmailService,
        'GTM'
      );

      expect(result).toBe('label-2');
      expect(mockGmailService.getOrCreateLabel).toHaveBeenCalledWith('GTM');
    });

    it('should trim whitespace from label name', async () => {
      const mockLabels: gmail_v1.Schema$Label[] = [
        { id: 'label-1', name: 'Personal' },
      ];

      mockGmailService.listLabels.mockResolvedValue(mockLabels);
      mockGmailService.getOrCreateLabel.mockResolvedValue('label-2');

      await LabelMapper.mapLabelNameToId(mockGmailService, '  GTM  ');

      expect(mockGmailService.getOrCreateLabel).toHaveBeenCalledWith('GTM');
    });

    it('should throw error when label name is empty', async () => {
      await expect(
        LabelMapper.mapLabelNameToId(mockGmailService, '')
      ).rejects.toThrow('Label name cannot be empty');

      await expect(
        LabelMapper.mapLabelNameToId(mockGmailService, '   ')
      ).rejects.toThrow('Label name cannot be empty');
    });

    it('should throw error when labels list is invalid', async () => {
      mockGmailService.listLabels.mockResolvedValue(null);

      await expect(
        LabelMapper.mapLabelNameToId(mockGmailService, 'Test')
      ).rejects.toThrow('Gmail labels not found or invalid format');

      mockGmailService.listLabels.mockResolvedValue('not-an-array');

      await expect(
        LabelMapper.mapLabelNameToId(mockGmailService, 'Test')
      ).rejects.toThrow('Gmail labels not found or invalid format');
    });

    it('should handle labels with null names', async () => {
      const mockLabels: gmail_v1.Schema$Label[] = [
        { id: 'label-1', name: null },
        { id: 'label-2', name: 'Personal' },
      ];

      mockGmailService.listLabels.mockResolvedValue(mockLabels);
      mockGmailService.getOrCreateLabel.mockResolvedValue('label-3');

      const result = await LabelMapper.mapLabelNameToId(
        mockGmailService,
        'Test'
      );

      expect(result).toBe('label-3');
    });
  });

  describe('getLabelNameById', () => {
    it('should return label name when label ID exists', async () => {
      const mockLabels: gmail_v1.Schema$Label[] = [
        { id: 'label-1', name: 'GTM' },
        { id: 'label-2', name: 'Other' },
      ];

      mockGmailService.listLabels.mockResolvedValue(mockLabels);

      const result = await LabelMapper.getLabelNameById(
        mockGmailService,
        'label-1'
      );

      expect(result).toBe('GTM');
    });

    it('should return null when label ID does not exist', async () => {
      const mockLabels: gmail_v1.Schema$Label[] = [
        { id: 'label-1', name: 'Personal' },
      ];

      mockGmailService.listLabels.mockResolvedValue(mockLabels);

      const result = await LabelMapper.getLabelNameById(
        mockGmailService,
        'non-existent'
      );

      expect(result).toBeNull();
    });

    it('should return null when label has no name', async () => {
      const mockLabels: gmail_v1.Schema$Label[] = [
        { id: 'label-1', name: null },
      ];

      mockGmailService.listLabels.mockResolvedValue(mockLabels);

      const result = await LabelMapper.getLabelNameById(
        mockGmailService,
        'label-1'
      );

      expect(result).toBeNull();
    });
  });
});

