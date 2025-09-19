export default class BaseConnector {
  constructor() {
    if (new.target === BaseConnector) {
      throw new Error("BaseConnector is an abstract class and cannot be instantiated directly");
    }
  }

  /**
   * Get conversations within a date range
   * @param {Date} startDate - Start date for filtering
   * @param {Date} endDate - End date for filtering
   * @returns {Promise<Array<{id: string, participants: string[], lastMessageDate: Date, messageCount: number}>>}
   */
  async getConversations(startDate, endDate) {
    throw new Error("getConversations() must be implemented by subclass");
  }

  /**
   * Get messages from a specific conversation
   * @param {string} conversationId - The conversation identifier
   * @param {Date} [startDate] - Optional start date for filtering
   * @param {Date} [endDate] - Optional end date for filtering
   * @returns {Promise<Array<{id: string, text: string, sender: string, timestamp: Date, isFromMe: boolean}>>}
   */
  async getConversationMessages(conversationId, startDate, endDate) {
    throw new Error("getConversationMessages() must be implemented by subclass");
  }

  /**
   * Format date for use in commands or APIs
   * @param {Date} date
   * @returns {string}
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Parse timestamp to Date object
   * @param {string|number} timestamp
   * @returns {Date}
   */
  parseTimestamp(timestamp) {
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    if (typeof timestamp === 'number') {
      // Check if it's a Unix timestamp in seconds or milliseconds
      const secondsSince1970 = timestamp < 10000000000;
      return new Date(secondsSince1970 ? timestamp * 1000 : timestamp);
    }
    return new Date(timestamp);
  }
}