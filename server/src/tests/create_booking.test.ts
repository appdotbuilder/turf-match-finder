import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  bookingsTable, 
  fieldsTable, 
  fieldSlotsTable, 
  usersTable, 
  teamsTable,
  teamMembersTable
} from '../db/schema';
import { type CreateBookingInput } from '../schema';
import { createBooking } from '../handlers/create_booking';
import { eq, and } from 'drizzle-orm';

describe('createBooking', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'player@test.com',
          password_hash: 'hashed_password',
          first_name: 'John',
          last_name: 'Player',
          role: 'player'
        },
        {
          email: 'owner@test.com',
          password_hash: 'hashed_password',
          first_name: 'Jane',
          last_name: 'Owner',
          role: 'field_owner'
        },
        {
          email: 'captain@test.com',
          password_hash: 'hashed_password',
          first_name: 'Captain',
          last_name: 'Leader',
          role: 'player'
        }
      ])
      .returning()
      .execute();

    const [player, fieldOwner, captain] = users;

    // Create test field
    const fields = await db.insert(fieldsTable)
      .values({
        owner_id: fieldOwner.id,
        name: 'Test Field',
        address: '123 Test St',
        description: 'A great field for testing',
        hourly_rate: '50.00'
      })
      .returning()
      .execute();

    const field = fields[0];

    // Create test field slots
    const startTime = new Date('2024-01-15T10:00:00Z');
    const endTime = new Date('2024-01-15T12:00:00Z');
    const unavailableStartTime = new Date('2024-01-15T14:00:00Z');
    const unavailableEndTime = new Date('2024-01-15T16:00:00Z');

    const slots = await db.insert(fieldSlotsTable)
      .values([
        {
          field_id: field.id,
          start_time: startTime,
          end_time: endTime,
          price: '100.00',
          is_available: true
        },
        {
          field_id: field.id,
          start_time: unavailableStartTime,
          end_time: unavailableEndTime,
          price: '100.00',
          is_available: false
        }
      ])
      .returning()
      .execute();

    const [availableSlot, unavailableSlot] = slots;

    // Create test team
    const teams = await db.insert(teamsTable)
      .values({
        captain_id: captain.id,
        name: 'Test Team',
        description: 'A team for testing',
        skill_level: 5
      })
      .returning()
      .execute();

    const team = teams[0];

    // Add player as team member
    await db.insert(teamMembersTable)
      .values({
        team_id: team.id,
        user_id: player.id
      })
      .execute();

    return {
      player,
      fieldOwner,
      captain,
      field,
      availableSlot,
      unavailableSlot,
      team
    };
  };

  it('should create a booking successfully', async () => {
    const { player, availableSlot } = await createTestData();

    const input: CreateBookingInput = {
      slot_id: availableSlot.id,
      notes: 'Test booking notes'
    };

    const result = await createBooking(input, player.id);

    // Verify booking fields
    expect(result.slot_id).toEqual(availableSlot.id);
    expect(result.user_id).toEqual(player.id);
    expect(result.team_id).toBeNull();
    expect(result.status).toEqual('pending');
    expect(result.total_price).toEqual(100.00);
    expect(result.notes).toEqual('Test booking notes');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.total_price).toBe('number');
  });

  it('should create a booking with team', async () => {
    const { player, availableSlot, team } = await createTestData();

    const input: CreateBookingInput = {
      slot_id: availableSlot.id,
      team_id: team.id,
      notes: 'Team booking'
    };

    const result = await createBooking(input, player.id);

    expect(result.team_id).toEqual(team.id);
    expect(result.notes).toEqual('Team booking');
    expect(result.total_price).toEqual(100.00);
  });

  it('should create booking when user is team captain', async () => {
    const { captain, availableSlot, team } = await createTestData();

    const input: CreateBookingInput = {
      slot_id: availableSlot.id,
      team_id: team.id
    };

    const result = await createBooking(input, captain.id);

    expect(result.team_id).toEqual(team.id);
    expect(result.user_id).toEqual(captain.id);
  });

  it('should save booking to database', async () => {
    const { player, availableSlot } = await createTestData();

    const input: CreateBookingInput = {
      slot_id: availableSlot.id,
      notes: 'Database test'
    };

    const result = await createBooking(input, player.id);

    // Verify booking was saved to database
    const bookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, result.id))
      .execute();

    expect(bookings).toHaveLength(1);
    const savedBooking = bookings[0];
    expect(savedBooking.slot_id).toEqual(availableSlot.id);
    expect(savedBooking.user_id).toEqual(player.id);
    expect(parseFloat(savedBooking.total_price)).toEqual(100.00);
    expect(savedBooking.notes).toEqual('Database test');
    expect(savedBooking.created_at).toBeInstanceOf(Date);
  });

  it('should calculate total price from slot price', async () => {
    const { player, field, fieldOwner } = await createTestData();

    // Create slot with different price
    const customSlots = await db.insert(fieldSlotsTable)
      .values({
        field_id: field.id,
        start_time: new Date('2024-01-16T10:00:00Z'),
        end_time: new Date('2024-01-16T12:00:00Z'),
        price: '75.50',
        is_available: true
      })
      .returning()
      .execute();

    const customSlot = customSlots[0];

    const input: CreateBookingInput = {
      slot_id: customSlot.id
    };

    const result = await createBooking(input, player.id);

    expect(result.total_price).toEqual(75.50);
    expect(typeof result.total_price).toBe('number');
  });

  it('should throw error when user does not exist', async () => {
    const { availableSlot } = await createTestData();

    const input: CreateBookingInput = {
      slot_id: availableSlot.id
    };

    await expect(createBooking(input, 99999)).rejects.toThrow(/user with id 99999 not found/i);
  });

  it('should throw error when field slot does not exist', async () => {
    const { player } = await createTestData();

    const input: CreateBookingInput = {
      slot_id: 99999
    };

    await expect(createBooking(input, player.id)).rejects.toThrow(/field slot with id 99999 not found/i);
  });

  it('should throw error when field slot is not available', async () => {
    const { player, unavailableSlot } = await createTestData();

    const input: CreateBookingInput = {
      slot_id: unavailableSlot.id
    };

    await expect(createBooking(input, player.id)).rejects.toThrow(/field slot with id .* is not available/i);
  });

  it('should throw error when team does not exist', async () => {
    const { player, availableSlot } = await createTestData();

    const input: CreateBookingInput = {
      slot_id: availableSlot.id,
      team_id: 99999
    };

    await expect(createBooking(input, player.id)).rejects.toThrow(/team with id 99999 not found/i);
  });

  it('should throw error when user is not a member of the team', async () => {
    const { fieldOwner, availableSlot, team } = await createTestData();

    const input: CreateBookingInput = {
      slot_id: availableSlot.id,
      team_id: team.id
    };

    await expect(createBooking(input, fieldOwner.id)).rejects.toThrow(/user is not a member of team/i);
  });

  it('should create booking with minimal input', async () => {
    const { player, availableSlot } = await createTestData();

    const input: CreateBookingInput = {
      slot_id: availableSlot.id
    };

    const result = await createBooking(input, player.id);

    expect(result.slot_id).toEqual(availableSlot.id);
    expect(result.user_id).toEqual(player.id);
    expect(result.team_id).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.status).toEqual('pending');
    expect(result.total_price).toEqual(100.00);
  });

  it('should handle numeric price conversions correctly', async () => {
    const { player, field } = await createTestData();

    // Create slot with decimal price
    const decimalSlots = await db.insert(fieldSlotsTable)
      .values({
        field_id: field.id,
        start_time: new Date('2024-01-17T10:00:00Z'),
        end_time: new Date('2024-01-17T12:00:00Z'),
        price: '123.45',
        is_available: true
      })
      .returning()
      .execute();

    const decimalSlot = decimalSlots[0];

    const input: CreateBookingInput = {
      slot_id: decimalSlot.id
    };

    const result = await createBooking(input, player.id);

    // Verify numeric conversion
    expect(result.total_price).toEqual(123.45);
    expect(typeof result.total_price).toBe('number');

    // Verify database storage
    const savedBookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, result.id))
      .execute();

    expect(parseFloat(savedBookings[0].total_price)).toEqual(123.45);
  });
});