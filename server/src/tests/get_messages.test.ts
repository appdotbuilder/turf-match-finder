import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, messagesTable } from '../db/schema';
import { getMessagesBetweenUsers, getConversations, markMessagesAsRead } from '../handlers/get_messages';

// Test users
const testUser1 = {
  email: 'user1@test.com',
  password_hash: 'hash1',
  first_name: 'User',
  last_name: 'One',
  role: 'player' as const
};

const testUser2 = {
  email: 'user2@test.com',
  password_hash: 'hash2',
  first_name: 'User',
  last_name: 'Two',
  role: 'player' as const
};

const testUser3 = {
  email: 'user3@test.com',
  password_hash: 'hash3',
  first_name: 'User',
  last_name: 'Three',
  role: 'player' as const
};

describe('Message handlers', () => {
  let user1Id: number;
  let user2Id: number;
  let user3Id: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2, testUser3])
      .returning()
      .execute();
    
    user1Id = users[0].id;
    user2Id = users[1].id;
    user3Id = users[2].id;
  });

  afterEach(resetDB);

  describe('getMessagesBetweenUsers', () => {
    it('should return empty array when no messages exist', async () => {
      const result = await getMessagesBetweenUsers(user1Id, user2Id);
      expect(result).toEqual([]);
    });

    it('should fetch messages between two users in chronological order', async () => {
      // Create test messages
      const messages = [
        {
          sender_id: user1Id,
          receiver_id: user2Id,
          content: 'Hello from user1',
          is_read: false
        },
        {
          sender_id: user2Id,
          receiver_id: user1Id,
          content: 'Hello back from user2',
          is_read: false
        },
        {
          sender_id: user1Id,
          receiver_id: user2Id,
          content: 'How are you?',
          is_read: true
        }
      ];

      await db.insert(messagesTable)
        .values(messages)
        .execute();

      const result = await getMessagesBetweenUsers(user1Id, user2Id);

      expect(result).toHaveLength(3);
      expect(result[0].content).toBe('Hello from user1');
      expect(result[1].content).toBe('Hello back from user2');
      expect(result[2].content).toBe('How are you?');
      
      // Verify chronological order
      expect(result[0].created_at <= result[1].created_at).toBe(true);
      expect(result[1].created_at <= result[2].created_at).toBe(true);
    });

    it('should work in both directions (userId1 to userId2 and userId2 to userId1)', async () => {
      const message = {
        sender_id: user1Id,
        receiver_id: user2Id,
        content: 'Test message',
        is_read: false
      };

      await db.insert(messagesTable)
        .values([message])
        .execute();

      // Should return same result regardless of parameter order
      const result1 = await getMessagesBetweenUsers(user1Id, user2Id);
      const result2 = await getMessagesBetweenUsers(user2Id, user1Id);

      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
      expect(result1[0].content).toBe(result2[0].content);
    });

    it('should not return messages from other conversations', async () => {
      const messages = [
        {
          sender_id: user1Id,
          receiver_id: user2Id,
          content: 'Message between 1 and 2',
          is_read: false
        },
        {
          sender_id: user1Id,
          receiver_id: user3Id,
          content: 'Message between 1 and 3',
          is_read: false
        },
        {
          sender_id: user2Id,
          receiver_id: user3Id,
          content: 'Message between 2 and 3',
          is_read: false
        }
      ];

      await db.insert(messagesTable)
        .values(messages)
        .execute();

      const result = await getMessagesBetweenUsers(user1Id, user2Id);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Message between 1 and 2');
    });

    it('should include all message fields', async () => {
      const message = {
        sender_id: user1Id,
        receiver_id: user2Id,
        content: 'Test message with all fields',
        is_read: true
      };

      await db.insert(messagesTable)
        .values([message])
        .execute();

      const result = await getMessagesBetweenUsers(user1Id, user2Id);

      expect(result).toHaveLength(1);
      const msg = result[0];
      expect(msg.id).toBeDefined();
      expect(msg.sender_id).toBe(user1Id);
      expect(msg.receiver_id).toBe(user2Id);
      expect(msg.content).toBe('Test message with all fields');
      expect(msg.is_read).toBe(true);
      expect(msg.created_at).toBeInstanceOf(Date);
    });
  });

  describe('getConversations', () => {
    it('should return empty array when user has no conversations', async () => {
      const result = await getConversations(user1Id);
      expect(result).toEqual([]);
    });

    it('should return latest message from each conversation', async () => {
      // Create messages with different users
      const messages = [
        {
          sender_id: user1Id,
          receiver_id: user2Id,
          content: 'First message to user2',
          is_read: false
        },
        {
          sender_id: user2Id,
          receiver_id: user1Id,
          content: 'Latest message from user2',
          is_read: false
        },
        {
          sender_id: user1Id,
          receiver_id: user3Id,
          content: 'Message to user3',
          is_read: false
        },
        {
          sender_id: user3Id,
          receiver_id: user1Id,
          content: 'Latest message from user3',
          is_read: true
        }
      ];

      // Insert messages with small delays to ensure different timestamps
      for (const message of messages) {
        await db.insert(messagesTable)
          .values([message])
          .execute();
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      }

      const result = await getConversations(user1Id);

      expect(result).toHaveLength(2);
      
      // Should contain latest message from each conversation
      const contents = result.map(msg => msg.content);
      expect(contents).toContain('Latest message from user2');
      expect(contents).toContain('Latest message from user3');
      
      // Should be ordered by most recent first
      expect(result[0].created_at >= result[1].created_at).toBe(true);
    });

    it('should handle conversations where user is both sender and receiver', async () => {
      const messages = [
        {
          sender_id: user1Id,
          receiver_id: user2Id,
          content: 'User1 to User2',
          is_read: false
        },
        {
          sender_id: user2Id,
          receiver_id: user1Id,
          content: 'User2 to User1 (latest)',
          is_read: false
        }
      ];

      // Insert with delay
      await db.insert(messagesTable)
        .values([messages[0]])
        .execute();
      await new Promise(resolve => setTimeout(resolve, 10));
      await db.insert(messagesTable)
        .values([messages[1]])
        .execute();

      const result = await getConversations(user1Id);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('User2 to User1 (latest)');
    });

    it('should not include self-messages in conversation list', async () => {
      // This scenario shouldn't normally happen but let's handle it
      const messages = [
        {
          sender_id: user1Id,
          receiver_id: user1Id,
          content: 'Self message',
          is_read: false
        },
        {
          sender_id: user1Id,
          receiver_id: user2Id,
          content: 'Normal message',
          is_read: false
        }
      ];

      await db.insert(messagesTable)
        .values(messages)
        .execute();

      const result = await getConversations(user1Id);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Normal message');
    });
  });

  describe('markMessagesAsRead', () => {
    it('should mark unread messages as read', async () => {
      const messages = [
        {
          sender_id: user1Id,
          receiver_id: user2Id,
          content: 'Message 1',
          is_read: false
        },
        {
          sender_id: user1Id,
          receiver_id: user2Id,
          content: 'Message 2',
          is_read: false
        }
      ];

      await db.insert(messagesTable)
        .values(messages)
        .execute();

      const result = await markMessagesAsRead(user1Id, user2Id);
      expect(result).toBe(true);

      // Verify messages are marked as read
      const updatedMessages = await getMessagesBetweenUsers(user1Id, user2Id);
      expect(updatedMessages).toHaveLength(2);
      updatedMessages.forEach(msg => {
        expect(msg.is_read).toBe(true);
      });
    });

    it('should only mark messages from specific sender to receiver', async () => {
      const messages = [
        {
          sender_id: user1Id,
          receiver_id: user2Id,
          content: 'From user1 to user2',
          is_read: false
        },
        {
          sender_id: user2Id,
          receiver_id: user1Id,
          content: 'From user2 to user1',
          is_read: false
        },
        {
          sender_id: user1Id,
          receiver_id: user3Id,
          content: 'From user1 to user3',
          is_read: false
        }
      ];

      await db.insert(messagesTable)
        .values(messages)
        .execute();

      const result = await markMessagesAsRead(user1Id, user2Id);
      expect(result).toBe(true);

      // Verify only specific messages are marked as read
      const allMessages = await db.select()
        .from(messagesTable)
        .execute();

      const user1ToUser2 = allMessages.find(m => 
        m.sender_id === user1Id && m.receiver_id === user2Id
      );
      const user2ToUser1 = allMessages.find(m => 
        m.sender_id === user2Id && m.receiver_id === user1Id
      );
      const user1ToUser3 = allMessages.find(m => 
        m.sender_id === user1Id && m.receiver_id === user3Id
      );

      expect(user1ToUser2?.is_read).toBe(true);
      expect(user2ToUser1?.is_read).toBe(false); // Should remain unread
      expect(user1ToUser3?.is_read).toBe(false); // Should remain unread
    });

    it('should not affect already read messages', async () => {
      const message = {
        sender_id: user1Id,
        receiver_id: user2Id,
        content: 'Already read message',
        is_read: true
      };

      await db.insert(messagesTable)
        .values([message])
        .execute();

      const result = await markMessagesAsRead(user1Id, user2Id);
      expect(result).toBe(true);

      // Verify message remains read
      const messages = await getMessagesBetweenUsers(user1Id, user2Id);
      expect(messages).toHaveLength(1);
      expect(messages[0].is_read).toBe(true);
    });

    it('should return true even when no messages need updating', async () => {
      // No messages exist
      const result = await markMessagesAsRead(user1Id, user2Id);
      expect(result).toBe(true);
    });
  });
});