import { db } from '../db';
import { fieldsTable } from '../db/schema';
import { type UpdateFieldInput, type Field } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateField = async (input: UpdateFieldInput, ownerId: number): Promise<Field> => {
  try {
    // First verify the field exists and belongs to the owner
    const existingField = await db.select()
      .from(fieldsTable)
      .where(and(
        eq(fieldsTable.id, input.id),
        eq(fieldsTable.owner_id, ownerId)
      ))
      .execute();

    if (existingField.length === 0) {
      throw new Error('Field not found or you do not have permission to update it');
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.address !== undefined) {
      updateData.address = input.address;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.hourly_rate !== undefined) {
      updateData.hourly_rate = input.hourly_rate.toString(); // Convert number to string for numeric column
    }

    // Update the field
    const result = await db.update(fieldsTable)
      .set(updateData)
      .where(and(
        eq(fieldsTable.id, input.id),
        eq(fieldsTable.owner_id, ownerId)
      ))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Failed to update field');
    }

    // Convert numeric fields back to numbers before returning
    const updatedField = result[0];
    return {
      ...updatedField,
      hourly_rate: parseFloat(updatedField.hourly_rate) // Convert string back to number
    };
  } catch (error) {
    console.error('Field update failed:', error);
    throw error;
  }
};