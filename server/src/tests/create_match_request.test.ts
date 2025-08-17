import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { matchRequestsTable, usersTable, teamsTable } from '../db/schema';
import { type CreateMatchRequestInput } from '../schema';
import { createMatchRequest } from '../handlers/create_match_request';
import { eq } from 'drizzle-orm';

describe('createMatchRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testTeamId: number;

  beforeEach(async () => {
    // Create test user (creator)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'creator@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Creator',
        role: 'player'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        captain_id: testUserId,
        name: 'Test Team',
        skill_level: 7
      })
      .returning()
      .execute();
    
    testTeamId = teamResult[0].id;
  });

  it('should create a match request with all fields', async () => {
    const testInput: CreateMatchRequestInput = {
      team_id: testTeamId,
      type: 'find_opponent',
      title: 'Looking for competitive match',
      description: 'We are looking for a good team to play against',
      preferred_date: new Date('2024-12-25T10:00:00Z'),
      preferred_location: 'Central Park',
      skill_level: 8,
      max_fee: 150.50,
      players_needed: 5
    };

    const result = await createMatchRequest(testInput, testUserId);

    // Basic field validation
    expect(result.creator_id).toEqual(testUserId);
    expect(result.team_id).toEqual(testTeamId);
    expect(result.type).toEqual('find_opponent');
    expect(result.title).toEqual('Looking for competitive match');
    expect(result.description).toEqual('We are looking for a good team to play against');
    expect(result.preferred_date).toEqual(new Date('2024-12-25T10:00:00Z'));
    expect(result.preferred_location).toEqual('Central Park');
    expect(result.skill_level).toEqual(8);
    expect(result.max_fee).toEqual(150.50);
    expect(result.players_needed).toEqual(5);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric conversion
    expect(typeof result.max_fee).toBe('number');
  });

  it('should create a match request with minimal fields', async () => {
    const testInput: CreateMatchRequestInput = {
      type: 'find_players',
      title: 'Need players for pickup game',
      skill_level: 5
    };

    const result = await createMatchRequest(testInput, testUserId);

    // Basic field validation
    expect(result.creator_id).toEqual(testUserId);
    expect(result.team_id).toBeNull();
    expect(result.type).toEqual('find_players');
    expect(result.title).toEqual('Need players for pickup game');
    expect(result.description).toBeNull();
    expect(result.preferred_date).toBeNull();
    expect(result.preferred_location).toBeNull();
    expect(result.skill_level).toEqual(5);
    expect(result.max_fee).toBeNull();
    expect(result.players_needed).toBeNull();
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save match request to database', async () => {
    const testInput: CreateMatchRequestInput = {
      type: 'find_opponent',
      title: 'Database test match',
      skill_level: 6,
      max_fee: 75.25
    };

    const result = await createMatchRequest(testInput, testUserId);

    // Query database to verify persistence
    const matchRequests = await db.select()
      .from(matchRequestsTable)
      .where(eq(matchRequestsTable.id, result.id))
      .execute();

    expect(matchRequests).toHaveLength(1);
    expect(matchRequests[0].creator_id).toEqual(testUserId);
    expect(matchRequests[0].title).toEqual('Database test match');
    expect(matchRequests[0].skill_level).toEqual(6);
    expect(parseFloat(matchRequests[0].max_fee!)).toEqual(75.25); // Verify numeric storage
    expect(matchRequests[0].is_active).toBe(true);
    expect(matchRequests[0].created_at).toBeInstanceOf(Date);
    expect(matchRequests[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null max_fee correctly', async () => {
    const testInput: CreateMatchRequestInput = {
      type: 'find_players',
      title: 'Free pickup game',
      skill_level: 4
      // max_fee is undefined/optional
    };

    const result = await createMatchRequest(testInput, testUserId);

    expect(result.max_fee).toBeNull();

    // Verify in database
    const matchRequests = await db.select()
      .from(matchRequestsTable)
      .where(eq(matchRequestsTable.id, result.id))
      .execute();

    expect(matchRequests[0].max_fee).toBeNull();
  });

  it('should create match request without team_id', async () => {
    const testInput: CreateMatchRequestInput = {
      type: 'find_players',
      title: 'Individual looking for team',
      skill_level: 7,
      players_needed: 3
    };

    const result = await createMatchRequest(testInput, testUserId);

    expect(result.team_id).toBeNull();
    expect(result.type).toEqual('find_players');
    expect(result.players_needed).toEqual(3);

    // Verify in database
    const matchRequests = await db.select()
      .from(matchRequestsTable)
      .where(eq(matchRequestsTable.id, result.id))
      .execute();

    expect(matchRequests[0].team_id).toBeNull();
    expect(matchRequests[0].players_needed).toEqual(3);
  });

  it('should handle foreign key constraint violations', async () => {
    const testInput: CreateMatchRequestInput = {
      team_id: 99999, // Non-existent team
      type: 'find_opponent',
      title: 'Invalid team match',
      skill_level: 6
    };

    await expect(createMatchRequest(testInput, testUserId)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should handle invalid creator_id', async () => {
    const testInput: CreateMatchRequestInput = {
      type: 'find_players',
      title: 'Invalid creator match',
      skill_level: 5
    };

    const invalidCreatorId = 99999;

    await expect(createMatchRequest(testInput, invalidCreatorId)).rejects.toThrow(/violates foreign key constraint/i);
  });
});