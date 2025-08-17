import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fieldsTable, usersTable } from '../db/schema';
import { type UpdateFieldInput } from '../schema';
import { updateField } from '../handlers/update_field';
import { eq } from 'drizzle-orm';

describe('updateField', () => {
  let ownerId: number;
  let otherUserId: number;
  let fieldId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test users
    const ownerResult = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Field',
        last_name: 'Owner',
        role: 'field_owner'
      })
      .returning()
      .execute();
    ownerId = ownerResult[0].id;

    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Other',
        last_name: 'User',
        role: 'player'
      })
      .returning()
      .execute();
    otherUserId = otherUserResult[0].id;

    // Create test field
    const fieldResult = await db.insert(fieldsTable)
      .values({
        owner_id: ownerId,
        name: 'Original Field',
        address: 'Original Address',
        description: 'Original description',
        hourly_rate: '25.00'
      })
      .returning()
      .execute();
    fieldId = fieldResult[0].id;
  });

  afterEach(resetDB);

  it('should update field name only', async () => {
    const input: UpdateFieldInput = {
      id: fieldId,
      name: 'Updated Field Name'
    };

    const result = await updateField(input, ownerId);

    expect(result.id).toEqual(fieldId);
    expect(result.owner_id).toEqual(ownerId);
    expect(result.name).toEqual('Updated Field Name');
    expect(result.address).toEqual('Original Address'); // Unchanged
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.hourly_rate).toEqual(25.00); // Unchanged
    expect(typeof result.hourly_rate).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateFieldInput = {
      id: fieldId,
      name: 'New Name',
      address: 'New Address',
      hourly_rate: 35.50
    };

    const result = await updateField(input, ownerId);

    expect(result.id).toEqual(fieldId);
    expect(result.name).toEqual('New Name');
    expect(result.address).toEqual('New Address');
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.hourly_rate).toEqual(35.50);
    expect(typeof result.hourly_rate).toBe('number');
  });

  it('should update description to null', async () => {
    const input: UpdateFieldInput = {
      id: fieldId,
      description: null
    };

    const result = await updateField(input, ownerId);

    expect(result.description).toBeNull();
    expect(result.name).toEqual('Original Field'); // Unchanged
  });

  it('should save updates to database', async () => {
    const input: UpdateFieldInput = {
      id: fieldId,
      name: 'Database Test Field',
      hourly_rate: 40.25
    };

    await updateField(input, ownerId);

    // Verify changes persisted to database
    const savedField = await db.select()
      .from(fieldsTable)
      .where(eq(fieldsTable.id, fieldId))
      .execute();

    expect(savedField).toHaveLength(1);
    expect(savedField[0].name).toEqual('Database Test Field');
    expect(parseFloat(savedField[0].hourly_rate)).toEqual(40.25);
    expect(savedField[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when field does not exist', async () => {
    const input: UpdateFieldInput = {
      id: 99999, // Non-existent field
      name: 'This should fail'
    };

    await expect(updateField(input, ownerId))
      .rejects.toThrow(/field not found or you do not have permission/i);
  });

  it('should throw error when user is not the owner', async () => {
    const input: UpdateFieldInput = {
      id: fieldId,
      name: 'Unauthorized update'
    };

    await expect(updateField(input, otherUserId))
      .rejects.toThrow(/field not found or you do not have permission/i);
  });

  it('should handle decimal hourly rates correctly', async () => {
    const input: UpdateFieldInput = {
      id: fieldId,
      hourly_rate: 29.99
    };

    const result = await updateField(input, ownerId);

    expect(result.hourly_rate).toEqual(29.99);
    expect(typeof result.hourly_rate).toBe('number');

    // Verify precision is maintained in database
    const savedField = await db.select()
      .from(fieldsTable)
      .where(eq(fieldsTable.id, fieldId))
      .execute();

    expect(parseFloat(savedField[0].hourly_rate)).toEqual(29.99);
  });

  it('should update only the specified field when owner has multiple fields', async () => {
    // Create another field for the same owner
    const secondFieldResult = await db.insert(fieldsTable)
      .values({
        owner_id: ownerId,
        name: 'Second Field',
        address: 'Second Address',
        description: 'Second description',
        hourly_rate: '30.00'
      })
      .returning()
      .execute();
    const secondFieldId = secondFieldResult[0].id;

    const input: UpdateFieldInput = {
      id: fieldId,
      name: 'Updated First Field'
    };

    const result = await updateField(input, ownerId);

    // Verify only the target field was updated
    expect(result.id).toEqual(fieldId);
    expect(result.name).toEqual('Updated First Field');

    // Verify the second field remains unchanged
    const secondField = await db.select()
      .from(fieldsTable)
      .where(eq(fieldsTable.id, secondFieldId))
      .execute();

    expect(secondField[0].name).toEqual('Second Field');
  });
});