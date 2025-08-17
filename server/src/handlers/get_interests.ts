import { db } from '../db';
import { interestsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Interest } from '../schema';

export async function getInterestsByMatchRequest(matchRequestId: number): Promise<Interest[]> {
  try {
    const results = await db.select()
      .from(interestsTable)
      .where(eq(interestsTable.match_request_id, matchRequestId))
      .execute();

    return results.map(interest => ({
      ...interest,
      // No numeric conversions needed - all fields are already correct types
    }));
  } catch (error) {
    console.error('Failed to get interests by match request:', error);
    throw error;
  }
}

export async function getInterestsByFieldSlot(fieldSlotId: number): Promise<Interest[]> {
  try {
    const results = await db.select()
      .from(interestsTable)
      .where(eq(interestsTable.field_slot_id, fieldSlotId))
      .execute();

    return results.map(interest => ({
      ...interest,
      // No numeric conversions needed - all fields are already correct types
    }));
  } catch (error) {
    console.error('Failed to get interests by field slot:', error);
    throw error;
  }
}

export async function getInterestsByUser(userId: number): Promise<Interest[]> {
  try {
    const results = await db.select()
      .from(interestsTable)
      .where(eq(interestsTable.user_id, userId))
      .execute();

    return results.map(interest => ({
      ...interest,
      // No numeric conversions needed - all fields are already correct types
    }));
  } catch (error) {
    console.error('Failed to get interests by user:', error);
    throw error;
  }
}