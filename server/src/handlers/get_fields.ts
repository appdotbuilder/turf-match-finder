import { db } from '../db';
import { fieldsTable } from '../db/schema';
import { type Field } from '../schema';
import { eq } from 'drizzle-orm';

export async function getFields(): Promise<Field[]> {
  try {
    const results = await db.select()
      .from(fieldsTable)
      .execute();

    // Convert numeric fields from string to number
    return results.map(field => ({
      ...field,
      hourly_rate: parseFloat(field.hourly_rate)
    }));
  } catch (error) {
    console.error('Failed to fetch fields:', error);
    throw error;
  }
}

export async function getFieldsByOwner(ownerId: number): Promise<Field[]> {
  try {
    const results = await db.select()
      .from(fieldsTable)
      .where(eq(fieldsTable.owner_id, ownerId))
      .execute();

    // Convert numeric fields from string to number
    return results.map(field => ({
      ...field,
      hourly_rate: parseFloat(field.hourly_rate)
    }));
  } catch (error) {
    console.error('Failed to fetch fields by owner:', error);
    throw error;
  }
}