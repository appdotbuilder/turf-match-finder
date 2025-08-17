import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, ratingsTable } from '../db/schema';
import { type CreateRatingInput } from '../schema';
import { createRating } from '../handlers/create_rating';
import { eq } from 'drizzle-orm';

describe('createRating', () => {
  let testRaterId: number;
  let testTeamId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'rater@test.com',
          password_hash: 'hashedpassword1',
          first_name: 'John',
          last_name: 'Rater',
          role: 'player'
        },
        {
          email: 'captain@test.com',
          password_hash: 'hashedpassword2',
          first_name: 'Jane',
          last_name: 'Captain',
          role: 'player'
        }
      ])
      .returning()
      .execute();

    testRaterId = users[0].id;
    const captainId = users[1].id;

    // Create test team
    const teams = await db.insert(teamsTable)
      .values({
        captain_id: captainId,
        name: 'Test Team',
        description: 'A team for testing',
        skill_level: 7
      })
      .returning()
      .execute();

    testTeamId = teams[0].id;
  });

  afterEach(resetDB);

  const testInput: CreateRatingInput = {
    rated_team_id: 0, // Will be set in tests
    rating: 4,
    comment: 'Great teamwork and sportsmanship'
  };

  it('should create a rating', async () => {
    const input = { ...testInput, rated_team_id: testTeamId };
    const result = await createRating(input, testRaterId);

    // Basic field validation
    expect(result.rater_id).toEqual(testRaterId);
    expect(result.rated_team_id).toEqual(testTeamId);
    expect(result.rating).toEqual(4);
    expect(result.comment).toEqual('Great teamwork and sportsmanship');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save rating to database', async () => {
    const input = { ...testInput, rated_team_id: testTeamId };
    const result = await createRating(input, testRaterId);

    // Query database to verify rating was saved
    const ratings = await db.select()
      .from(ratingsTable)
      .where(eq(ratingsTable.id, result.id))
      .execute();

    expect(ratings).toHaveLength(1);
    expect(ratings[0].rater_id).toEqual(testRaterId);
    expect(ratings[0].rated_team_id).toEqual(testTeamId);
    expect(ratings[0].rating).toEqual(4);
    expect(ratings[0].comment).toEqual('Great teamwork and sportsmanship');
    expect(ratings[0].created_at).toBeInstanceOf(Date);
  });

  it('should create rating without comment', async () => {
    const inputWithoutComment: CreateRatingInput = {
      rated_team_id: testTeamId,
      rating: 5
    };

    const result = await createRating(inputWithoutComment, testRaterId);

    expect(result.rating).toEqual(5);
    expect(result.comment).toBeNull();
  });

  it('should throw error when rated team does not exist', async () => {
    const input = { ...testInput, rated_team_id: 99999 };

    await expect(createRating(input, testRaterId)).rejects.toThrow(/rated team not found/i);
  });

  it('should handle minimum rating value', async () => {
    const input = { ...testInput, rated_team_id: testTeamId, rating: 1 };
    const result = await createRating(input, testRaterId);

    expect(result.rating).toEqual(1);
  });

  it('should handle maximum rating value', async () => {
    const input = { ...testInput, rated_team_id: testTeamId, rating: 5 };
    const result = await createRating(input, testRaterId);

    expect(result.rating).toEqual(5);
  });
});