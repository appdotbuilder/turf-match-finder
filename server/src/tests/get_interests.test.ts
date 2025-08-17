import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, fieldsTable, fieldSlotsTable, teamsTable, matchRequestsTable, interestsTable } from '../db/schema';
import { getInterestsByMatchRequest, getInterestsByFieldSlot, getInterestsByUser } from '../handlers/get_interests';

describe('getInterests handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create test users
  const createTestUser = async (email: string, role: 'player' | 'field_owner' = 'player') => {
    const result = await db.insert(usersTable)
      .values({
        email,
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role,
        phone: null,
        avatar_url: null
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper to create test field
  const createTestField = async (ownerId: number) => {
    const result = await db.insert(fieldsTable)
      .values({
        owner_id: ownerId,
        name: 'Test Field',
        address: '123 Test Street',
        description: 'A test field',
        hourly_rate: '50.00'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper to create test field slot
  const createTestFieldSlot = async (fieldId: number) => {
    const startTime = new Date('2024-01-15T10:00:00Z');
    const endTime = new Date('2024-01-15T12:00:00Z');
    
    const result = await db.insert(fieldSlotsTable)
      .values({
        field_id: fieldId,
        start_time: startTime,
        end_time: endTime,
        price: '100.00',
        is_available: true
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper to create test team
  const createTestTeam = async (captainId: number) => {
    const result = await db.insert(teamsTable)
      .values({
        captain_id: captainId,
        name: 'Test Team',
        description: 'A test team',
        skill_level: 5
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper to create test match request
  const createTestMatchRequest = async (creatorId: number, teamId?: number) => {
    const result = await db.insert(matchRequestsTable)
      .values({
        creator_id: creatorId,
        team_id: teamId || null,
        type: 'find_opponent',
        title: 'Looking for a match',
        description: 'Test match request',
        preferred_date: new Date('2024-01-20T14:00:00Z'),
        preferred_location: 'Test Location',
        skill_level: 5,
        max_fee: '75.00',
        players_needed: null,
        is_active: true
      })
      .returning()
      .execute();
    return result[0];
  };

  describe('getInterestsByMatchRequest', () => {
    it('should return interests for a specific match request', async () => {
      // Create prerequisite data
      const user1 = await createTestUser('user1@test.com');
      const user2 = await createTestUser('user2@test.com');
      const team = await createTestTeam(user1.id);
      const matchRequest = await createTestMatchRequest(user1.id, team.id);

      // Create interest
      await db.insert(interestsTable)
        .values({
          user_id: user2.id,
          type: 'match_request',
          match_request_id: matchRequest.id,
          field_slot_id: null,
          message: 'Interested in this match!'
        })
        .execute();

      const results = await getInterestsByMatchRequest(matchRequest.id);

      expect(results).toHaveLength(1);
      expect(results[0].user_id).toEqual(user2.id);
      expect(results[0].type).toEqual('match_request');
      expect(results[0].match_request_id).toEqual(matchRequest.id);
      expect(results[0].field_slot_id).toBeNull();
      expect(results[0].message).toEqual('Interested in this match!');
      expect(results[0].id).toBeDefined();
      expect(results[0].created_at).toBeInstanceOf(Date);
    });

    it('should return multiple interests for the same match request', async () => {
      // Create prerequisite data
      const user1 = await createTestUser('user1@test.com');
      const user2 = await createTestUser('user2@test.com');
      const user3 = await createTestUser('user3@test.com');
      const team = await createTestTeam(user1.id);
      const matchRequest = await createTestMatchRequest(user1.id, team.id);

      // Create multiple interests
      await db.insert(interestsTable)
        .values([
          {
            user_id: user2.id,
            type: 'match_request',
            match_request_id: matchRequest.id,
            field_slot_id: null,
            message: 'First interest'
          },
          {
            user_id: user3.id,
            type: 'match_request',
            match_request_id: matchRequest.id,
            field_slot_id: null,
            message: 'Second interest'
          }
        ])
        .execute();

      const results = await getInterestsByMatchRequest(matchRequest.id);

      expect(results).toHaveLength(2);
      expect(results.map(r => r.user_id).sort()).toEqual([user2.id, user3.id].sort());
      expect(results.every(r => r.match_request_id === matchRequest.id)).toBe(true);
    });

    it('should return empty array when no interests exist for match request', async () => {
      const user = await createTestUser('user@test.com');
      const team = await createTestTeam(user.id);
      const matchRequest = await createTestMatchRequest(user.id, team.id);

      const results = await getInterestsByMatchRequest(matchRequest.id);

      expect(results).toHaveLength(0);
    });

    it('should not return interests for different match requests', async () => {
      // Create prerequisite data
      const user1 = await createTestUser('user1@test.com');
      const user2 = await createTestUser('user2@test.com');
      const team = await createTestTeam(user1.id);
      const matchRequest1 = await createTestMatchRequest(user1.id, team.id);
      const matchRequest2 = await createTestMatchRequest(user1.id, team.id);

      // Create interest for first match request
      await db.insert(interestsTable)
        .values({
          user_id: user2.id,
          type: 'match_request',
          match_request_id: matchRequest1.id,
          field_slot_id: null,
          message: 'Interest for first match'
        })
        .execute();

      const results = await getInterestsByMatchRequest(matchRequest2.id);

      expect(results).toHaveLength(0);
    });
  });

  describe('getInterestsByFieldSlot', () => {
    it('should return interests for a specific field slot', async () => {
      // Create prerequisite data
      const fieldOwner = await createTestUser('owner@test.com', 'field_owner');
      const player = await createTestUser('player@test.com');
      const field = await createTestField(fieldOwner.id);
      const fieldSlot = await createTestFieldSlot(field.id);

      // Create interest
      await db.insert(interestsTable)
        .values({
          user_id: player.id,
          type: 'field_slot',
          match_request_id: null,
          field_slot_id: fieldSlot.id,
          message: 'Interested in this slot!'
        })
        .execute();

      const results = await getInterestsByFieldSlot(fieldSlot.id);

      expect(results).toHaveLength(1);
      expect(results[0].user_id).toEqual(player.id);
      expect(results[0].type).toEqual('field_slot');
      expect(results[0].match_request_id).toBeNull();
      expect(results[0].field_slot_id).toEqual(fieldSlot.id);
      expect(results[0].message).toEqual('Interested in this slot!');
      expect(results[0].id).toBeDefined();
      expect(results[0].created_at).toBeInstanceOf(Date);
    });

    it('should return multiple interests for the same field slot', async () => {
      // Create prerequisite data
      const fieldOwner = await createTestUser('owner@test.com', 'field_owner');
      const player1 = await createTestUser('player1@test.com');
      const player2 = await createTestUser('player2@test.com');
      const field = await createTestField(fieldOwner.id);
      const fieldSlot = await createTestFieldSlot(field.id);

      // Create multiple interests
      await db.insert(interestsTable)
        .values([
          {
            user_id: player1.id,
            type: 'field_slot',
            match_request_id: null,
            field_slot_id: fieldSlot.id,
            message: 'First interest'
          },
          {
            user_id: player2.id,
            type: 'field_slot',
            match_request_id: null,
            field_slot_id: fieldSlot.id,
            message: 'Second interest'
          }
        ])
        .execute();

      const results = await getInterestsByFieldSlot(fieldSlot.id);

      expect(results).toHaveLength(2);
      expect(results.map(r => r.user_id).sort()).toEqual([player1.id, player2.id].sort());
      expect(results.every(r => r.field_slot_id === fieldSlot.id)).toBe(true);
    });

    it('should return empty array when no interests exist for field slot', async () => {
      const fieldOwner = await createTestUser('owner@test.com', 'field_owner');
      const field = await createTestField(fieldOwner.id);
      const fieldSlot = await createTestFieldSlot(field.id);

      const results = await getInterestsByFieldSlot(fieldSlot.id);

      expect(results).toHaveLength(0);
    });
  });

  describe('getInterestsByUser', () => {
    it('should return all interests expressed by a specific user', async () => {
      // Create prerequisite data
      const fieldOwner = await createTestUser('owner@test.com', 'field_owner');
      const player = await createTestUser('player@test.com');
      const teamCaptain = await createTestUser('captain@test.com');

      const field = await createTestField(fieldOwner.id);
      const fieldSlot = await createTestFieldSlot(field.id);
      const team = await createTestTeam(teamCaptain.id);
      const matchRequest = await createTestMatchRequest(teamCaptain.id, team.id);

      // Create interests by the same user
      await db.insert(interestsTable)
        .values([
          {
            user_id: player.id,
            type: 'field_slot',
            match_request_id: null,
            field_slot_id: fieldSlot.id,
            message: 'Interest in field slot'
          },
          {
            user_id: player.id,
            type: 'match_request',
            match_request_id: matchRequest.id,
            field_slot_id: null,
            message: 'Interest in match request'
          }
        ])
        .execute();

      const results = await getInterestsByUser(player.id);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.user_id === player.id)).toBe(true);
      
      const fieldSlotInterest = results.find(r => r.type === 'field_slot');
      const matchRequestInterest = results.find(r => r.type === 'match_request');
      
      expect(fieldSlotInterest).toBeDefined();
      expect(fieldSlotInterest!.field_slot_id).toEqual(fieldSlot.id);
      expect(fieldSlotInterest!.match_request_id).toBeNull();
      
      expect(matchRequestInterest).toBeDefined();
      expect(matchRequestInterest!.match_request_id).toEqual(matchRequest.id);
      expect(matchRequestInterest!.field_slot_id).toBeNull();
    });

    it('should return interests with null message field', async () => {
      // Create prerequisite data
      const fieldOwner = await createTestUser('owner@test.com', 'field_owner');
      const player = await createTestUser('player@test.com');
      const field = await createTestField(fieldOwner.id);
      const fieldSlot = await createTestFieldSlot(field.id);

      // Create interest without message
      await db.insert(interestsTable)
        .values({
          user_id: player.id,
          type: 'field_slot',
          match_request_id: null,
          field_slot_id: fieldSlot.id,
          message: null
        })
        .execute();

      const results = await getInterestsByUser(player.id);

      expect(results).toHaveLength(1);
      expect(results[0].message).toBeNull();
    });

    it('should return empty array when user has no interests', async () => {
      const player = await createTestUser('player@test.com');

      const results = await getInterestsByUser(player.id);

      expect(results).toHaveLength(0);
    });

    it('should not return interests from other users', async () => {
      // Create prerequisite data
      const fieldOwner = await createTestUser('owner@test.com', 'field_owner');
      const player1 = await createTestUser('player1@test.com');
      const player2 = await createTestUser('player2@test.com');
      const field = await createTestField(fieldOwner.id);
      const fieldSlot = await createTestFieldSlot(field.id);

      // Create interest for player2
      await db.insert(interestsTable)
        .values({
          user_id: player2.id,
          type: 'field_slot',
          match_request_id: null,
          field_slot_id: fieldSlot.id,
          message: 'Player 2 interest'
        })
        .execute();

      // Query interests for player1
      const results = await getInterestsByUser(player1.id);

      expect(results).toHaveLength(0);
    });
  });
});