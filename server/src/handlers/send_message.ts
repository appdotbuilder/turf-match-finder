import { db } from '../db';
import { messagesTable, usersTable } from '../db/schema';
import { type SendMessageInput, type Message } from '../schema';
import { eq } from 'drizzle-orm';

export async function sendMessage(input: SendMessageInput, senderId: number): Promise<Message> {
  try {
    // Verify that both sender and receiver exist
    const [sender, receiver] = await Promise.all([
      db.select().from(usersTable).where(eq(usersTable.id, senderId)).execute(),
      db.select().from(usersTable).where(eq(usersTable.id, input.receiver_id)).execute()
    ]);

    if (sender.length === 0) {
      throw new Error('Sender not found');
    }

    if (receiver.length === 0) {
      throw new Error('Receiver not found');
    }

    // Insert the message
    const result = await db.insert(messagesTable)
      .values({
        sender_id: senderId,
        receiver_id: input.receiver_id,
        content: input.content,
        is_read: false
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Message sending failed:', error);
    throw error;
  }
}