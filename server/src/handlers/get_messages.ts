import { db } from '../db';
import { messagesTable } from '../db/schema';
import { type Message } from '../schema';
import { eq, or, and, asc, desc, SQL } from 'drizzle-orm';

export async function getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]> {
  try {
    const results = await db.select()
      .from(messagesTable)
      .where(
        or(
          and(eq(messagesTable.sender_id, userId1), eq(messagesTable.receiver_id, userId2)),
          and(eq(messagesTable.sender_id, userId2), eq(messagesTable.receiver_id, userId1))
        )
      )
      .orderBy(asc(messagesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch messages between users:', error);
    throw error;
  }
}

export async function getConversations(userId: number): Promise<Message[]> {
  try {
    // Get all distinct user IDs that have conversed with the given user
    const sendersQuery = db.selectDistinct({
      partner_id: messagesTable.sender_id
    })
    .from(messagesTable)
    .where(eq(messagesTable.receiver_id, userId));

    const receiversQuery = db.selectDistinct({
      partner_id: messagesTable.receiver_id
    })
    .from(messagesTable)
    .where(eq(messagesTable.sender_id, userId));

    const [senders, receivers] = await Promise.all([
      sendersQuery.execute(),
      receiversQuery.execute()
    ]);

    // Combine and deduplicate partner IDs
    const partnerIds = new Set<number>();
    senders.forEach(s => partnerIds.add(s.partner_id));
    receivers.forEach(r => partnerIds.add(r.partner_id));
    partnerIds.delete(userId); // Remove self if present

    if (partnerIds.size === 0) {
      return [];
    }

    // For each partner, get the most recent message
    const latestMessages: Message[] = [];
    
    for (const partnerId of partnerIds) {
      const latestMessage = await db.select()
        .from(messagesTable)
        .where(
          or(
            and(eq(messagesTable.sender_id, userId), eq(messagesTable.receiver_id, partnerId)),
            and(eq(messagesTable.sender_id, partnerId), eq(messagesTable.receiver_id, userId))
          )
        )
        .orderBy(desc(messagesTable.created_at))
        .limit(1)
        .execute();

      if (latestMessage.length > 0) {
        latestMessages.push(latestMessage[0]);
      }
    }

    // Sort by created_at descending to show most recent conversations first
    return latestMessages.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    throw error;
  }
}

export async function markMessagesAsRead(senderId: number, receiverId: number): Promise<boolean> {
  try {
    await db.update(messagesTable)
      .set({ is_read: true })
      .where(
        and(
          eq(messagesTable.sender_id, senderId),
          eq(messagesTable.receiver_id, receiverId),
          eq(messagesTable.is_read, false)
        )
      )
      .execute();

    return true;
  } catch (error) {
    console.error('Failed to mark messages as read:', error);
    throw error;
  }
}