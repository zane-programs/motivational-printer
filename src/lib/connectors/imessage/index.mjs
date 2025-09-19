import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import BaseConnector from '../BaseConnector.mjs';

const execAsync = promisify(exec);

export default class IMessageConnector extends BaseConnector {
  constructor() {
    super();
    this.tempDir = join(tmpdir(), `imessage-export-${Date.now()}`);
  }

  /**
   * Execute imessage-exporter command with given options
   * @private
   */
  async _executeExporter(options = {}) {
    const args = [];

    // Add format option (we'll use txt for easier parsing)
    args.push('-f', 'txt');

    // Add export path
    args.push('-o', this.tempDir);

    // Add date filters if provided
    if (options.startDate) {
      args.push('-s', this.formatDate(options.startDate));
    }
    if (options.endDate) {
      args.push('-e', this.formatDate(options.endDate));
    }

    // Add conversation filter if provided
    if (options.conversationFilter) {
      args.push('-t', options.conversationFilter);
    }

    // Ensure temp directory exists
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }

    const command = `imessage-exporter ${args.join(' ')}`;

    try {
      const { stdout, stderr } = await execAsync(command);
      if (stderr && !stderr.includes('Warning')) {
        console.warn('imessage-exporter stderr:', stderr);
      }
      return { stdout, stderr };
    } catch (error) {
      console.error('Error executing imessage-exporter:', error);
      throw error;
    }
  }

  /**
   * Parse exported text files to extract conversation data
   * @private
   */
  _parseExportedFiles() {
    const conversations = [];

    if (!existsSync(this.tempDir)) {
      return conversations;
    }

    const files = readdirSync(this.tempDir);

    for (const file of files) {
      if (!file.endsWith('.txt')) {
        continue;
      }

      const filePath = join(this.tempDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      // Extract conversation info from filename
      // Format: "+number.txt" or "+number1, +number2, +number3.txt" for group chats
      const baseName = file.replace('.txt', '');
      const participants = baseName.split(', ').map(p => p.trim());

      // Parse messages from content
      const messages = [];
      let lastMessageDate = null;
      let currentSender = null;
      let currentTimestamp = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if this line is a timestamp/status line
        // Format: "Mar 24, 2025 12:56:49 PM" or "Mar 24, 2025 12:56:49 PM (Read by you after...)"
        const timestampMatch = line.match(/^([A-Z][a-z]{2} \d{1,2}, \d{4}\s+\d{1,2}:\d{2}:\d{2} [AP]M)(\s*\(.*\))?$/);
        if (timestampMatch) {
          currentTimestamp = new Date(timestampMatch[1]);
          continue;
        }

        // Check if this line is a sender (phone number or "Me")
        if (line === 'Me' || line.match(/^\+\d+$/) || line.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
          currentSender = line;
          continue;
        }

        // If we have both timestamp and sender, this should be message content
        if (currentTimestamp && currentSender && line.trim()) {
          // Skip file paths and system messages
          if (!line.startsWith('/Users/') && !line.includes('Library/Messages/Attachments')) {
            messages.push({
              id: `${file}-${messages.length}`,
              text: line.trim(),
              sender: currentSender,
              timestamp: currentTimestamp,
              isFromMe: currentSender === 'Me'
            });

            lastMessageDate = currentTimestamp;
          }
        }
      }

      if (messages.length > 0) {
        conversations.push({
          id: file.replace('.txt', ''),
          participants,
          lastMessageDate: lastMessageDate || new Date(),
          messageCount: messages.length,
          messages
        });
      }
    }

    return conversations;
  }

  /**
   * Clean up temporary directory
   * @private
   */
  _cleanup() {
    if (existsSync(this.tempDir)) {
      try {
        rmSync(this.tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to cleanup temp directory:', error);
      }
    }
  }

  /**
   * Get conversations within a date range
   */
  async getConversations(startDate, endDate) {
    try {
      await this._executeExporter({ startDate, endDate });
      const parsedData = this._parseExportedFiles();

      // Return conversation metadata without messages
      return parsedData.map(conv => ({
        id: conv.id,
        participants: conv.participants,
        lastMessageDate: conv.lastMessageDate,
        messageCount: conv.messageCount
      }));
    } finally {
      this._cleanup();
    }
  }

  /**
   * Get messages from a specific conversation
   */
  async getConversationMessages(conversationId, startDate, endDate) {
    try {
      // Extract participants from conversationId if possible
      // This is a simplified approach - in production, we'd need better conversation tracking
      const participantMatch = conversationId.match(/Chat with (.+) on/);
      const filter = participantMatch ? participantMatch[1].split(',')[0].trim() : null;

      const options = { startDate, endDate };
      if (filter) {
        options.conversationFilter = filter;
      }

      await this._executeExporter(options);
      const parsedData = this._parseExportedFiles();

      // Find the matching conversation
      const conversation = parsedData.find(conv => conv.id === conversationId);

      if (conversation) {
        return conversation.messages;
      }

      // If exact match not found, return all messages from all conversations
      // This handles cases where conversationId doesn't exactly match
      return parsedData.flatMap(conv => conv.messages);
    } finally {
      this._cleanup();
    }
  }

  /**
   * Get recent messages from all conversations (helper method)
   */
  async getRecentMessages(days = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const conversations = await this.getConversations(startDate, endDate);
    const allMessages = [];

    for (const conv of conversations) {
      const messages = await this.getConversationMessages(conv.id, startDate, endDate);
      allMessages.push(...messages);
    }

    // Sort by timestamp, most recent first
    return allMessages.sort((a, b) => b.timestamp - a.timestamp);
  }
}