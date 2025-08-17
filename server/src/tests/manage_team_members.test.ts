import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, teamMembersTable } from '../db/schema';
import { type AddTeamMemberInput } from '../schema';
import { addTeamMember, removeTeamMember, getTeamMembers } from '../handlers/manage_team_members';
import { eq, and } from 'drizzle-orm';

describe('Team Member Management', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let captain: any;
  let member1: any;
  let member2: any;
  let team: any;
  let otherUser: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'captain@test.com',
          password_hash: 'hash1',
          first_name: 'Captain',
          last_name: 'Test',
          role: 'player'
        },
        {
          email: 'member1@test.com',
          password_hash: 'hash2',
          first_name: 'Member',
          last_name: 'One',
          role: 'player'
        },
        {
          email: 'member2@test.com',
          password_hash: 'hash3',
          first_name: 'Member',
          last_name: 'Two',
          role: 'player'
        },
        {
          email: 'other@test.com',
          password_hash: 'hash4',
          first_name: 'Other',
          last_name: 'User',
          role: 'player'
        }
      ])
      .returning()
      .execute();

    captain = users[0];
    member1 = users[1];
    member2 = users[2];
    otherUser = users[3];

    // Create a test team
    const teams = await db.insert(teamsTable)
      .values({
        captain_id: captain.id,
        name: 'Test Team',
        description: 'A team for testing',
        skill_level: 5
      })
      .returning()
      .execute();

    team = teams[0];
  });

  describe('addTeamMember', () => {
    it('should add a member to the team successfully', async () => {
      const input: AddTeamMemberInput = {
        team_id: team.id,
        user_id: member1.id
      };

      const result = await addTeamMember(input, captain.id);

      expect(result.team_id).toBe(team.id);
      expect(result.user_id).toBe(member1.id);
      expect(result.id).toBeDefined();
      expect(result.joined_at).toBeInstanceOf(Date);
    });

    it('should save the team member to database', async () => {
      const input: AddTeamMemberInput = {
        team_id: team.id,
        user_id: member1.id
      };

      await addTeamMember(input, captain.id);

      const savedMembers = await db.select()
        .from(teamMembersTable)
        .where(
          and(
            eq(teamMembersTable.team_id, team.id),
            eq(teamMembersTable.user_id, member1.id)
          )
        )
        .execute();

      expect(savedMembers).toHaveLength(1);
      expect(savedMembers[0].team_id).toBe(team.id);
      expect(savedMembers[0].user_id).toBe(member1.id);
    });

    it('should throw error when non-captain tries to add member', async () => {
      const input: AddTeamMemberInput = {
        team_id: team.id,
        user_id: member1.id
      };

      await expect(addTeamMember(input, member2.id))
        .rejects.toThrow(/only the team captain can add members/i);
    });

    it('should throw error when team does not exist', async () => {
      const input: AddTeamMemberInput = {
        team_id: 999,
        user_id: member1.id
      };

      await expect(addTeamMember(input, captain.id))
        .rejects.toThrow(/team not found/i);
    });

    it('should throw error when user does not exist', async () => {
      const input: AddTeamMemberInput = {
        team_id: team.id,
        user_id: 999
      };

      await expect(addTeamMember(input, captain.id))
        .rejects.toThrow(/user not found/i);
    });

    it('should throw error when user is already a team member', async () => {
      const input: AddTeamMemberInput = {
        team_id: team.id,
        user_id: member1.id
      };

      // Add member first time
      await addTeamMember(input, captain.id);

      // Try to add the same member again
      await expect(addTeamMember(input, captain.id))
        .rejects.toThrow(/user is already a member of this team/i);
    });
  });

  describe('removeTeamMember', () => {
    beforeEach(async () => {
      // Add a member to remove in tests
      await db.insert(teamMembersTable)
        .values({
          team_id: team.id,
          user_id: member1.id
        })
        .execute();
    });

    it('should remove a member from the team successfully', async () => {
      const result = await removeTeamMember(team.id, member1.id, captain.id);

      expect(result).toBe(true);

      // Verify member is removed from database
      const remainingMembers = await db.select()
        .from(teamMembersTable)
        .where(
          and(
            eq(teamMembersTable.team_id, team.id),
            eq(teamMembersTable.user_id, member1.id)
          )
        )
        .execute();

      expect(remainingMembers).toHaveLength(0);
    });

    it('should throw error when non-captain tries to remove member', async () => {
      await expect(removeTeamMember(team.id, member1.id, member2.id))
        .rejects.toThrow(/only the team captain can remove members/i);
    });

    it('should throw error when team does not exist', async () => {
      await expect(removeTeamMember(999, member1.id, captain.id))
        .rejects.toThrow(/team not found/i);
    });

    it('should throw error when captain tries to remove themselves', async () => {
      await expect(removeTeamMember(team.id, captain.id, captain.id))
        .rejects.toThrow(/captain cannot remove themselves from the team/i);
    });

    it('should throw error when user is not a team member', async () => {
      await expect(removeTeamMember(team.id, member2.id, captain.id))
        .rejects.toThrow(/user is not a member of this team/i);
    });

    it('should return false when trying to remove non-existent member', async () => {
      // First remove the member
      await removeTeamMember(team.id, member1.id, captain.id);

      // Try to remove again - should throw error
      await expect(removeTeamMember(team.id, member1.id, captain.id))
        .rejects.toThrow(/user is not a member of this team/i);
    });
  });

  describe('getTeamMembers', () => {
    it('should return empty array for team with no members', async () => {
      const members = await getTeamMembers(team.id);

      expect(members).toHaveLength(0);
      expect(Array.isArray(members)).toBe(true);
    });

    it('should return all team members', async () => {
      // Add multiple members
      await db.insert(teamMembersTable)
        .values([
          {
            team_id: team.id,
            user_id: member1.id
          },
          {
            team_id: team.id,
            user_id: member2.id
          }
        ])
        .execute();

      const members = await getTeamMembers(team.id);

      expect(members).toHaveLength(2);
      
      const memberIds = members.map(m => m.user_id);
      expect(memberIds).toContain(member1.id);
      expect(memberIds).toContain(member2.id);
      
      members.forEach(member => {
        expect(member.team_id).toBe(team.id);
        expect(member.id).toBeDefined();
        expect(member.joined_at).toBeInstanceOf(Date);
      });
    });

    it('should throw error when team does not exist', async () => {
      await expect(getTeamMembers(999))
        .rejects.toThrow(/team not found/i);
    });

    it('should not include members from other teams', async () => {
      // Create another team
      const otherTeam = await db.insert(teamsTable)
        .values({
          captain_id: otherUser.id,
          name: 'Other Team',
          skill_level: 3
        })
        .returning()
        .execute();

      // Add members to both teams
      await db.insert(teamMembersTable)
        .values([
          {
            team_id: team.id,
            user_id: member1.id
          },
          {
            team_id: otherTeam[0].id,
            user_id: member2.id
          }
        ])
        .execute();

      const members = await getTeamMembers(team.id);

      expect(members).toHaveLength(1);
      expect(members[0].user_id).toBe(member1.id);
      expect(members[0].team_id).toBe(team.id);
    });
  });
});