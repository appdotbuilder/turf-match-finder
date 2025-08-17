import { db } from '../db';
import { ratingsTable, teamsTable } from '../db/schema';
import { type CreateRatingInput, type Rating } from '../schema';
import { eq } from 'drizzle-orm';

export async function createRating(input: CreateRatingInput, raterId: number): Promise<Rating> {
  try {
    // Verify the rated team exists
    const team = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.id, input.rated_team_id))
      .execute();

    if (team.length === 0) {
      throw new Error('Rated team not found');
    }

    // Insert rating record
    const result = await db.insert(ratingsTable)
      .values({
        rater_id: raterId,
        rated_team_id: input.rated_team_id,
        rating: input.rating,
        comment: input.comment || null
      })
      .returning()
      .execute();

    const rating = result[0];
    return {
      ...rating,
      created_at: rating.created_at
    };
  } catch (error) {
    console.error('Rating creation failed:', error);
    throw error;
  }
}