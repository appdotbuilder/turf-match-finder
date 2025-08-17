import { db } from '../db';
import { bookingsTable, fieldSlotsTable, teamsTable, usersTable } from '../db/schema';
import { type CreateBookingInput, type Booking } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createBooking(input: CreateBookingInput, userId: number): Promise<Booking> {
  try {
    // First, verify that the user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    // Verify that the field slot exists and is available
    const slot = await db.select()
      .from(fieldSlotsTable)
      .where(eq(fieldSlotsTable.id, input.slot_id))
      .execute();

    if (slot.length === 0) {
      throw new Error(`Field slot with id ${input.slot_id} not found`);
    }

    const fieldSlot = slot[0];
    if (!fieldSlot.is_available) {
      throw new Error(`Field slot with id ${input.slot_id} is not available`);
    }

    // If team_id is provided, verify that the team exists and the user is a member
    if (input.team_id) {
      const team = await db.select()
        .from(teamsTable)
        .where(eq(teamsTable.id, input.team_id))
        .execute();

      if (team.length === 0) {
        throw new Error(`Team with id ${input.team_id} not found`);
      }

      // Check if user is the captain or a member of the team
      const teamMembership = await db.select()
        .from(teamsTable)
        .where(
          and(
            eq(teamsTable.id, input.team_id),
            eq(teamsTable.captain_id, userId)
          )
        )
        .execute();

      if (teamMembership.length === 0) {
        // If not captain, check if user is a team member
        const { teamMembersTable } = await import('../db/schema');
        const membershipCheck = await db.select()
          .from(teamMembersTable)
          .where(
            and(
              eq(teamMembersTable.team_id, input.team_id),
              eq(teamMembersTable.user_id, userId)
            )
          )
          .execute();

        if (membershipCheck.length === 0) {
          throw new Error(`User is not a member of team with id ${input.team_id}`);
        }
      }
    }

    // Calculate total price from the slot price
    const totalPrice = parseFloat(fieldSlot.price);

    // Create the booking
    const result = await db.insert(bookingsTable)
      .values({
        slot_id: input.slot_id,
        user_id: userId,
        team_id: input.team_id || null,
        total_price: totalPrice.toString(), // Convert number to string for numeric column
        notes: input.notes || null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const booking = result[0];
    return {
      ...booking,
      total_price: parseFloat(booking.total_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Booking creation failed:', error);
    throw error;
  }
}