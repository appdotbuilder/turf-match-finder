import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, matchRequestsTable } from '../db/schema';
import { type MatchRequestType } from '../schema';
import { getMatchRequests, getMatchRequestsByType, getMatchRequestsByUser } from '../handlers/get_match_requests';
import { eq } from 'drizzle-orm';

describe('getMatchRequests handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId1: number;
  let userId2: number;
  let teamId: number;

  beforeEach(async () => {
    // Create test users
    const userResults = await db.insert(usersTable)
      .values([
        {
          email: 'player1@example.com',
          password_hash: 'hash1',
          first_name: 'John',
          last_name: 'Doe',
          role: 'player'
        },
        {
          email: 'player2@example.com',
          password_hash: 'hash2',
          first_name: 'Jane',
          last_name: 'Smith',
          role: 'player'
        }
      ])
      .returning()
      .execute();

    userId1 = userResults[0].id;
    userId2 = userResults[1].id;

    // Create test team
    const teamResults = await db.insert(teamsTable)
      .values({
        captain_id: userId1,
        name: 'Test Team',
        skill_level: 7
      })
      .returning()
      .execute();

    teamId = teamResults[0].id;
  });

  describe('getMatchRequests', () => {
    it('should return all active match requests', async () => {
      // Create test match requests
      await db.insert(matchRequestsTable)
        .values([
          {
            creator_id: userId1,
            team_id: teamId,
            type: 'find_opponent',
            title: 'Looking for opponents',
            skill_level: 7,
            is_active: true
          },
          {
            creator_id: userId2,
            type: 'find_players',
            title: 'Need players',
            skill_level: 5,
            is_active: true,
            players_needed: 3
          },
          {
            creator_id: userId1,
            type: 'find_opponent',
            title: 'Inactive request',
            skill_level: 6,
            is_active: false
          }
        ])
        .execute();

      const results = await getMatchRequests();

      expect(results).toHaveLength(2);
      expect(results.every(request => request.is_active)).toBe(true);
      
      // Verify field types and values
      const request1 = results.find(r => r.title === 'Looking for opponents');
      expect(request1).toBeDefined();
      expect(request1!.creator_id).toBe(userId1);
      expect(request1!.team_id).toBe(teamId);
      expect(request1!.type).toBe('find_opponent');
      expect(request1!.skill_level).toBe(7);
      expect(request1!.created_at).toBeInstanceOf(Date);

      const request2 = results.find(r => r.title === 'Need players');
      expect(request2).toBeDefined();
      expect(request2!.creator_id).toBe(userId2);
      expect(request2!.team_id).toBeNull();
      expect(request2!.type).toBe('find_players');
      expect(request2!.players_needed).toBe(3);
    });

    it('should return empty array when no active match requests exist', async () => {
      // Create only inactive match request
      await db.insert(matchRequestsTable)
        .values({
          creator_id: userId1,
          type: 'find_opponent',
          title: 'Inactive request',
          skill_level: 6,
          is_active: false
        })
        .execute();

      const results = await getMatchRequests();

      expect(results).toHaveLength(0);
    });

    it('should handle numeric field conversions correctly', async () => {
      // Create match request with max_fee
      await db.insert(matchRequestsTable)
        .values({
          creator_id: userId1,
          type: 'find_opponent',
          title: 'With fee',
          skill_level: 7,
          max_fee: '25.50',
          is_active: true
        })
        .execute();

      const results = await getMatchRequests();

      expect(results).toHaveLength(1);
      expect(typeof results[0].max_fee).toBe('number');
      expect(results[0].max_fee).toBe(25.50);
    });
  });

  describe('getMatchRequestsByType', () => {
    beforeEach(async () => {
      // Create match requests of different types
      await db.insert(matchRequestsTable)
        .values([
          {
            creator_id: userId1,
            team_id: teamId,
            type: 'find_opponent',
            title: 'Looking for opponents 1',
            skill_level: 7,
            is_active: true
          },
          {
            creator_id: userId2,
            team_id: teamId,
            type: 'find_opponent',
            title: 'Looking for opponents 2',
            skill_level: 6,
            is_active: true
          },
          {
            creator_id: userId1,
            type: 'find_players',
            title: 'Need players 1',
            skill_level: 5,
            is_active: true,
            players_needed: 2
          },
          {
            creator_id: userId2,
            type: 'find_players',
            title: 'Need players inactive',
            skill_level: 4,
            is_active: false,
            players_needed: 1
          }
        ])
        .execute();
    });

    it('should return match requests of find_opponent type', async () => {
      const results = await getMatchRequestsByType('find_opponent' as MatchRequestType);

      expect(results).toHaveLength(2);
      expect(results.every(request => request.type === 'find_opponent')).toBe(true);
      expect(results.every(request => request.is_active)).toBe(true);
      
      const titles = results.map(r => r.title).sort();
      expect(titles).toEqual(['Looking for opponents 1', 'Looking for opponents 2']);
    });

    it('should return match requests of find_players type', async () => {
      const results = await getMatchRequestsByType('find_players' as MatchRequestType);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('find_players');
      expect(results[0].title).toBe('Need players 1');
      expect(results[0].is_active).toBe(true);
      expect(results[0].players_needed).toBe(2);
    });

    it('should return empty array for type with no active requests', async () => {
      // Clear all active find_players requests
      await db.delete(matchRequestsTable)
        .where(eq(matchRequestsTable.type, 'find_players'))
        .execute();

      const results = await getMatchRequestsByType('find_players' as MatchRequestType);

      expect(results).toHaveLength(0);
    });
  });

  describe('getMatchRequestsByUser', () => {
    beforeEach(async () => {
      // Create match requests for different users
      await db.insert(matchRequestsTable)
        .values([
          {
            creator_id: userId1,
            team_id: teamId,
            type: 'find_opponent',
            title: 'User1 active request',
            skill_level: 7,
            is_active: true
          },
          {
            creator_id: userId1,
            type: 'find_players',
            title: 'User1 inactive request',
            skill_level: 6,
            is_active: false,
            players_needed: 1
          },
          {
            creator_id: userId2,
            type: 'find_opponent',
            title: 'User2 request',
            skill_level: 5,
            is_active: true
          }
        ])
        .execute();
    });

    it('should return all match requests for a specific user', async () => {
      const results = await getMatchRequestsByUser(userId1);

      expect(results).toHaveLength(2);
      expect(results.every(request => request.creator_id === userId1)).toBe(true);
      
      // Should include both active and inactive requests for the user
      const activeRequest = results.find(r => r.is_active);
      const inactiveRequest = results.find(r => !r.is_active);
      
      expect(activeRequest).toBeDefined();
      expect(activeRequest!.title).toBe('User1 active request');
      expect(activeRequest!.team_id).toBe(teamId);
      
      expect(inactiveRequest).toBeDefined();
      expect(inactiveRequest!.title).toBe('User1 inactive request');
      expect(inactiveRequest!.players_needed).toBe(1);
    });

    it('should return requests for user with different types', async () => {
      const results = await getMatchRequestsByUser(userId1);

      const types = results.map(r => r.type).sort();
      expect(types).toEqual(['find_opponent', 'find_players']);
    });

    it('should return empty array for user with no requests', async () => {
      // Create a new user with no requests
      const newUserResults = await db.insert(usersTable)
        .values({
          email: 'newuser@example.com',
          password_hash: 'hash3',
          first_name: 'New',
          last_name: 'User',
          role: 'player'
        })
        .returning()
        .execute();

      const results = await getMatchRequestsByUser(newUserResults[0].id);

      expect(results).toHaveLength(0);
    });

    it('should handle numeric field conversions correctly', async () => {
      // Add a request with max_fee for user1
      await db.insert(matchRequestsTable)
        .values({
          creator_id: userId1,
          type: 'find_opponent',
          title: 'Request with fee',
          skill_level: 8,
          max_fee: '30.75',
          is_active: true
        })
        .execute();

      const results = await getMatchRequestsByUser(userId1);
      
      const requestWithFee = results.find(r => r.title === 'Request with fee');
      expect(requestWithFee).toBeDefined();
      expect(typeof requestWithFee!.max_fee).toBe('number');
      expect(requestWithFee!.max_fee).toBe(30.75);
    });
  });
});