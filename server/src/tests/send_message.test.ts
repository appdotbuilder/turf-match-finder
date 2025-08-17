import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, messagesTable } from '../db/schema';
import { type SendMessageInput } from '../schema';
import { sendMessage } from '../handlers/send_message';
import { eq } from 'drizzle-orm';

// Test users
const testSender = {
  email: 'sender@example.com',
  password_hash: 'hashedpassword123',
  first_name: 'John',
  last_name: 'Sender',
  role: 'player' as const,
  phone: '555-1234'
};

const testReceiver = {
  email: 'receiver@example.com',
  password_hash: 'hashedpassword456',
  first_name: 'Jane',
  last_name: 'Receiver',
  role: 'field_owner' as const,
  phone: '555-5678'
};

const testInput: SendMessageInput = {
  receiver_id: 2, // Will be set after creating receiver
  content: 'Hello, this is a test message!'
};

describe('sendMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should send a message successfully', async () => {
    // Create sender and receiver users
    const [sender, receiver] = await Promise.all([
      db.insert(usersTable).values(testSender).returning().execute(),
      db.insert(usersTable).values(testReceiver).returning().execute()
    ]);

    const senderId = sender[0].id;
    const receiverId = receiver[0].id;

    const messageInput: SendMessageInput = {
      receiver_id: receiverId,
      content: 'Hello, this is a test message!'
    };

    const result = await sendMessage(messageInput, senderId);

    // Verify the returned message
    expect(result.id).toBeDefined();
    expect(result.sender_id).toEqual(senderId);
    expect(result.receiver_id).toEqual(receiverId);
    expect(result.content).toEqual('Hello, this is a test message!');
    expect(result.is_read).toBe(false);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save message to database', async () => {
    // Create sender and receiver users
    const [sender, receiver] = await Promise.all([
      db.insert(usersTable).values(testSender).returning().execute(),
      db.insert(usersTable).values(testReceiver).returning().execute()
    ]);

    const senderId = sender[0].id;
    const receiverId = receiver[0].id;

    const messageInput: SendMessageInput = {
      receiver_id: receiverId,
      content: 'Database persistence test message'
    };

    const result = await sendMessage(messageInput, senderId);

    // Query the database to verify the message was saved
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].sender_id).toEqual(senderId);
    expect(messages[0].receiver_id).toEqual(receiverId);
    expect(messages[0].content).toEqual('Database persistence test message');
    expect(messages[0].is_read).toBe(false);
    expect(messages[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle messages with different content types', async () => {
    // Create sender and receiver users
    const [sender, receiver] = await Promise.all([
      db.insert(usersTable).values(testSender).returning().execute(),
      db.insert(usersTable).values(testReceiver).returning().execute()
    ]);

    const senderId = sender[0].id;
    const receiverId = receiver[0].id;

    const testCases = [
      'Short message',
      'This is a longer message with multiple sentences. It contains punctuation and numbers like 123.',
      '🎉 Message with emojis! 🏈⚽',
      'Message\nwith\nline\nbreaks'
    ];

    for (const content of testCases) {
      const messageInput: SendMessageInput = {
        receiver_id: receiverId,
        content
      };

      const result = await sendMessage(messageInput, senderId);
      expect(result.content).toEqual(content);
    }
  });

  it('should throw error when sender does not exist', async () => {
    // Create only receiver user
    const receiver = await db.insert(usersTable)
      .values(testReceiver)
      .returning()
      .execute();

    const receiverId = receiver[0].id;
    const nonExistentSenderId = 999;

    const messageInput: SendMessageInput = {
      receiver_id: receiverId,
      content: 'This should fail'
    };

    await expect(sendMessage(messageInput, nonExistentSenderId))
      .rejects.toThrow(/sender not found/i);
  });

  it('should throw error when receiver does not exist', async () => {
    // Create only sender user
    const sender = await db.insert(usersTable)
      .values(testSender)
      .returning()
      .execute();

    const senderId = sender[0].id;
    const nonExistentReceiverId = 999;

    const messageInput: SendMessageInput = {
      receiver_id: nonExistentReceiverId,
      content: 'This should fail'
    };

    await expect(sendMessage(messageInput, senderId))
      .rejects.toThrow(/receiver not found/i);
  });

  it('should allow user to send message to themselves', async () => {
    // Create a user who will send message to themselves
    const user = await db.insert(usersTable)
      .values(testSender)
      .returning()
      .execute();

    const userId = user[0].id;

    const messageInput: SendMessageInput = {
      receiver_id: userId,
      content: 'Self message test'
    };

    const result = await sendMessage(messageInput, userId);

    expect(result.sender_id).toEqual(userId);
    expect(result.receiver_id).toEqual(userId);
    expect(result.content).toEqual('Self message test');
  });

  it('should handle multiple messages between same users', async () => {
    // Create sender and receiver users
    const [sender, receiver] = await Promise.all([
      db.insert(usersTable).values(testSender).returning().execute(),
      db.insert(usersTable).values(testReceiver).returning().execute()
    ]);

    const senderId = sender[0].id;
    const receiverId = receiver[0].id;

    // Send multiple messages
    const messages = [
      'First message',
      'Second message',
      'Third message'
    ];

    const results = [];
    for (const content of messages) {
      const messageInput: SendMessageInput = {
        receiver_id: receiverId,
        content
      };
      const result = await sendMessage(messageInput, senderId);
      results.push(result);
    }

    // Verify all messages have different IDs and correct order
    expect(results).toHaveLength(3);
    expect(new Set(results.map(r => r.id)).size).toEqual(3); // All IDs are unique
    
    // Verify all messages in database
    const allMessages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.sender_id, senderId))
      .execute();

    expect(allMessages).toHaveLength(3);
    expect(allMessages.map(m => m.content)).toEqual(messages);
  });
});