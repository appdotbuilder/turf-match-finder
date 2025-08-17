import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, teamMembersTable } from '../db/schema';
import { getTeams, getTeamsByUser } from '../handlers/get_teams';

describe('getTeams', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no teams exist', async () => {
    const result = await getTeams();
    expect(result).toEqual([]);
  });

  it('should fetch all teams from database', async () => {
    // Create test users first
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'captain1@example.com',
          password_hash: 'hash1',
          first_name: 'John',
          last_name: 'Doe',
          role: 'player'
        },
        {
          email: 'captain2@example.com',
          password_hash: 'hash2',
          first_name: 'Jane',
          last_name: 'Smith',
          role: 'player'
        }
      ])
      .returning()
      .execute();

    // Create test teams
    await db.insert(teamsTable)
      .values([
        {
          captain_id: users[0].id,
          name: 'Team Alpha',
          description: 'First team',
          skill_level: 5
        },
        {
          captain_id: users[1].id,
          name: 'Team Beta',
          description: 'Second team',
          skill_level: 7
        },
        {
          captain_id: users[0].id,
          name: 'Team Gamma',
          description: null,
          skill_level: 3
        }
      ])
      .execute();

    const result = await getTeams();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('Team Alpha');
    expect(result[0].description).toEqual('First team');
    expect(result[0].skill_level).toEqual(5);
    expect(result[0].captain_id).toEqual(users[0].id);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].name).toEqual('Team Beta');
    expect(result[1].skill_level).toEqual(7);

    expect(result[2].name).toEqual('Team Gamma');
    expect(result[2].description).toBeNull();
    expect(result[2].skill_level).toEqual(3);
  });
});

describe('getTeamsByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no teams', async () => {
    // Create a user with no teams
    const user = await db.insert(usersTable)
      .values({
        email: 'noTeams@example.com',
        password_hash: 'hash',
        first_name: 'No',
        last_name: 'Teams',
        role: 'player'
      })
      .returning()
      .execute();

    const result = await getTeamsByUser(user[0].id);
    expect(result).toEqual([]);
  });

  it('should return teams where user is captain', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'captain@example.com',
          password_hash: 'hash1',
          first_name: 'Captain',
          last_name: 'User',
          role: 'player'
        },
        {
          email: 'other@example.com',
          password_hash: 'hash2',
          first_name: 'Other',
          last_name: 'User',
          role: 'player'
        }
      ])
      .returning()
      .execute();

    // Create teams where first user is captain
    await db.insert(teamsTable)
      .values([
        {
          captain_id: users[0].id,
          name: 'Captain Team 1',
          description: 'First captain team',
          skill_level: 5
        },
        {
          captain_id: users[0].id,
          name: 'Captain Team 2',
          description: 'Second captain team',
          skill_level: 8
        },
        {
          captain_id: users[1].id,
          name: 'Other Team',
          description: 'Team of other user',
          skill_level: 6
        }
      ])
      .execute();

    const result = await getTeamsByUser(users[0].id);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Captain Team 1');
    expect(result[0].captain_id).toEqual(users[0].id);
    expect(result[1].name).toEqual('Captain Team 2');
    expect(result[1].captain_id).toEqual(users[0].id);
  });

  it('should return teams where user is member', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'captain@example.com',
          password_hash: 'hash1',
          first_name: 'Captain',
          last_name: 'User',
          role: 'player'
        },
        {
          email: 'member@example.com',
          password_hash: 'hash2',
          first_name: 'Member',
          last_name: 'User',
          role: 'player'
        }
      ])
      .returning()
      .execute();

    // Create teams
    const teams = await db.insert(teamsTable)
      .values([
        {
          captain_id: users[0].id,
          name: 'Team Alpha',
          description: 'First team',
          skill_level: 5
        },
        {
          captain_id: users[0].id,
          name: 'Team Beta',
          description: 'Second team',
          skill_level: 7
        }
      ])
      .returning()
      .execute();

    // Add second user as member to both teams
    await db.insert(teamMembersTable)
      .values([
        {
          team_id: teams[0].id,
          user_id: users[1].id
        },
        {
          team_id: teams[1].id,
          user_id: users[1].id
        }
      ])
      .execute();

    const result = await getTeamsByUser(users[1].id);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Team Alpha');
    expect(result[0].captain_id).toEqual(users[0].id);
    expect(result[1].name).toEqual('Team Beta');
    expect(result[1].captain_id).toEqual(users[0].id);
  });

  it('should return teams where user is both captain and member without duplicates', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'captain@example.com',
          password_hash: 'hash1',
          first_name: 'Captain',
          last_name: 'User',
          role: 'player'
        },
        {
          email: 'other@example.com',
          password_hash: 'hash2',
          first_name: 'Other',
          last_name: 'User',
          role: 'player'
        }
      ])
      .returning()
      .execute();

    // Create teams
    const teams = await db.insert(teamsTable)
      .values([
        {
          captain_id: users[0].id,
          name: 'Captain Team',
          description: 'Team where user is captain',
          skill_level: 5
        },
        {
          captain_id: users[1].id,
          name: 'Member Team',
          description: 'Team where user is member',
          skill_level: 7
        }
      ])
      .returning()
      .execute();

    // Add first user as member to the second team
    await db.insert(teamMembersTable)
      .values({
        team_id: teams[1].id,
        user_id: users[0].id
      })
      .execute();

    // Also add first user as member to their own team (edge case)
    await db.insert(teamMembersTable)
      .values({
        team_id: teams[0].id,
        user_id: users[0].id
      })
      .execute();

    const result = await getTeamsByUser(users[0].id);

    expect(result).toHaveLength(2);
    
    // Should contain both teams without duplicates
    const teamNames = result.map(t => t.name).sort();
    expect(teamNames).toEqual(['Captain Team', 'Member Team']);
    
    // Verify team details
    const captainTeam = result.find(t => t.name === 'Captain Team');
    const memberTeam = result.find(t => t.name === 'Member Team');
    
    expect(captainTeam?.captain_id).toEqual(users[0].id);
    expect(memberTeam?.captain_id).toEqual(users[1].id);
  });

  it('should handle non-existent user gracefully', async () => {
    const result = await getTeamsByUser(99999);
    expect(result).toEqual([]);
  });
});