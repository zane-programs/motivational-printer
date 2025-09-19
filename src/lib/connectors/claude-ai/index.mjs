import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import BaseConnector from '../BaseConnector.mjs';
import { constructTree, formatMessages } from './tree.mjs';
import { ClaudeAuthManager } from './auth.mjs';
import { createClaudeClient } from './PuppeteerClient.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default class ClaudeAIConnector extends BaseConnector {
  constructor(options = {}) {
    super();

    // Default to reading from Claude's local storage
    this.dataPath = options.dataPath || this._getDefaultDataPath();
    this.organizationId = options.organizationId;
    this.baseUrl = options.baseUrl || 'https://claude.ai/api';

    // Initialize authentication manager
    this.authManager = new ClaudeAuthManager({
      organizationId: this.organizationId,
      sessionFile: options.sessionFile
    });

    // Determine authentication mode
    this.useAuthentication = options.useAuthentication !== false; // Default to true
  }

  /**
   * Get the default path to Claude's local data
   * @private
   */
  _getDefaultDataPath() {
    // This would need to be adjusted based on where Claude stores data
    // For now, we'll use a mock path
    return join(homedir(), '.claude', 'conversations.json');
  }

  /**
   * Read conversations from API or fallback sources
   * @private
   */
  async _fetchConversations() {
    // Try authenticated API first
    if (this.useAuthentication) {
      try {
        console.log('Fetching conversations from Claude.ai API...');
        return await this._fetchFromAPI('/chat_conversations');
      } catch (error) {
        console.warn('API fetch failed, falling back to mock data:', error.message);
        if (error.message.includes('Authentication failed')) {
          console.warn('💡 Run: node extract-claude-session.mjs to refresh your session');
        }
      }
    }

    // Try to read from local storage
    if (existsSync(this.dataPath)) {
      console.log('Reading conversations from local file...');
      const data = readFileSync(this.dataPath, 'utf-8');
      return JSON.parse(data);
    }

    // Final fallback: mock data
    console.log('Using mock conversation data...');
    return this._getMockConversations();
  }

  /**
   * Fetch data from Claude API using PuppeteerClient with stealth protection
   * @private
   */
  async _fetchFromAPI(endpoint, params = {}) {
    if (!this.useAuthentication) {
      throw new Error('Authentication disabled but API call attempted');
    }

    // Get organization ID from auth manager if not provided
    const orgId = this.organizationId || this._getOrgIdFromSession();

    const url = new URL(`${this.baseUrl}/organizations/${orgId}${endpoint}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    // Get authenticated headers
    const headers = this.authManager.getAuthHeaders();
    headers['Content-Type'] = 'application/json';

    const client = createClaudeClient();

    try {
      const response = await client.get(url.toString(), {
        headers,
        parseResponse: 'json'
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failed: ${response.status}. Session may be expired. Run: node extract-claude-session.mjs`);
        }
        throw new Error(`Claude AI API error: ${response.status} ${response.statusText}`);
      }

      return response.data;

    } finally {
      await client.close();
    }
  }

  /**
   * Get organization ID from saved session
   * @private
   */
  _getOrgIdFromSession() {
    try {
      const session = this.authManager.loadSession();
      return session.organizationId;
    } catch (error) {
      throw new Error('No organization ID available. Set CLAUDE_ORG_ID or extract session with org ID.');
    }
  }

  /**
   * Get mock conversations for testing
   * @private
   */
  _getMockConversations() {
    return [
      {
        uuid: 'mock-conv-1',
        name: 'Mock Conversation 1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        chat_messages: [
          {
            uuid: 'msg-1',
            text: 'Hello Claude',
            sender: 'human',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            parent_message_uuid: null
          },
          {
            uuid: 'msg-2',
            text: 'Hello! How can I help you today?',
            sender: 'assistant',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            parent_message_uuid: 'msg-1'
          }
        ],
        current_leaf_message_uuid: 'msg-2'
      }
    ];
  }

  /**
   * Get conversations within a date range
   */
  async getConversations(startDate, endDate) {
    const allConversations = await this._fetchConversations();

    // Filter by date range
    const filtered = allConversations.filter(conv => {
      const updatedAt = new Date(conv.updated_at);
      return (!startDate || updatedAt >= startDate) &&
             (!endDate || updatedAt <= endDate);
    });

    // Transform to our standard format
    return filtered.map(conv => ({
      id: conv.uuid,
      name: conv.name || 'Untitled',
      participants: ['human', 'assistant'],
      lastMessageDate: new Date(conv.updated_at),
      messageCount: conv.chat_messages ? conv.chat_messages.length : 0
    }));
  }

  /**
   * Get messages from a specific conversation
   */
  async getConversationMessages(conversationId, startDate, endDate) {
    // Try authenticated API first
    if (this.useAuthentication) {
      try {
        const data = await this._fetchFromAPI(
          `/chat_conversations/${conversationId}`,
          { tree: 'True', rendering_mode: 'messages' }
        );

        // Use the tree utility to construct the conversation
        const messages = constructTree(data);
        const formatted = formatMessages(messages);

        // Filter by date if needed
        return formatted
          .filter(msg => {
            const msgDate = msg.created_at;
            return (!startDate || msgDate >= startDate) &&
                   (!endDate || msgDate <= endDate);
          })
          .map(msg => ({
            id: msg.uuid,
            text: msg.text,
            sender: msg.role === 'human' ? 'human' : 'assistant',
            timestamp: msg.created_at,
            isFromMe: msg.role === 'human'
          }));
      } catch (error) {
        console.warn('API message fetch failed, falling back to mock data:', error.message);
      }
    }

    // Fallback: get from local storage or mock
    const conversations = await this._fetchConversations();
    const conversation = conversations.find(conv => conv.uuid === conversationId);

    if (!conversation || !conversation.chat_messages) {
      return [];
    }

    // Use tree utility to construct proper message order
    const messages = constructTree({
      chat_messages: conversation.chat_messages,
      current_leaf_message_uuid: conversation.current_leaf_message_uuid
    });
    const formatted = formatMessages(messages);

    // Filter by date and transform
    return formatted
      .filter(msg => {
        const msgDate = msg.created_at;
        return (!startDate || msgDate >= startDate) &&
               (!endDate || msgDate <= endDate);
      })
      .map(msg => ({
        id: msg.uuid,
        text: msg.text,
        sender: msg.role === 'human' ? 'human' : 'assistant',
        timestamp: msg.created_at,
        isFromMe: msg.role === 'human'
      }));
  }

  /**
   * Get recent messages from all conversations
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

  /**
   * Export conversations to a file for backup/analysis
   */
  async exportConversations(outputPath) {
    const conversations = await this._fetchConversations();
    writeFileSync(outputPath, JSON.stringify(conversations, null, 2));
    return `Exported ${conversations.length} conversations to ${outputPath}`;
  }
}