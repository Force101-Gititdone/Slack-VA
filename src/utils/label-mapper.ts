import { GmailService } from '../services/gmail.js';
import { gmail_v1 } from 'googleapis';
import { logger } from './logger.js';

/**
 * Maps AI-selected label name to Gmail label ID
 * Handles case-insensitive matching and label creation
 */
export class LabelMapper {
  /**
   * Map label name to Gmail label ID
   * @param gmailService - Authenticated Gmail service instance
   * @param labelName - Label name from AI classification
   * @returns Gmail label ID
   */
  static async mapLabelNameToId(
    gmailService: GmailService,
    labelName: string
  ): Promise<string> {
    const trimmedLabelName = labelName.trim();
    
    if (!trimmedLabelName) {
      throw new Error('Label name cannot be empty');
    }

    // Fetch all Gmail labels
    const gmailLabels = await gmailService.listLabels();

    if (!gmailLabels || !Array.isArray(gmailLabels)) {
      throw new Error('Gmail labels not found or invalid format');
    }

    // Case-insensitive match
    const match = gmailLabels.find(
      (l) => (l.name || '').toLowerCase() === trimmedLabelName.toLowerCase()
    );

    if (match?.id) {
      logger.debug('Found existing label', {
        labelName: trimmedLabelName,
        labelId: match.id,
        actualName: match.name,
      });
      return match.id;
    }

    // Label doesn't exist, create it
    logger.info('Creating new Gmail label', { labelName: trimmedLabelName });
    const labelId = await gmailService.getOrCreateLabel(trimmedLabelName);
    
    return labelId;
  }

  /**
   * Get label name from Gmail label ID
   * @param gmailService - Authenticated Gmail service instance
   * @param labelId - Gmail label ID
   * @returns Label name or null if not found
   */
  static async getLabelNameById(
    gmailService: GmailService,
    labelId: string
  ): Promise<string | null> {
    const labels = await gmailService.listLabels();
    const label = labels.find((l) => l.id === labelId);
    return label?.name || null;
  }
}

