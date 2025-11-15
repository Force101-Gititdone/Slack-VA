import { CMAService } from '../services/cma.js';
import { validatePropertyAddress, validatePropertyDetails, PropertyDetails } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

export class CMACommands {
  /**
   * Handle generate command - Generate a CMA for a property
   */
  static async handleGenerate(
    slackUserId: string,
    commandText: string
  ): Promise<any> {
    try {
      logger.info('Processing CMA generate command', { slackUserId, commandText });

      // Parse command text: "/cma generate <address> [beds] [baths] [sqft]"
      // Or simpler: "/cma <address>"
      const parts = commandText.trim().split(/\s+/);
      
      if (parts.length === 0 || parts[0] === '') {
        return {
          text: 'Usage: `/cma <address>` or `/cma generate <address> [beds] [baths] [sqft]`\nExample: `/cma 123 Main St, Denver, CO 80202`',
          response_type: 'ephemeral',
        };
      }

      // Remove "generate" if present
      let addressStart = 0;
      if (parts[0].toLowerCase() === 'generate') {
        addressStart = 1;
      }

      if (parts.length <= addressStart) {
        return {
          text: 'Please provide a property address.\nExample: `/cma 123 Main St, Denver, CO 80202`',
          response_type: 'ephemeral',
        };
      }

      // Extract address (everything after "generate" or first word)
      // Try to parse property details if provided
      const addressParts: string[] = [];
      const propertyDetails: PropertyDetails = {};
      let parsingDetails = false;

      for (let i = addressStart; i < parts.length; i++) {
        const part = parts[i];
        
        // Check if this looks like a number (could be beds, baths, or sqft)
        const numMatch = part.match(/^(\d+\.?\d*)$/);
        if (numMatch && !parsingDetails) {
          // First number might be beds
          if (propertyDetails.beds === undefined) {
            propertyDetails.beds = parseInt(numMatch[1], 10);
            parsingDetails = true;
            continue;
          }
          // Second number might be baths
          if (propertyDetails.baths === undefined) {
            propertyDetails.baths = parseFloat(numMatch[1]);
            continue;
          }
          // Third number might be sqft
          if (propertyDetails.sqft === undefined) {
            propertyDetails.sqft = parseInt(numMatch[1], 10);
            continue;
          }
        }
        
        // If we hit a non-number or already have all details, add to address
        addressParts.push(part);
        parsingDetails = false;
      }

      const address = addressParts.join(' ');
      const validatedAddress = validatePropertyAddress(address);
      
      // Only validate details if any were provided
      const validatedDetails = Object.keys(propertyDetails).length > 0 
        ? validatePropertyDetails(propertyDetails)
        : undefined;

      // Generate CMA
      const cmaId = await CMAService.generateCMA(slackUserId, validatedAddress, validatedDetails);

      // Get the completed CMA
      const cma = await CMAService.getCMARequest(cmaId, slackUserId);

      if (!cma || cma.status !== 'completed') {
        return {
          text: 'CMA generation is in progress. Use `/cma status <cma-id>` to check status.',
          response_type: 'ephemeral',
        };
      }

      const estimatedValue = cma.estimatedValue as { low: number; mid: number; high: number } | null;

      // Format response
      const blocks: any[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📊 Comparative Market Analysis',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Property:*\n${cma.propertyAddress}`,
            },
            {
              type: 'mrkdwn',
              text: `*CMA ID:*\n\`${cma.id}\``,
            },
          ],
        },
      ];

      if (estimatedValue) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Estimated Value Range:*\n• Low: $${estimatedValue.low.toLocaleString()}\n• Mid: $${estimatedValue.mid.toLocaleString()}\n• High: $${estimatedValue.high.toLocaleString()}`,
          },
        });
      }

      if (cma.comps && cma.comps.length > 0) {
        blocks.push({
          type: 'divider',
        });
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Comparable Properties (${cma.comps.length}):*`,
          },
        });

        // Show top 5 comps
        const topComps = cma.comps.slice(0, 5);
        for (const comp of topComps) {
          const price = comp.salePrice || comp.listPrice || 'N/A';
          const priceLabel = comp.salePrice ? 'Sold' : 'Listed';
          const date = comp.soldDate || comp.listDate;
          const dateStr = date ? new Date(date).toLocaleDateString() : 'N/A';
          
          blocks.push({
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*${comp.address}*\n${priceLabel}: $${typeof price === 'string' ? parseFloat(price).toLocaleString() : price.toLocaleString()}`,
              },
              {
                type: 'mrkdwn',
                text: `*Details:*\n${comp.beds || 'N/A'} bed, ${comp.baths || 'N/A'} bath\n${comp.sqft ? comp.sqft.toLocaleString() : 'N/A'} sqft\nDate: ${dateStr}`,
              },
            ],
          });
        }

        if (cma.comps.length > 5) {
          blocks.push({
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `_Showing top 5 of ${cma.comps.length} comparable properties_`,
              },
            ],
          });
        }
      }

      // Add disclaimer
      blocks.push({
        type: 'divider',
      });
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '_⚠️ This CMA is not an appraisal and is for informational purposes only. Data source: Mock (for testing)._',
          },
        ],
      });

      return {
        text: `CMA generated for ${cma.propertyAddress}`,
        blocks,
      };
    } catch (error) {
      logger.error('Error in CMA generate command', {}, error instanceof Error ? error : undefined);
      
      if (error instanceof Error && error.message.includes('Property address')) {
        return {
          text: `❌ ${error.message}\n\nUsage: \`/cma <address>\`\nExample: \`/cma 123 Main St, Denver, CO 80202\``,
          response_type: 'ephemeral',
        };
      }

      throw error;
    }
  }

  /**
   * Handle status command - Check CMA request status
   */
  static async handleStatus(slackUserId: string, cmaId: string): Promise<any> {
    try {
      logger.info('Getting CMA status', { slackUserId, cmaId });

      const cma = await CMAService.getCMARequest(cmaId, slackUserId);

      if (!cma) {
        return {
          text: `❌ CMA not found: ${cmaId}`,
          response_type: 'ephemeral',
        };
      }

      const statusEmoji = {
        pending: '⏳',
        processing: '🔄',
        completed: '✅',
        failed: '❌',
      }[cma.status] || '❓';

      return {
        text: `${statusEmoji} CMA Status: ${cma.status}`,
        blocks: [
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Status:*\n${statusEmoji} ${cma.status}`,
              },
              {
                type: 'mrkdwn',
                text: `*Property:*\n${cma.propertyAddress}`,
              },
              {
                type: 'mrkdwn',
                text: `*Requested:*\n${new Date(cma.requestedAt).toLocaleString()}`,
              },
              {
                type: 'mrkdwn',
                text: `*CMA ID:*\n\`${cma.id}\``,
              },
            ],
          },
        ],
      };
    } catch (error) {
      logger.error('Error in CMA status command', {}, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Handle history command - List user's CMA history
   */
  static async handleHistory(slackUserId: string): Promise<any> {
    try {
      logger.info('Getting CMA history', { slackUserId });

      const history = await CMAService.getCMAHistory(slackUserId, 10);

      if (history.length === 0) {
        return {
          text: '📭 No CMA history found. Generate your first CMA with `/cma <address>`',
          response_type: 'ephemeral',
        };
      }

      const blocks: any[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📊 CMA History (${history.length})`,
          },
        },
        {
          type: 'divider',
        },
      ];

      for (const cma of history) {
        const statusEmoji = {
          pending: '⏳',
          processing: '🔄',
          completed: '✅',
          failed: '❌',
        }[cma.status] || '❓';

        const estimatedValue = cma.estimatedValue as { low: number; mid: number; high: number } | null;
        const valueText = estimatedValue
          ? `$${estimatedValue.mid.toLocaleString()}`
          : 'N/A';

        blocks.push({
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*${cma.propertyAddress}*\n${statusEmoji} ${cma.status}`,
            },
            {
              type: 'mrkdwn',
              text: `*Est. Value:* ${valueText}\n*Comps:* ${cma.compsCount || 0}\n*Date:* ${new Date(cma.requestedAt).toLocaleDateString()}`,
            },
          ],
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details',
            },
            action_id: 'view_cma',
            value: cma.id,
          },
        });
      }

      return {
        text: `CMA History (${history.length} requests)`,
        blocks,
      };
    } catch (error) {
      logger.error('Error in CMA history command', {}, error instanceof Error ? error : undefined);
      throw error;
    }
  }
}

