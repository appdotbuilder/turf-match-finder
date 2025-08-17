import { db } from '../db';
import { teamsTable, usersTable } from '../db/schema';
import { type CreateTeamInput, type Team } from '../schema';
import { eq } from 'drizzle-orm';

export async function createTeam(input: CreateTeamInput, captainId: number): Promise<Team> {
  try {
    // Verify the captain exists
    const captainExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, captainId))
      .execute();

    if (captainExists.length === 0) {
      throw new Error(`Captain with ID ${captainId} does not exist`);
    }

    // Insert team record
    const result = await db.insert(teamsTable)
      .values({
        captain_id: captainId,
        name: input.name,
        description: input.description || null,
        skill_level: input.skill_level
      })
      .returning()
      .execute();

    const team = result[0];
    return {
      ...team,
      // Convert any numeric fields if they exist (currently none in teams table)
    };
  } catch (error) {
    console.error('Team creation failed:', error);
    throw error;
  }
}