import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, ratingsTable } from '../db/schema';
import { getRatingsByTeam, getAverageRatingByTeam } from '../handlers/get_ratings';

// Test data setup
const testUser1 = {
  email: 'rater1@test.com',
  password_hash: 'hashed_password_1',
  first_name: 'John',
  last_name: 'Doe',
  role: 'player' as const,
  phone: '1234567890'
};

const testUser2 = {
  email: 'rater2@test.com',
  password_hash: 'hashed_password_2',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'player' as const,
  phone: '0987654321'
};

const testCaptain = {
  email: 'captain@test.com',
  password_hash: 'hashed_password_captain',
  first_name: 'Captain',
  last_name: 'Marvel',
  role: 'player' as const
};

const testTeam = {
  name: 'Test Team',
  description: 'A team for testing',
  skill_level: 7
};

describe('getRatingsByTeam', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all ratings for a specific team', async () => {
    // Create users and team
    const [user1] = await db.insert(usersTable).values(testUser1).returning().execute();
    const [user2] = await db.insert(usersTable).values(testUser2).returning().execute();
    const [captain] = await db.insert(usersTable).values(testCaptain).returning().execute();
    
    const [team] = await db.insert(teamsTable)
      .values({ ...testTeam, captain_id: captain.id })
      .returning()
      .execute();

    // Create multiple ratings for the team
    const rating1 = {
      rater_id: user1.id,
      rated_team_id: team.id,
      rating: 5,
      comment: 'Excellent team!'
    };

    const rating2 = {
      rater_id: user2.id,
      rated_team_id: team.id,
      rating: 4,
      comment: 'Good teamwork'
    };

    await db.insert(ratingsTable).values([rating1, rating2]).execute();

    const result = await getRatingsByTeam(team.id);

    expect(result).toHaveLength(2);
    expect(result[0].rated_team_id).toEqual(team.id);
    expect(result[0].rating).toEqual(5);
    expect(result[0].comment).toEqual('Excellent team!');
    expect(result[0].rater_id).toEqual(user1.id);
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].rated_team_id).toEqual(team.id);
    expect(result[1].rating).toEqual(4);
    expect(result[1].comment).toEqual('Good teamwork');
    expect(result[1].rater_id).toEqual(user2.id);
  });

  it('should return empty array for team with no ratings', async () => {
    // Create users and team
    const [captain] = await db.insert(usersTable).values(testCaptain).returning().execute();
    const [team] = await db.insert(teamsTable)
      .values({ ...testTeam, captain_id: captain.id })
      .returning()
      .execute();

    const result = await getRatingsByTeam(team.id);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent team', async () => {
    const result = await getRatingsByTeam(999);

    expect(result).toHaveLength(0);
  });

  it('should only return ratings for the specified team', async () => {
    // Create users and two teams
    const [user1] = await db.insert(usersTable).values(testUser1).returning().execute();
    const [captain] = await db.insert(usersTable).values(testCaptain).returning().execute();
    
    const [team1] = await db.insert(teamsTable)
      .values({ ...testTeam, captain_id: captain.id, name: 'Team 1' })
      .returning()
      .execute();

    const [team2] = await db.insert(teamsTable)
      .values({ ...testTeam, captain_id: captain.id, name: 'Team 2' })
      .returning()
      .execute();

    // Create ratings for both teams
    await db.insert(ratingsTable).values([
      {
        rater_id: user1.id,
        rated_team_id: team1.id,
        rating: 5,
        comment: 'Rating for team 1'
      },
      {
        rater_id: user1.id,
        rated_team_id: team2.id,
        rating: 3,
        comment: 'Rating for team 2'
      }
    ]).execute();

    const result = await getRatingsByTeam(team1.id);

    expect(result).toHaveLength(1);
    expect(result[0].rated_team_id).toEqual(team1.id);
    expect(result[0].comment).toEqual('Rating for team 1');
  });
});

describe('getAverageRatingByTeam', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should calculate correct average rating for a team', async () => {
    // Create users and team
    const [user1] = await db.insert(usersTable).values(testUser1).returning().execute();
    const [user2] = await db.insert(usersTable).values(testUser2).returning().execute();
    const [captain] = await db.insert(usersTable).values(testCaptain).returning().execute();
    
    const [team] = await db.insert(teamsTable)
      .values({ ...testTeam, captain_id: captain.id })
      .returning()
      .execute();

    // Create ratings: 5, 4, 3 (average should be 4.0)
    await db.insert(ratingsTable).values([
      {
        rater_id: user1.id,
        rated_team_id: team.id,
        rating: 5,
        comment: 'Excellent'
      },
      {
        rater_id: user2.id,
        rated_team_id: team.id,
        rating: 4,
        comment: 'Good'
      },
      {
        rater_id: captain.id,
        rated_team_id: team.id,
        rating: 3,
        comment: 'Average'
      }
    ]).execute();

    const result = await getAverageRatingByTeam(team.id);

    expect(typeof result).toBe('number');
    expect(result).toBeCloseTo(4.0, 2);
  });

  it('should return 0 for team with no ratings', async () => {
    // Create team without ratings
    const [captain] = await db.insert(usersTable).values(testCaptain).returning().execute();
    const [team] = await db.insert(teamsTable)
      .values({ ...testTeam, captain_id: captain.id })
      .returning()
      .execute();

    const result = await getAverageRatingByTeam(team.id);

    expect(result).toEqual(0);
  });

  it('should return 0 for non-existent team', async () => {
    const result = await getAverageRatingByTeam(999);

    expect(result).toEqual(0);
  });

  it('should calculate correct average for fractional results', async () => {
    // Create users and team
    const [user1] = await db.insert(usersTable).values(testUser1).returning().execute();
    const [user2] = await db.insert(usersTable).values(testUser2).returning().execute();
    const [captain] = await db.insert(usersTable).values(testCaptain).returning().execute();
    
    const [team] = await db.insert(teamsTable)
      .values({ ...testTeam, captain_id: captain.id })
      .returning()
      .execute();

    // Create ratings: 5, 3 (average should be 4.0)
    await db.insert(ratingsTable).values([
      {
        rater_id: user1.id,
        rated_team_id: team.id,
        rating: 5
      },
      {
        rater_id: user2.id,
        rated_team_id: team.id,
        rating: 3
      }
    ]).execute();

    const result = await getAverageRatingByTeam(team.id);

    expect(typeof result).toBe('number');
    expect(result).toBeCloseTo(4.0, 2);
  });

  it('should handle single rating correctly', async () => {
    // Create users and team
    const [user1] = await db.insert(usersTable).values(testUser1).returning().execute();
    const [captain] = await db.insert(usersTable).values(testCaptain).returning().execute();
    
    const [team] = await db.insert(teamsTable)
      .values({ ...testTeam, captain_id: captain.id })
      .returning()
      .execute();

    // Create single rating
    await db.insert(ratingsTable).values({
      rater_id: user1.id,
      rated_team_id: team.id,
      rating: 5,
      comment: 'Perfect!'
    }).execute();

    const result = await getAverageRatingByTeam(team.id);

    expect(result).toEqual(5);
  });

  it('should only calculate average for the specified team', async () => {
    // Create users and two teams
    const [user1] = await db.insert(usersTable).values(testUser1).returning().execute();
    const [captain] = await db.insert(usersTable).values(testCaptain).returning().execute();
    
    const [team1] = await db.insert(teamsTable)
      .values({ ...testTeam, captain_id: captain.id, name: 'Team 1' })
      .returning()
      .execute();

    const [team2] = await db.insert(teamsTable)
      .values({ ...testTeam, captain_id: captain.id, name: 'Team 2' })
      .returning()
      .execute();

    // Create different ratings for both teams
    await db.insert(ratingsTable).values([
      {
        rater_id: user1.id,
        rated_team_id: team1.id,
        rating: 5  // Average for team1 should be 5
      },
      {
        rater_id: user1.id,
        rated_team_id: team2.id,
        rating: 1  // Average for team2 should be 1
      }
    ]).execute();

    const result1 = await getAverageRatingByTeam(team1.id);
    const result2 = await getAverageRatingByTeam(team2.id);

    expect(result1).toEqual(5);
    expect(result2).toEqual(1);
  });
});