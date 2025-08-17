import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { teamsTable, usersTable } from '../db/schema';
import { type CreateTeamInput } from '../schema';
import { createTeam } from '../handlers/create_team';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateTeamInput = {
  name: 'Test Team',
  description: 'A team for testing',
  skill_level: 7
};

describe('createTeam', () => {
  let testCaptainId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user to be the captain
    const captainResult = await db.insert(usersTable)
      .values({
        email: 'captain@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Captain',
        role: 'player'
      })
      .returning()
      .execute();
    
    testCaptainId = captainResult[0].id;
  });

  afterEach(resetDB);

  it('should create a team with valid captain', async () => {
    const result = await createTeam(testInput, testCaptainId);

    // Basic field validation
    expect(result.name).toEqual('Test Team');
    expect(result.description).toEqual('A team for testing');
    expect(result.skill_level).toEqual(7);
    expect(result.captain_id).toEqual(testCaptainId);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save team to database', async () => {
    const result = await createTeam(testInput, testCaptainId);

    // Query using proper drizzle syntax
    const teams = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.id, result.id))
      .execute();

    expect(teams).toHaveLength(1);
    expect(teams[0].name).toEqual('Test Team');
    expect(teams[0].description).toEqual('A team for testing');
    expect(teams[0].skill_level).toEqual(7);
    expect(teams[0].captain_id).toEqual(testCaptainId);
    expect(teams[0].created_at).toBeInstanceOf(Date);
    expect(teams[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create team with null description when not provided', async () => {
    const inputWithoutDescription: CreateTeamInput = {
      name: 'Team Without Description',
      skill_level: 5
    };

    const result = await createTeam(inputWithoutDescription, testCaptainId);

    expect(result.name).toEqual('Team Without Description');
    expect(result.description).toBeNull();
    expect(result.skill_level).toEqual(5);
    expect(result.captain_id).toEqual(testCaptainId);

    // Verify in database
    const teams = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.id, result.id))
      .execute();

    expect(teams[0].description).toBeNull();
  });

  it('should handle boundary skill levels', async () => {
    const minSkillInput: CreateTeamInput = {
      name: 'Min Skill Team',
      skill_level: 1
    };

    const maxSkillInput: CreateTeamInput = {
      name: 'Max Skill Team',
      skill_level: 10
    };

    const minResult = await createTeam(minSkillInput, testCaptainId);
    const maxResult = await createTeam(maxSkillInput, testCaptainId);

    expect(minResult.skill_level).toEqual(1);
    expect(maxResult.skill_level).toEqual(10);

    // Verify both teams exist in database
    const teams = await db.select()
      .from(teamsTable)
      .execute();

    expect(teams.length).toBeGreaterThanOrEqual(2);
    const skillLevels = teams.map(t => t.skill_level);
    expect(skillLevels).toContain(1);
    expect(skillLevels).toContain(10);
  });

  it('should throw error when captain does not exist', async () => {
    const nonExistentCaptainId = 99999;

    await expect(createTeam(testInput, nonExistentCaptainId))
      .rejects
      .toThrow(/captain with id 99999 does not exist/i);
  });

  it('should create multiple teams with same captain', async () => {
    const team1Input: CreateTeamInput = {
      name: 'First Team',
      skill_level: 3
    };

    const team2Input: CreateTeamInput = {
      name: 'Second Team',
      description: 'Captain\'s second team',
      skill_level: 8
    };

    const result1 = await createTeam(team1Input, testCaptainId);
    const result2 = await createTeam(team2Input, testCaptainId);

    expect(result1.captain_id).toEqual(testCaptainId);
    expect(result2.captain_id).toEqual(testCaptainId);
    expect(result1.id).not.toEqual(result2.id);

    // Verify both teams exist in database
    const teams = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.captain_id, testCaptainId))
      .execute();

    expect(teams).toHaveLength(2);
    expect(teams.map(t => t.name)).toEqual(expect.arrayContaining(['First Team', 'Second Team']));
  });

  it('should handle special characters in team name and description', async () => {
    const specialInput: CreateTeamInput = {
      name: 'Team with "Special" Characters & Symbols!',
      description: 'Description with émojis 🏈 and special chars: @#$%',
      skill_level: 6
    };

    const result = await createTeam(specialInput, testCaptainId);

    expect(result.name).toEqual('Team with "Special" Characters & Symbols!');
    expect(result.description).toEqual('Description with émojis 🏈 and special chars: @#$%');

    // Verify in database
    const teams = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.id, result.id))
      .execute();

    expect(teams[0].name).toEqual('Team with "Special" Characters & Symbols!');
    expect(teams[0].description).toEqual('Description with émojis 🏈 and special chars: @#$%');
  });
});