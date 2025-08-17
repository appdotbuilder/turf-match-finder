import { db } from '../db';
import { ratingsTable } from '../db/schema';
import { type Rating } from '../schema';
import { eq, avg } from 'drizzle-orm';

export async function getRatingsByTeam(teamId: number): Promise<Rating[]> {
  try {
    const results = await db.select()
      .from(ratingsTable)
      .where(eq(ratingsTable.rated_team_id, teamId))
      .execute();

    return results.map(rating => ({
      ...rating,
      // No numeric conversions needed - rating is integer, others are text/timestamp
    }));
  } catch (error) {
    console.error('Failed to get ratings by team:', error);
    throw error;
  }
}

export async function getAverageRatingByTeam(teamId: number): Promise<number> {
  try {
    const result = await db.select({
      average: avg(ratingsTable.rating)
    })
      .from(ratingsTable)
      .where(eq(ratingsTable.rated_team_id, teamId))
      .execute();

    // avg() returns a string representation of decimal, need to parse to number
    const averageValue = result[0]?.average;
    return averageValue ? parseFloat(averageValue) : 0;
  } catch (error) {
    console.error('Failed to get average rating by team:', error);
    throw error;
  }
}