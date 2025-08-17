import { db } from '../db';
import { fieldSlotsTable, fieldsTable } from '../db/schema';
import { type CreateFieldSlotInput, type FieldSlot } from '../schema';
import { eq } from 'drizzle-orm';

export const createFieldSlot = async (input: CreateFieldSlotInput): Promise<FieldSlot> => {
  try {
    // Verify that the field exists
    const field = await db.select()
      .from(fieldsTable)
      .where(eq(fieldsTable.id, input.field_id))
      .execute();

    if (field.length === 0) {
      throw new Error('Field not found');
    }

    // Insert field slot record
    const result = await db.insert(fieldSlotsTable)
      .values({
        field_id: input.field_id,
        start_time: input.start_time,
        end_time: input.end_time,
        price: input.price.toString(), // Convert number to string for numeric column
        is_available: true // Default value
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const fieldSlot = result[0];
    return {
      ...fieldSlot,
      price: parseFloat(fieldSlot.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Field slot creation failed:', error);
    throw error;
  }
};