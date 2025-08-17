import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, fieldsTable, fieldSlotsTable } from '../db/schema';
import { getAvailableFieldSlots, getFieldSlotsByField } from '../handlers/get_field_slots';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'fieldowner@test.com',
  password_hash: 'hashedpassword',
  first_name: 'John',
  last_name: 'Doe',
  role: 'field_owner' as const,
  phone: '123-456-7890'
};

const testField = {
  name: 'Test Field',
  address: '123 Test St',
  description: 'A test field',
  hourly_rate: '50.00'
};

const testSlot1 = {
  start_time: new Date('2024-01-15T10:00:00Z'),
  end_time: new Date('2024-01-15T12:00:00Z'),
  price: '100.00',
  is_available: true
};

const testSlot2 = {
  start_time: new Date('2024-01-15T14:00:00Z'),
  end_time: new Date('2024-01-15T16:00:00Z'),
  price: '120.00',
  is_available: false
};

const testSlot3 = {
  start_time: new Date('2024-01-16T10:00:00Z'),
  end_time: new Date('2024-01-16T12:00:00Z'),
  price: '110.00',
  is_available: true
};

describe('getAvailableFieldSlots', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all available field slots', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test field
    const [field] = await db.insert(fieldsTable)
      .values({
        ...testField,
        owner_id: user.id
      })
      .returning()
      .execute();

    // Create test slots (some available, some not)
    await db.insert(fieldSlotsTable)
      .values([
        { ...testSlot1, field_id: field.id },
        { ...testSlot2, field_id: field.id },
        { ...testSlot3, field_id: field.id }
      ])
      .execute();

    const result = await getAvailableFieldSlots();

    // Should only return available slots
    expect(result).toHaveLength(2);
    
    // Verify numeric conversion
    result.forEach(slot => {
      expect(typeof slot.price).toBe('number');
      expect(slot.is_available).toBe(true);
    });

    // Check specific slot data
    const slot1 = result.find(s => s.price === 100);
    const slot3 = result.find(s => s.price === 110);

    expect(slot1).toBeDefined();
    expect(slot1?.field_id).toBe(field.id);
    expect(slot1?.start_time).toEqual(testSlot1.start_time);
    expect(slot1?.end_time).toEqual(testSlot1.end_time);

    expect(slot3).toBeDefined();
    expect(slot3?.field_id).toBe(field.id);
    expect(slot3?.price).toBe(110);
  });

  it('should return empty array when no available slots exist', async () => {
    // Create test user and field
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [field] = await db.insert(fieldsTable)
      .values({
        ...testField,
        owner_id: user.id
      })
      .returning()
      .execute();

    // Create only unavailable slot
    await db.insert(fieldSlotsTable)
      .values({
        ...testSlot2,
        field_id: field.id
      })
      .execute();

    const result = await getAvailableFieldSlots();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array when no slots exist at all', async () => {
    const result = await getAvailableFieldSlots();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should include all required field slot properties', async () => {
    // Create test user and field
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [field] = await db.insert(fieldsTable)
      .values({
        ...testField,
        owner_id: user.id
      })
      .returning()
      .execute();

    // Create available slot
    await db.insert(fieldSlotsTable)
      .values({
        ...testSlot1,
        field_id: field.id
      })
      .execute();

    const result = await getAvailableFieldSlots();

    expect(result).toHaveLength(1);
    const slot = result[0];

    expect(slot.id).toBeDefined();
    expect(slot.field_id).toBe(field.id);
    expect(slot.start_time).toBeInstanceOf(Date);
    expect(slot.end_time).toBeInstanceOf(Date);
    expect(typeof slot.price).toBe('number');
    expect(typeof slot.is_available).toBe('boolean');
    expect(slot.created_at).toBeInstanceOf(Date);
  });
});

describe('getFieldSlotsByField', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all slots for a specific field', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create two test fields
    const [field1] = await db.insert(fieldsTable)
      .values({
        ...testField,
        name: 'Field 1',
        owner_id: user.id
      })
      .returning()
      .execute();

    const [field2] = await db.insert(fieldsTable)
      .values({
        ...testField,
        name: 'Field 2',
        owner_id: user.id
      })
      .returning()
      .execute();

    // Create slots for both fields
    await db.insert(fieldSlotsTable)
      .values([
        { ...testSlot1, field_id: field1.id },
        { ...testSlot2, field_id: field1.id },
        { ...testSlot3, field_id: field2.id }
      ])
      .execute();

    const result = await getFieldSlotsByField(field1.id);

    // Should return both slots from field1 (available and unavailable)
    expect(result).toHaveLength(2);
    
    // Verify all slots belong to the correct field
    result.forEach(slot => {
      expect(slot.field_id).toBe(field1.id);
      expect(typeof slot.price).toBe('number');
    });

    // Check specific slot data
    const availableSlot = result.find(s => s.is_available === true);
    const unavailableSlot = result.find(s => s.is_available === false);

    expect(availableSlot).toBeDefined();
    expect(availableSlot?.price).toBe(100);

    expect(unavailableSlot).toBeDefined();
    expect(unavailableSlot?.price).toBe(120);
  });

  it('should return empty array for field with no slots', async () => {
    // Create test user and field
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [field] = await db.insert(fieldsTable)
      .values({
        ...testField,
        owner_id: user.id
      })
      .returning()
      .execute();

    const result = await getFieldSlotsByField(field.id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent field', async () => {
    const nonExistentFieldId = 999;
    const result = await getFieldSlotsByField(nonExistentFieldId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should include all required field slot properties', async () => {
    // Create test user and field
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [field] = await db.insert(fieldsTable)
      .values({
        ...testField,
        owner_id: user.id
      })
      .returning()
      .execute();

    // Create slot
    await db.insert(fieldSlotsTable)
      .values({
        ...testSlot1,
        field_id: field.id
      })
      .execute();

    const result = await getFieldSlotsByField(field.id);

    expect(result).toHaveLength(1);
    const slot = result[0];

    expect(slot.id).toBeDefined();
    expect(slot.field_id).toBe(field.id);
    expect(slot.start_time).toBeInstanceOf(Date);
    expect(slot.end_time).toBeInstanceOf(Date);
    expect(typeof slot.price).toBe('number');
    expect(typeof slot.is_available).toBe('boolean');
    expect(slot.created_at).toBeInstanceOf(Date);
  });

  it('should handle multiple fields with different slot counts', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create multiple fields
    const [field1] = await db.insert(fieldsTable)
      .values({
        ...testField,
        name: 'Field 1',
        owner_id: user.id
      })
      .returning()
      .execute();

    const [field2] = await db.insert(fieldsTable)
      .values({
        ...testField,
        name: 'Field 2',
        owner_id: user.id
      })
      .returning()
      .execute();

    // Create different numbers of slots for each field
    await db.insert(fieldSlotsTable)
      .values([
        { ...testSlot1, field_id: field1.id },
        { ...testSlot2, field_id: field1.id },
        { ...testSlot3, field_id: field1.id },
        { ...testSlot1, field_id: field2.id, start_time: new Date('2024-01-17T10:00:00Z'), end_time: new Date('2024-01-17T12:00:00Z') }
      ])
      .execute();

    const field1Slots = await getFieldSlotsByField(field1.id);
    const field2Slots = await getFieldSlotsByField(field2.id);

    expect(field1Slots).toHaveLength(3);
    expect(field2Slots).toHaveLength(1);

    // Verify field association is correct
    field1Slots.forEach(slot => {
      expect(slot.field_id).toBe(field1.id);
    });

    field2Slots.forEach(slot => {
      expect(slot.field_id).toBe(field2.id);
    });
  });
});