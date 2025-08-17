import { db } from '../db';
import { fieldSlotsTable } from '../db/schema';
import { type FieldSlot } from '../schema';
import { eq } from 'drizzle-orm';

export async function getAvailableFieldSlots(): Promise<FieldSlot[]> {
  try {
    const results = await db.select()
      .from(fieldSlotsTable)
      .where(eq(fieldSlotsTable.is_available, true))
      .execute();

    // Convert numeric fields from string to number
    return results.map(slot => ({
      ...slot,
      price: parseFloat(slot.price)
    }));
  } catch (error) {
    console.error('Failed to fetch available field slots:', error);
    throw error;
  }
}

export async function getFieldSlotsByField(fieldId: number): Promise<FieldSlot[]> {
  try {
    const results = await db.select()
      .from(fieldSlotsTable)
      .where(eq(fieldSlotsTable.field_id, fieldId))
      .execute();

    // Convert numeric fields from string to number
    return results.map(slot => ({
      ...slot,
      price: parseFloat(slot.price)
    }));
  } catch (error) {
    console.error('Failed to fetch field slots by field:', error);
    throw error;
  }
}