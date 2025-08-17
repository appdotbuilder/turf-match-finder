import { db } from '../db';
import { matchRequestsTable } from '../db/schema';
import { type CreateMatchRequestInput, type MatchRequest } from '../schema';

export const createMatchRequest = async (input: CreateMatchRequestInput, creatorId: number): Promise<MatchRequest> => {
  try {
    // Insert match request record
    const result = await db.insert(matchRequestsTable)
      .values({
        creator_id: creatorId,
        team_id: input.team_id || null,
        type: input.type,
        title: input.title,
        description: input.description || null,
        preferred_date: input.preferred_date || null,
        preferred_location: input.preferred_location || null,
        skill_level: input.skill_level,
        max_fee: input.max_fee ? input.max_fee.toString() : null, // Convert number to string for numeric column
        players_needed: input.players_needed || null,
        is_active: true
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const matchRequest = result[0];
    return {
      ...matchRequest,
      max_fee: matchRequest.max_fee ? parseFloat(matchRequest.max_fee) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Match request creation failed:', error);
    throw error;
  }
};