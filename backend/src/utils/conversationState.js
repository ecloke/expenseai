/**
 * Conversation State Manager
 * Manages multi-step conversations for commands like /create
 */
class ConversationStateManager {
  constructor() {
    this.conversations = new Map(); // userId -> conversationData
  }

  /**
   * Start a new conversation
   */
  startConversation(userId, type, data = {}) {
    this.conversations.set(userId, {
      type,
      step: 0,
      data,
      startedAt: new Date(),
      lastActivity: new Date()
    });
  }

  /**
   * Update conversation step
   */
  updateStep(userId, step, newData = {}) {
    const conversation = this.conversations.get(userId);
    if (conversation) {
      conversation.step = step;
      conversation.data = { ...conversation.data, ...newData };
      conversation.lastActivity = new Date();
    }
  }

  /**
   * Add data to conversation
   */
  addData(userId, key, value) {
    const conversation = this.conversations.get(userId);
    if (conversation) {
      conversation.data[key] = value;
      conversation.lastActivity = new Date();
    }
  }

  /**
   * Get conversation state
   */
  getConversation(userId) {
    const conversation = this.conversations.get(userId);
    if (conversation) {
      // Check if conversation is expired (1 hour)
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (conversation.lastActivity < hourAgo) {
        this.endConversation(userId);
        return null;
      }
    }
    return conversation;
  }

  /**
   * Check if user is in conversation
   */
  isInConversation(userId) {
    return this.getConversation(userId) !== null;
  }

  /**
   * End conversation
   */
  endConversation(userId) {
    this.conversations.delete(userId);
  }

  /**
   * Clean up expired conversations (run periodically)
   */
  cleanupExpiredConversations() {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [userId, conversation] of this.conversations.entries()) {
      if (conversation.lastActivity < hourAgo) {
        this.conversations.delete(userId);
      }
    }
  }
}

export default ConversationStateManager;