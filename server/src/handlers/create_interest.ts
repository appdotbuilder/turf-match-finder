import { db } from '../db';
import { interestsTable, matchRequestsTable, fieldSlotsTable, usersTable } from '../db/schema';
import { type CreateInterestInput, type Interest } from '../schema';
import { eq } from 'drizzle-orm';

export const createInterest = async (input: CreateInterestInput, userId: number): Promise<Interest> => {
  try {
    // Validate user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    // Validate the referenced entity exists based on interest type
    if (input.type === 'match_request') {
      if (!input.match_request_id) {
        throw new Error('match_request_id is required for match_request interest type');
      }

      const matchRequest = await db.select()
        .from(matchRequestsTable)
        .where(eq(matchRequestsTable.id, input.match_request_id))
        .execute();

      if (matchRequest.length === 0) {
        throw new Error(`Match request with id ${input.match_request_id} not found`);
      }
    }

    if (input.type === 'field_slot') {
      if (!input.field_slot_id) {
        throw new Error('field_slot_id is required for field_slot interest type');
      }

      const fieldSlot = await db.select()
        .from(fieldSlotsTable)
        .where(eq(fieldSlotsTable.id, input.field_slot_id))
        .execute();

      if (fieldSlot.length === 0) {
        throw new Error(`Field slot with id ${input.field_slot_id} not found`);
      }
    }

    // Insert interest record
    const result = await db.insert(interestsTable)
      .values({
        user_id: userId,
        type: input.type,
        match_request_id: input.match_request_id || null,
        field_slot_id: input.field_slot_id || null,
        message: input.message || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Interest creation failed:', error);
    throw error;
  }
};