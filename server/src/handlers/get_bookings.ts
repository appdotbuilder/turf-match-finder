import { db } from '../db';
import { bookingsTable, fieldSlotsTable, fieldsTable } from '../db/schema';
import { type Booking } from '../schema';
import { eq } from 'drizzle-orm';

export async function getBookingsByUser(userId: number): Promise<Booking[]> {
  try {
    const results = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.user_id, userId))
      .execute();

    return results.map(booking => ({
      ...booking,
      total_price: parseFloat(booking.total_price) // Convert numeric field to number
    }));
  } catch (error) {
    console.error('Failed to get bookings by user:', error);
    throw error;
  }
}

export async function getBookingsByFieldOwner(ownerId: number): Promise<Booking[]> {
  try {
    // Need to join through field_slots -> fields to get bookings for fields owned by the owner
    const results = await db.select({
      id: bookingsTable.id,
      slot_id: bookingsTable.slot_id,
      user_id: bookingsTable.user_id,
      team_id: bookingsTable.team_id,
      status: bookingsTable.status,
      total_price: bookingsTable.total_price,
      notes: bookingsTable.notes,
      created_at: bookingsTable.created_at,
      updated_at: bookingsTable.updated_at
    })
      .from(bookingsTable)
      .innerJoin(fieldSlotsTable, eq(bookingsTable.slot_id, fieldSlotsTable.id))
      .innerJoin(fieldsTable, eq(fieldSlotsTable.field_id, fieldsTable.id))
      .where(eq(fieldsTable.owner_id, ownerId))
      .execute();

    return results.map(booking => ({
      ...booking,
      total_price: parseFloat(booking.total_price) // Convert numeric field to number
    }));
  } catch (error) {
    console.error('Failed to get bookings by field owner:', error);
    throw error;
  }
}