import { db } from '../db';
import { teamMembersTable, teamsTable, usersTable } from '../db/schema';
import { type AddTeamMemberInput, type TeamMember } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function addTeamMember(input: AddTeamMemberInput, captainId: number): Promise<TeamMember> {
  try {
    // First, verify that the requester is the captain of the team
    const team = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.id, input.team_id))
      .execute();

    if (team.length === 0) {
      throw new Error('Team not found');
    }

    if (team[0].captain_id !== captainId) {
      throw new Error('Only the team captain can add members');
    }

    // Verify that the user to be added exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error('User not found');
    }

    // Check if the user is already a member of the team
    const existingMember = await db.select()
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.team_id, input.team_id),
          eq(teamMembersTable.user_id, input.user_id)
        )
      )
      .execute();

    if (existingMember.length > 0) {
      throw new Error('User is already a member of this team');
    }

    // Add the team member
    const result = await db.insert(teamMembersTable)
      .values({
        team_id: input.team_id,
        user_id: input.user_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Failed to add team member:', error);
    throw error;
  }
}

export async function removeTeamMember(teamId: number, userId: number, captainId: number): Promise<boolean> {
  try {
    // First, verify that the requester is the captain of the team
    const team = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.id, teamId))
      .execute();

    if (team.length === 0) {
      throw new Error('Team not found');
    }

    if (team[0].captain_id !== captainId) {
      throw new Error('Only the team captain can remove members');
    }

    // Prevent the captain from removing themselves
    if (userId === captainId) {
      throw new Error('Captain cannot remove themselves from the team');
    }

    // Check if the user is actually a member of the team
    const existingMember = await db.select()
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.team_id, teamId),
          eq(teamMembersTable.user_id, userId)
        )
      )
      .execute();

    if (existingMember.length === 0) {
      throw new Error('User is not a member of this team');
    }

    // Remove the team member
    const result = await db.delete(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.team_id, teamId),
          eq(teamMembersTable.user_id, userId)
        )
      )
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Failed to remove team member:', error);
    throw error;
  }
}

export async function getTeamMembers(teamId: number): Promise<TeamMember[]> {
  try {
    // Verify that the team exists
    const team = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.id, teamId))
      .execute();

    if (team.length === 0) {
      throw new Error('Team not found');
    }

    // Get all team members
    const members = await db.select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.team_id, teamId))
      .execute();

    return members;
  } catch (error) {
    console.error('Failed to get team members:', error);
    throw error;
  }
}