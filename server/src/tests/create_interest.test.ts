import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, matchRequestsTable, fieldSlotsTable, fieldsTable, interestsTable, teamsTable } from '../db/schema';
import { type CreateInterestInput } from '../schema';
import { createInterest } from '../handlers/create_interest';
import { eq } from 'drizzle-orm';

describe('createInterest', () => {
  let testUserId: number;
  let testMatchRequestId: number;
  let testFieldSlotId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'player'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test field owner
    const ownerResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashed_password',
        first_name: 'Field',
        last_name: 'Owner',
        role: 'field_owner'
      })
      .returning()
      .execute();
    const ownerId = ownerResult[0].id;

    // Create test team and captain
    const captainResult = await db.insert(usersTable)
      .values({
        email: 'captain@example.com',
        password_hash: 'hashed_password',
        first_name: 'Team',
        last_name: 'Captain',
        role: 'player'
      })
      .returning()
      .execute();
    const captainId = captainResult[0].id;

    const teamResult = await db.insert(teamsTable)
      .values({
        captain_id: captainId,
        name: 'Test Team',
        skill_level: 5
      })
      .returning()
      .execute();
    const teamId = teamResult[0].id;

    // Create test match request
    const matchRequestResult = await db.insert(matchRequestsTable)
      .values({
        creator_id: testUserId,
        team_id: teamId,
        type: 'find_opponent',
        title: 'Looking for opponents',
        skill_level: 5
      })
      .returning()
      .execute();
    testMatchRequestId = matchRequestResult[0].id;

    // Create test field
    const fieldResult = await db.insert(fieldsTable)
      .values({
        owner_id: ownerId,
        name: 'Test Field',
        address: '123 Test St',
        hourly_rate: '50.00'
      })
      .returning()
      .execute();
    const fieldId = fieldResult[0].id;

    // Create test field slot
    const slotResult = await db.insert(fieldSlotsTable)
      .values({
        field_id: fieldId,
        start_time: new Date('2024-01-15T10:00:00Z'),
        end_time: new Date('2024-01-15T12:00:00Z'),
        price: '100.00'
      })
      .returning()
      .execute();
    testFieldSlotId = slotResult[0].id;
  });

  afterEach(resetDB);

  it('should create interest in match request', async () => {
    const input: CreateInterestInput = {
      type: 'match_request',
      match_request_id: testMatchRequestId,
      message: 'Interested in playing against your team'
    };

    const result = await createInterest(input, testUserId);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.type).toEqual('match_request');
    expect(result.match_request_id).toEqual(testMatchRequestId);
    expect(result.field_slot_id).toBeNull();
    expect(result.message).toEqual('Interested in playing against your team');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create interest in field slot', async () => {
    const input: CreateInterestInput = {
      type: 'field_slot',
      field_slot_id: testFieldSlotId,
      message: 'Would like to book this slot'
    };

    const result = await createInterest(input, testUserId);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.type).toEqual('field_slot');
    expect(result.match_request_id).toBeNull();
    expect(result.field_slot_id).toEqual(testFieldSlotId);
    expect(result.message).toEqual('Would like to book this slot');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create interest without message', async () => {
    const input: CreateInterestInput = {
      type: 'match_request',
      match_request_id: testMatchRequestId
    };

    const result = await createInterest(input, testUserId);

    expect(result.message).toBeNull();
    expect(result.type).toEqual('match_request');
    expect(result.match_request_id).toEqual(testMatchRequestId);
  });

  it('should save interest to database', async () => {
    const input: CreateInterestInput = {
      type: 'field_slot',
      field_slot_id: testFieldSlotId,
      message: 'Database test message'
    };

    const result = await createInterest(input, testUserId);

    const interests = await db.select()
      .from(interestsTable)
      .where(eq(interestsTable.id, result.id))
      .execute();

    expect(interests).toHaveLength(1);
    expect(interests[0].user_id).toEqual(testUserId);
    expect(interests[0].type).toEqual('field_slot');
    expect(interests[0].field_slot_id).toEqual(testFieldSlotId);
    expect(interests[0].message).toEqual('Database test message');
    expect(interests[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const input: CreateInterestInput = {
      type: 'match_request',
      match_request_id: testMatchRequestId
    };

    await expect(createInterest(input, 99999)).rejects.toThrow(/user with id 99999 not found/i);
  });

  it('should throw error for non-existent match request', async () => {
    const input: CreateInterestInput = {
      type: 'match_request',
      match_request_id: 99999
    };

    await expect(createInterest(input, testUserId)).rejects.toThrow(/match request with id 99999 not found/i);
  });

  it('should throw error for non-existent field slot', async () => {
    const input: CreateInterestInput = {
      type: 'field_slot',
      field_slot_id: 99999
    };

    await expect(createInterest(input, testUserId)).rejects.toThrow(/field slot with id 99999 not found/i);
  });

  it('should throw error when match_request_id is missing for match_request type', async () => {
    const input: CreateInterestInput = {
      type: 'match_request'
    };

    await expect(createInterest(input, testUserId)).rejects.toThrow(/match_request_id is required for match_request interest type/i);
  });

  it('should throw error when field_slot_id is missing for field_slot type', async () => {
    const input: CreateInterestInput = {
      type: 'field_slot'
    };

    await expect(createInterest(input, testUserId)).rejects.toThrow(/field_slot_id is required for field_slot interest type/i);
  });

  it('should handle multiple interests from same user', async () => {
    const input1: CreateInterestInput = {
      type: 'match_request',
      match_request_id: testMatchRequestId,
      message: 'First interest'
    };

    const input2: CreateInterestInput = {
      type: 'field_slot',
      field_slot_id: testFieldSlotId,
      message: 'Second interest'
    };

    const result1 = await createInterest(input1, testUserId);
    const result2 = await createInterest(input2, testUserId);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.type).toEqual('match_request');
    expect(result2.type).toEqual('field_slot');
    
    // Verify both are saved
    const allInterests = await db.select()
      .from(interestsTable)
      .where(eq(interestsTable.user_id, testUserId))
      .execute();

    expect(allInterests).toHaveLength(2);
  });
});