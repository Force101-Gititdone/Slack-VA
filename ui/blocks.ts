/**
 * Slack VA Interface - UI Layer
 * 
 * Slack Block Kit components and block builders
 * 
 * This file contains reusable Block Kit components for Slack messages.
 * See: https://api.slack.com/block-kit
 */

/**
 * Create a section block with text
 */
export function createSectionBlock(text: string, accessory?: any) {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text,
    },
    ...(accessory && { accessory }),
  };
}

/**
 * Create a divider block
 */
export function createDividerBlock() {
  return {
    type: 'divider',
  };
}

/**
 * Create a header block
 */
export function createHeaderBlock(text: string) {
  return {
    type: 'header',
    text: {
      type: 'plain_text',
      text,
      emoji: true,
    },
  };
}

/**
 * Create a context block (small text below message)
 */
export function createContextBlock(elements: Array<{ type: string; text: string }>) {
  return {
    type: 'context',
    elements,
  };
}

/**
 * Create a button block
 */
export function createButtonBlock(text: string, actionId: string, value?: string, style?: 'primary' | 'danger') {
  return {
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text,
        },
        action_id: actionId,
        ...(value && { value }),
        ...(style && { style }),
      },
    ],
  };
}

/**
 * Create a fields section (two columns of text)
 */
export function createFieldsSection(fields: string[]) {
  return {
    type: 'section',
    fields: fields.map(field => ({
      type: 'mrkdwn',
      text: field,
    })),
  };
}

/**
 * Format email list as blocks
 */
export function createEmailListBlocks(emails: Array<{ subject: string; sender: string; snippet: string }>) {
  const blocks = [
    createHeaderBlock('📧 Recent Emails'),
    createDividerBlock(),
  ];

  emails.forEach((email, index) => {
    blocks.push(
      createSectionBlock(
        `*${email.subject}*\nFrom: ${email.sender}\n${email.snippet}`
      )
    );
    if (index < emails.length - 1) {
      blocks.push(createDividerBlock());
    }
  });

  return blocks;
}

/**
 * Format CMA result as blocks
 */
export function createCMABlocks(cma: {
  id: string;
  address: string;
  estimatedValue: { low: number; mid: number; high: number };
  status: string;
}) {
  return [
    createHeaderBlock('🏠 CMA Report'),
    createDividerBlock(),
    createSectionBlock(`*Address:*\n${cma.address}`),
    createFieldsSection([
      `*Status:*\n${cma.status}`,
      `*CMA ID:*\n\`${cma.id}\``,
    ]),
    createSectionBlock(
      `*Estimated Value:*\n` +
      `Low: $${cma.estimatedValue.low.toLocaleString()}\n` +
      `Mid: $${cma.estimatedValue.mid.toLocaleString()}\n` +
      `High: $${cma.estimatedValue.high.toLocaleString()}`
    ),
  ];
}

