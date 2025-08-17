import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, fieldsTable, fieldSlotsTable, bookingsTable, teamsTable } from '../db/schema';
import { updateBookingStatus } from '../handlers/update_booking_status';
import { eq } from 'drizzle-orm';

describe('updateBookingStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let fieldOwner: any;
  let bookingUser: any;
  let otherUser: any;
  let field: any;
  let slot: any;
  let booking: any;
  let team: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'owner@example.com',
          password_hash: 'hash1',
          first_name: 'Field',
          last_name: 'Owner',
          role: 'field_owner'
        },
        {
          email: 'player@example.com',
          password_hash: 'hash2',
          first_name: 'Test',
          last_name: 'Player',
          role: 'player'
        },
        {
          email: 'other@example.com',
          password_hash: 'hash3',
          first_name: 'Other',
          last_name: 'User',
          role: 'player'
        }
      ])
      .returning()
      .execute();

    fieldOwner = users[0];
    bookingUser = users[1];
    otherUser = users[2];

    // Create test field
    const fields = await db.insert(fieldsTable)
      .values({
        owner_id: fieldOwner.id,
        name: 'Test Field',
        address: '123 Test St',
        hourly_rate: '50.00'
      })
      .returning()
      .execute();

    field = fields[0];

    // Create test field slot
    const slots = await db.insert(fieldSlotsTable)
      .values({
        field_id: field.id,
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T12:00:00Z'),
        price: '100.00'
      })
      .returning()
      .execute();

    slot = slots[0];

    // Create test booking
    const bookings = await db.insert(bookingsTable)
      .values({
        slot_id: slot.id,
        user_id: bookingUser.id,
        status: 'pending',
        total_price: '100.00'
      })
      .returning()
      .execute();

    booking = bookings[0];

    // Create test team
    const teams = await db.insert(teamsTable)
      .values({
        captain_id: bookingUser.id,
        name: 'Test Team',
        skill_level: 5
      })
      .returning()
      .execute();

    team = teams[0];
  });

  it('should update booking status when field owner updates it', async () => {
    const result = await updateBookingStatus(booking.id, 'confirmed', fieldOwner.id);

    expect(result.status).toEqual('confirmed');
    expect(result.id).toEqual(booking.id);
    expect(result.user_id).toEqual(bookingUser.id);
    expect(result.total_price).toEqual(100);
    expect(typeof result.total_price).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > booking.updated_at).toBe(true);
  });

  it('should update booking status when booking creator updates it', async () => {
    const result = await updateBookingStatus(booking.id, 'cancelled', bookingUser.id);

    expect(result.status).toEqual('cancelled');
    expect(result.id).toEqual(booking.id);
    expect(result.user_id).toEqual(bookingUser.id);
    expect(result.total_price).toEqual(100);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated booking status to database', async () => {
    await updateBookingStatus(booking.id, 'confirmed', fieldOwner.id);

    const updatedBookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, booking.id))
      .execute();

    expect(updatedBookings).toHaveLength(1);
    expect(updatedBookings[0].status).toEqual('confirmed');
    expect(updatedBookings[0].updated_at > booking.updated_at).toBe(true);
  });

  it('should throw error when user is not authorized', async () => {
    await expect(updateBookingStatus(booking.id, 'confirmed', otherUser.id))
      .rejects.toThrow(/unauthorized to update this booking/i);
  });

  it('should throw error when booking does not exist', async () => {
    await expect(updateBookingStatus(99999, 'confirmed', fieldOwner.id))
      .rejects.toThrow(/booking not found/i);
  });

  it('should handle all valid booking statuses', async () => {
    // Test confirming
    const confirmed = await updateBookingStatus(booking.id, 'confirmed', fieldOwner.id);
    expect(confirmed.status).toEqual('confirmed');

    // Test cancelling
    const cancelled = await updateBookingStatus(booking.id, 'cancelled', fieldOwner.id);
    expect(cancelled.status).toEqual('cancelled');

    // Test setting back to pending
    const pending = await updateBookingStatus(booking.id, 'pending', fieldOwner.id);
    expect(pending.status).toEqual('pending');
  });

  it('should preserve other booking fields when updating status', async () => {
    const result = await updateBookingStatus(booking.id, 'confirmed', fieldOwner.id);

    expect(result.slot_id).toEqual(booking.slot_id);
    expect(result.user_id).toEqual(booking.user_id);
    expect(result.team_id).toEqual(booking.team_id);
    expect(result.total_price).toEqual(parseFloat(booking.total_price));
    expect(result.notes).toEqual(booking.notes);
    expect(result.created_at).toEqual(booking.created_at);
  });

  it('should work with bookings that have team_id', async () => {
    // Create a booking with team_id
    const bookingWithTeam = await db.insert(bookingsTable)
      .values({
        slot_id: slot.id,
        user_id: bookingUser.id,
        team_id: team.id,
        status: 'pending',
        total_price: '150.00',
        notes: 'Team booking'
      })
      .returning()
      .execute();

    const result = await updateBookingStatus(bookingWithTeam[0].id, 'confirmed', fieldOwner.id);

    expect(result.status).toEqual('confirmed');
    expect(result.team_id).toEqual(team.id);
    expect(result.notes).toEqual('Team booking');
    expect(result.total_price).toEqual(150);
  });
});