import { type SendMessageInput, type Message } from '../schema';

export async function sendMessage(input: SendMessageInput, senderId: number): Promise<Message> {
  // This is a placeholder declaration! Real code should be implemented here.
  // The goal of this handler is to send a message from one user to another
  // and persist it in the database.
  return Promise.resolve({
    id: 0, // Placeholder ID
    sender_id: senderId,
    receiver_id: input.receiver_id,
    content: input.content,
    is_read: false,
    created_at: new Date()
  } as Message);
}