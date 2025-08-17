import { db } from '../db';
import { teamsTable, teamMembersTable } from '../db/schema';
import { type Team } from '../schema';
import { eq, or } from 'drizzle-orm';

export async function getTeams(): Promise<Team[]> {
  try {
    const results = await db.select()
      .from(teamsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    throw error;
  }
}

export async function getTeamsByUser(userId: number): Promise<Team[]> {
  try {
    // Get teams where user is captain
    const captainTeams = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.captain_id, userId))
      .execute();

    // Get teams where user is a member
    const memberTeams = await db.select({
      id: teamsTable.id,
      captain_id: teamsTable.captain_id,
      name: teamsTable.name,
      description: teamsTable.description,
      skill_level: teamsTable.skill_level,
      created_at: teamsTable.created_at,
      updated_at: teamsTable.updated_at
    })
      .from(teamsTable)
      .innerJoin(teamMembersTable, eq(teamsTable.id, teamMembersTable.team_id))
      .where(eq(teamMembersTable.user_id, userId))
      .execute();

    // Combine results and remove duplicates
    const allTeams = [...captainTeams, ...memberTeams];
    const uniqueTeams = allTeams.reduce((acc, team) => {
      if (!acc.find(t => t.id === team.id)) {
        acc.push(team);
      }
      return acc;
    }, [] as typeof allTeams);

    return uniqueTeams;
  } catch (error) {
    console.error('Failed to fetch teams by user:', error);
    throw error;
  }
}