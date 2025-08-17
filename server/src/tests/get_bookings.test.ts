import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, fieldsTable, fieldSlotsTable, bookingsTable, teamsTable } from '../db/schema';
import { getBookingsByUser, getBookingsByFieldOwner } from '../handlers/get_bookings';

describe('getBookingsByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return bookings for a specific user', async () => {
    // Create test users
    const users = await db.insert(usersTable).values([
      {
        email: 'user1@test.com',
        password_hash: 'hash1',
        first_name: 'User',
        last_name: 'One',
        role: 'player'
      },
      {
        email: 'owner@test.com',
        password_hash: 'hash2',
        first_name: 'Field',
        last_name: 'Owner',
        role: 'field_owner'
      }
    ]).returning().execute();

    const userId = users[0].id;
    const ownerId = users[1].id;

    // Create field
    const fields = await db.insert(fieldsTable).values({
      owner_id: ownerId,
      name: 'Test Field',
      address: '123 Test St',
      hourly_rate: '50.00'
    }).returning().execute();

    const fieldId = fields[0].id;

    // Create field slot
    const slots = await db.insert(fieldSlotsTable).values({
      field_id: fieldId,
      start_time: new Date('2024-01-01T10:00:00Z'),
      end_time: new Date('2024-01-01T12:00:00Z'),
      price: '100.00'
    }).returning().execute();

    const slotId = slots[0].id;

    // Create booking
    const bookings = await db.insert(bookingsTable).values({
      slot_id: slotId,
      user_id: userId,
      status: 'confirmed',
      total_price: '100.00',
      notes: 'Test booking'
    }).returning().execute();

    const result = await getBookingsByUser(userId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(bookings[0].id);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].slot_id).toEqual(slotId);
    expect(result[0].status).toEqual('confirmed');
    expect(result[0].total_price).toEqual(100.00);
    expect(typeof result[0].total_price).toEqual('number');
    expect(result[0].notes).toEqual('Test booking');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple bookings for a user', async () => {
    // Create test user and owner
    const users = await db.insert(usersTable).values([
      {
        email: 'user@test.com',
        password_hash: 'hash1',
        first_name: 'Test',
        last_name: 'User',
        role: 'player'
      },
      {
        email: 'owner@test.com',
        password_hash: 'hash2',
        first_name: 'Field',
        last_name: 'Owner',
        role: 'field_owner'
      }
    ]).returning().execute();

    const userId = users[0].id;
    const ownerId = users[1].id;

    // Create field
    const fields = await db.insert(fieldsTable).values({
      owner_id: ownerId,
      name: 'Test Field',
      address: '123 Test St',
      hourly_rate: '50.00'
    }).returning().execute();

    const fieldId = fields[0].id;

    // Create multiple field slots
    const slots = await db.insert(fieldSlotsTable).values([
      {
        field_id: fieldId,
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T12:00:00Z'),
        price: '100.00'
      },
      {
        field_id: fieldId,
        start_time: new Date('2024-01-02T14:00:00Z'),
        end_time: new Date('2024-01-02T16:00:00Z'),
        price: '150.00'
      }
    ]).returning().execute();

    // Create multiple bookings
    await db.insert(bookingsTable).values([
      {
        slot_id: slots[0].id,
        user_id: userId,
        status: 'confirmed',
        total_price: '100.00'
      },
      {
        slot_id: slots[1].id,
        user_id: userId,
        status: 'pending',
        total_price: '150.00'
      }
    ]).execute();

    const result = await getBookingsByUser(userId);

    expect(result).toHaveLength(2);
    expect(result[0].total_price).toEqual(100.00);
    expect(result[1].total_price).toEqual(150.00);
    expect(typeof result[0].total_price).toEqual('number');
    expect(typeof result[1].total_price).toEqual('number');
  });

  it('should return empty array for user with no bookings', async () => {
    // Create test user
    const users = await db.insert(usersTable).values({
      email: 'user@test.com',
      password_hash: 'hash',
      first_name: 'Test',
      last_name: 'User',
      role: 'player'
    }).returning().execute();

    const userId = users[0].id;

    const result = await getBookingsByUser(userId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should include team_id when booking has a team', async () => {
    // Create users
    const users = await db.insert(usersTable).values([
      {
        email: 'captain@test.com',
        password_hash: 'hash1',
        first_name: 'Team',
        last_name: 'Captain',
        role: 'player'
      },
      {
        email: 'owner@test.com',
        password_hash: 'hash2',
        first_name: 'Field',
        last_name: 'Owner',
        role: 'field_owner'
      }
    ]).returning().execute();

    const captainId = users[0].id;
    const ownerId = users[1].id;

    // Create team
    const teams = await db.insert(teamsTable).values({
      captain_id: captainId,
      name: 'Test Team',
      skill_level: 5
    }).returning().execute();

    const teamId = teams[0].id;

    // Create field and slot
    const fields = await db.insert(fieldsTable).values({
      owner_id: ownerId,
      name: 'Test Field',
      address: '123 Test St',
      hourly_rate: '50.00'
    }).returning().execute();

    const slots = await db.insert(fieldSlotsTable).values({
      field_id: fields[0].id,
      start_time: new Date('2024-01-01T10:00:00Z'),
      end_time: new Date('2024-01-01T12:00:00Z'),
      price: '100.00'
    }).returning().execute();

    // Create booking with team
    await db.insert(bookingsTable).values({
      slot_id: slots[0].id,
      user_id: captainId,
      team_id: teamId,
      status: 'confirmed',
      total_price: '100.00'
    }).execute();

    const result = await getBookingsByUser(captainId);

    expect(result).toHaveLength(1);
    expect(result[0].team_id).toEqual(teamId);
    expect(result[0].user_id).toEqual(captainId);
  });
});

describe('getBookingsByFieldOwner', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return bookings for fields owned by a specific owner', async () => {
    // Create users
    const users = await db.insert(usersTable).values([
      {
        email: 'owner@test.com',
        password_hash: 'hash1',
        first_name: 'Field',
        last_name: 'Owner',
        role: 'field_owner'
      },
      {
        email: 'player@test.com',
        password_hash: 'hash2',
        first_name: 'Test',
        last_name: 'Player',
        role: 'player'
      }
    ]).returning().execute();

    const ownerId = users[0].id;
    const playerId = users[1].id;

    // Create field
    const fields = await db.insert(fieldsTable).values({
      owner_id: ownerId,
      name: 'Owner Field',
      address: '456 Owner St',
      hourly_rate: '75.00'
    }).returning().execute();

    const fieldId = fields[0].id;

    // Create field slot
    const slots = await db.insert(fieldSlotsTable).values({
      field_id: fieldId,
      start_time: new Date('2024-01-01T14:00:00Z'),
      end_time: new Date('2024-01-01T16:00:00Z'),
      price: '150.00'
    }).returning().execute();

    // Create booking
    const bookings = await db.insert(bookingsTable).values({
      slot_id: slots[0].id,
      user_id: playerId,
      status: 'pending',
      total_price: '150.00',
      notes: 'Field owner booking test'
    }).returning().execute();

    const result = await getBookingsByFieldOwner(ownerId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(bookings[0].id);
    expect(result[0].user_id).toEqual(playerId);
    expect(result[0].slot_id).toEqual(slots[0].id);
    expect(result[0].status).toEqual('pending');
    expect(result[0].total_price).toEqual(150.00);
    expect(typeof result[0].total_price).toEqual('number');
    expect(result[0].notes).toEqual('Field owner booking test');
  });

  it('should return bookings from multiple fields owned by the same owner', async () => {
    // Create users
    const users = await db.insert(usersTable).values([
      {
        email: 'owner@test.com',
        password_hash: 'hash1',
        first_name: 'Field',
        last_name: 'Owner',
        role: 'field_owner'
      },
      {
        email: 'player1@test.com',
        password_hash: 'hash2',
        first_name: 'Player',
        last_name: 'One',
        role: 'player'
      },
      {
        email: 'player2@test.com',
        password_hash: 'hash3',
        first_name: 'Player',
        last_name: 'Two',
        role: 'player'
      }
    ]).returning().execute();

    const ownerId = users[0].id;
    const player1Id = users[1].id;
    const player2Id = users[2].id;

    // Create multiple fields
    const fields = await db.insert(fieldsTable).values([
      {
        owner_id: ownerId,
        name: 'Field One',
        address: '123 Field St',
        hourly_rate: '50.00'
      },
      {
        owner_id: ownerId,
        name: 'Field Two',
        address: '456 Field Ave',
        hourly_rate: '60.00'
      }
    ]).returning().execute();

    // Create slots for each field
    const slots = await db.insert(fieldSlotsTable).values([
      {
        field_id: fields[0].id,
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T12:00:00Z'),
        price: '100.00'
      },
      {
        field_id: fields[1].id,
        start_time: new Date('2024-01-01T14:00:00Z'),
        end_time: new Date('2024-01-01T16:00:00Z'),
        price: '120.00'
      }
    ]).returning().execute();

    // Create bookings for different fields
    await db.insert(bookingsTable).values([
      {
        slot_id: slots[0].id,
        user_id: player1Id,
        status: 'confirmed',
        total_price: '100.00'
      },
      {
        slot_id: slots[1].id,
        user_id: player2Id,
        status: 'pending',
        total_price: '120.00'
      }
    ]).execute();

    const result = await getBookingsByFieldOwner(ownerId);

    expect(result).toHaveLength(2);
    expect(result[0].total_price).toEqual(100.00);
    expect(result[1].total_price).toEqual(120.00);
    expect(typeof result[0].total_price).toEqual('number');
    expect(typeof result[1].total_price).toEqual('number');
  });

  it('should return empty array for owner with no bookings', async () => {
    // Create field owner with no bookings
    const users = await db.insert(usersTable).values({
      email: 'owner@test.com',
      password_hash: 'hash',
      first_name: 'Field',
      last_name: 'Owner',
      role: 'field_owner'
    }).returning().execute();

    const ownerId = users[0].id;

    const result = await getBookingsByFieldOwner(ownerId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should not return bookings for fields owned by other owners', async () => {
    // Create multiple owners and players
    const users = await db.insert(usersTable).values([
      {
        email: 'owner1@test.com',
        password_hash: 'hash1',
        first_name: 'Owner',
        last_name: 'One',
        role: 'field_owner'
      },
      {
        email: 'owner2@test.com',
        password_hash: 'hash2',
        first_name: 'Owner',
        last_name: 'Two',
        role: 'field_owner'
      },
      {
        email: 'player@test.com',
        password_hash: 'hash3',
        first_name: 'Test',
        last_name: 'Player',
        role: 'player'
      }
    ]).returning().execute();

    const owner1Id = users[0].id;
    const owner2Id = users[1].id;
    const playerId = users[2].id;

    // Create fields for different owners
    const fields = await db.insert(fieldsTable).values([
      {
        owner_id: owner1Id,
        name: 'Owner 1 Field',
        address: '123 Owner1 St',
        hourly_rate: '50.00'
      },
      {
        owner_id: owner2Id,
        name: 'Owner 2 Field',
        address: '456 Owner2 St',
        hourly_rate: '60.00'
      }
    ]).returning().execute();

    // Create slots
    const slots = await db.insert(fieldSlotsTable).values([
      {
        field_id: fields[0].id,
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T12:00:00Z'),
        price: '100.00'
      },
      {
        field_id: fields[1].id,
        start_time: new Date('2024-01-01T14:00:00Z'),
        end_time: new Date('2024-01-01T16:00:00Z'),
        price: '120.00'
      }
    ]).returning().execute();

    // Create bookings for both owners' fields
    await db.insert(bookingsTable).values([
      {
        slot_id: slots[0].id,
        user_id: playerId,
        status: 'confirmed',
        total_price: '100.00'
      },
      {
        slot_id: slots[1].id,
        user_id: playerId,
        status: 'pending',
        total_price: '120.00'
      }
    ]).execute();

    // Get bookings for owner1 - should only see their own field's bookings
    const owner1Result = await getBookingsByFieldOwner(owner1Id);
    expect(owner1Result).toHaveLength(1);
    expect(owner1Result[0].total_price).toEqual(100.00);

    // Get bookings for owner2 - should only see their own field's bookings
    const owner2Result = await getBookingsByFieldOwner(owner2Id);
    expect(owner2Result).toHaveLength(1);
    expect(owner2Result[0].total_price).toEqual(120.00);
  });
});