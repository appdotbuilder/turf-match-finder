import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fieldSlotsTable, fieldsTable, usersTable } from '../db/schema';
import { type CreateFieldSlotInput } from '../schema';
import { createFieldSlot } from '../handlers/create_field_slot';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
async function createTestUser() {
  const result = await db.insert(usersTable)
    .values({
      email: 'owner@test.com',
      password_hash: 'hashed_password',
      first_name: 'Field',
      last_name: 'Owner',
      role: 'field_owner'
    })
    .returning()
    .execute();
  
  return result[0];
}

// Helper function to create a test field
async function createTestField(ownerId: number) {
  const result = await db.insert(fieldsTable)
    .values({
      owner_id: ownerId,
      name: 'Test Football Field',
      address: '123 Sports Ave',
      description: 'A test field for football',
      hourly_rate: '50.00'
    })
    .returning()
    .execute();
  
  return result[0];
}

describe('createFieldSlot', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testField: any;

  beforeEach(async () => {
    testUser = await createTestUser();
    testField = await createTestField(testUser.id);
  });

  const testInput: CreateFieldSlotInput = {
    field_id: 1, // Will be overridden in tests
    start_time: new Date('2024-01-15T10:00:00Z'),
    end_time: new Date('2024-01-15T12:00:00Z'),
    price: 100.00
  };

  it('should create a field slot successfully', async () => {
    const input = { ...testInput, field_id: testField.id };
    const result = await createFieldSlot(input);

    // Basic field validation
    expect(result.field_id).toEqual(testField.id);
    expect(result.start_time).toEqual(input.start_time);
    expect(result.end_time).toEqual(input.end_time);
    expect(result.price).toEqual(100.00);
    expect(typeof result.price).toBe('number');
    expect(result.is_available).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save field slot to database', async () => {
    const input = { ...testInput, field_id: testField.id };
    const result = await createFieldSlot(input);

    // Query using proper drizzle syntax
    const fieldSlots = await db.select()
      .from(fieldSlotsTable)
      .where(eq(fieldSlotsTable.id, result.id))
      .execute();

    expect(fieldSlots).toHaveLength(1);
    expect(fieldSlots[0].field_id).toEqual(testField.id);
    expect(fieldSlots[0].start_time).toEqual(input.start_time);
    expect(fieldSlots[0].end_time).toEqual(input.end_time);
    expect(parseFloat(fieldSlots[0].price)).toEqual(100.00);
    expect(fieldSlots[0].is_available).toBe(true);
    expect(fieldSlots[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different price values correctly', async () => {
    const input = { ...testInput, field_id: testField.id, price: 75.50 };
    const result = await createFieldSlot(input);

    expect(result.price).toEqual(75.50);
    expect(typeof result.price).toBe('number');

    // Verify in database
    const fieldSlots = await db.select()
      .from(fieldSlotsTable)
      .where(eq(fieldSlotsTable.id, result.id))
      .execute();

    expect(parseFloat(fieldSlots[0].price)).toEqual(75.50);
  });

  it('should handle different time ranges correctly', async () => {
    const startTime = new Date('2024-02-20T14:00:00Z');
    const endTime = new Date('2024-02-20T16:30:00Z');
    const input = {
      ...testInput,
      field_id: testField.id,
      start_time: startTime,
      end_time: endTime
    };
    
    const result = await createFieldSlot(input);

    expect(result.start_time).toEqual(startTime);
    expect(result.end_time).toEqual(endTime);

    // Verify in database
    const fieldSlots = await db.select()
      .from(fieldSlotsTable)
      .where(eq(fieldSlotsTable.id, result.id))
      .execute();

    expect(fieldSlots[0].start_time).toEqual(startTime);
    expect(fieldSlots[0].end_time).toEqual(endTime);
  });

  it('should throw error when field does not exist', async () => {
    const input = { ...testInput, field_id: 99999 }; // Non-existent field ID

    await expect(createFieldSlot(input)).rejects.toThrow(/field not found/i);
  });

  it('should create multiple slots for the same field', async () => {
    const input1 = { 
      ...testInput, 
      field_id: testField.id,
      start_time: new Date('2024-01-15T10:00:00Z'),
      end_time: new Date('2024-01-15T12:00:00Z')
    };
    const input2 = { 
      ...testInput, 
      field_id: testField.id,
      start_time: new Date('2024-01-15T14:00:00Z'),
      end_time: new Date('2024-01-15T16:00:00Z'),
      price: 120.00
    };

    const result1 = await createFieldSlot(input1);
    const result2 = await createFieldSlot(input2);

    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.field_id).toEqual(testField.id);
    expect(result2.field_id).toEqual(testField.id);
    expect(result2.price).toEqual(120.00);

    // Verify both exist in database
    const allSlots = await db.select()
      .from(fieldSlotsTable)
      .where(eq(fieldSlotsTable.field_id, testField.id))
      .execute();

    expect(allSlots).toHaveLength(2);
  });
});