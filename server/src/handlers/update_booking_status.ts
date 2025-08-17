import { db } from '../db';
import { bookingsTable, fieldSlotsTable, fieldsTable } from '../db/schema';
import { type Booking, type BookingStatus } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateBookingStatus(bookingId: number, status: BookingStatus, userId: number): Promise<Booking> {
  try {
    // First, get the booking with field information to check authorization
    const bookingWithFieldInfo = await db.select({
      booking: bookingsTable,
      slot: fieldSlotsTable,
      field: fieldsTable
    })
    .from(bookingsTable)
    .innerJoin(fieldSlotsTable, eq(bookingsTable.slot_id, fieldSlotsTable.id))
    .innerJoin(fieldsTable, eq(fieldSlotsTable.field_id, fieldsTable.id))
    .where(eq(bookingsTable.id, bookingId))
    .execute();

    if (bookingWithFieldInfo.length === 0) {
      throw new Error('Booking not found');
    }

    const { booking, field } = bookingWithFieldInfo[0];

    // Check authorization: only field owner or booking creator can update status
    if (booking.user_id !== userId && field.owner_id !== userId) {
      throw new Error('Unauthorized to update this booking');
    }

    // Update the booking status and updated_at timestamp
    const updatedBookings = await db.update(bookingsTable)
      .set({ 
        status: status,
        updated_at: new Date()
      })
      .where(eq(bookingsTable.id, bookingId))
      .returning()
      .execute();

    const updatedBooking = updatedBookings[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...updatedBooking,
      total_price: parseFloat(updatedBooking.total_price)
    };
  } catch (error) {
    console.error('Booking status update failed:', error);
    throw error;
  }
}