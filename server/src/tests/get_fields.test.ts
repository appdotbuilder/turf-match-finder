import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fieldsTable, usersTable } from '../db/schema';
import { getFields, getFieldsByOwner } from '../handlers/get_fields';
import { eq } from 'drizzle-orm';

describe('getFields', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no fields exist', async () => {
    const result = await getFields();
    expect(result).toEqual([]);
  });

  it('should return all fields with correct data types', async () => {
    // Create a test user first (field owner)
    const [user] = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Field',
        last_name: 'Owner',
        role: 'field_owner'
      })
      .returning()
      .execute();

    // Create test fields
    await db.insert(fieldsTable)
      .values([
        {
          owner_id: user.id,
          name: 'Soccer Field A',
          address: '123 Main St',
          description: 'Premium grass field',
          hourly_rate: '50.00'
        },
        {
          owner_id: user.id,
          name: 'Soccer Field B',
          address: '456 Oak Ave',
          description: null,
          hourly_rate: '75.50'
        }
      ])
      .execute();

    const results = await getFields();

    expect(results).toHaveLength(2);
    
    // Verify first field
    expect(results[0].name).toEqual('Soccer Field A');
    expect(results[0].address).toEqual('123 Main St');
    expect(results[0].description).toEqual('Premium grass field');
    expect(results[0].hourly_rate).toEqual(50.00);
    expect(typeof results[0].hourly_rate).toEqual('number');
    expect(results[0].owner_id).toEqual(user.id);
    expect(results[0].id).toBeDefined();
    expect(results[0].created_at).toBeInstanceOf(Date);
    expect(results[0].updated_at).toBeInstanceOf(Date);

    // Verify second field
    expect(results[1].name).toEqual('Soccer Field B');
    expect(results[1].address).toEqual('456 Oak Ave');
    expect(results[1].description).toBeNull();
    expect(results[1].hourly_rate).toEqual(75.50);
    expect(typeof results[1].hourly_rate).toEqual('number');
  });

  it('should handle decimal precision correctly', async () => {
    // Create a test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Field',
        last_name: 'Owner',
        role: 'field_owner'
      })
      .returning()
      .execute();

    // Create field with specific decimal rate
    await db.insert(fieldsTable)
      .values({
        owner_id: user.id,
        name: 'Test Field',
        address: '789 Test St',
        hourly_rate: '123.45'
      })
      .execute();

    const results = await getFields();
    
    expect(results).toHaveLength(1);
    expect(results[0].hourly_rate).toEqual(123.45);
    expect(typeof results[0].hourly_rate).toEqual('number');
  });
});

describe('getFieldsByOwner', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when owner has no fields', async () => {
    // Create a user but no fields
    const [user] = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Field',
        last_name: 'Owner',
        role: 'field_owner'
      })
      .returning()
      .execute();

    const result = await getFieldsByOwner(user.id);
    expect(result).toEqual([]);
  });

  it('should return only fields owned by specific owner', async () => {
    // Create two users
    const [owner1] = await db.insert(usersTable)
      .values({
        email: 'owner1@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Owner',
        last_name: 'One',
        role: 'field_owner'
      })
      .returning()
      .execute();

    const [owner2] = await db.insert(usersTable)
      .values({
        email: 'owner2@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Owner',
        last_name: 'Two',
        role: 'field_owner'
      })
      .returning()
      .execute();

    // Create fields for both owners
    await db.insert(fieldsTable)
      .values([
        {
          owner_id: owner1.id,
          name: 'Owner 1 Field A',
          address: '111 First St',
          hourly_rate: '40.00'
        },
        {
          owner_id: owner1.id,
          name: 'Owner 1 Field B',
          address: '222 Second St',
          hourly_rate: '60.00'
        },
        {
          owner_id: owner2.id,
          name: 'Owner 2 Field',
          address: '333 Third St',
          hourly_rate: '80.00'
        }
      ])
      .execute();

    const owner1Fields = await getFieldsByOwner(owner1.id);
    const owner2Fields = await getFieldsByOwner(owner2.id);

    // Verify owner1 has 2 fields
    expect(owner1Fields).toHaveLength(2);
    expect(owner1Fields[0].name).toEqual('Owner 1 Field A');
    expect(owner1Fields[0].owner_id).toEqual(owner1.id);
    expect(owner1Fields[0].hourly_rate).toEqual(40.00);
    expect(owner1Fields[1].name).toEqual('Owner 1 Field B');
    expect(owner1Fields[1].owner_id).toEqual(owner1.id);
    expect(owner1Fields[1].hourly_rate).toEqual(60.00);

    // Verify owner2 has 1 field
    expect(owner2Fields).toHaveLength(1);
    expect(owner2Fields[0].name).toEqual('Owner 2 Field');
    expect(owner2Fields[0].owner_id).toEqual(owner2.id);
    expect(owner2Fields[0].hourly_rate).toEqual(80.00);
  });

  it('should return empty array for non-existent owner', async () => {
    const result = await getFieldsByOwner(999);
    expect(result).toEqual([]);
  });

  it('should verify fields are saved to database correctly', async () => {
    // Create a test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Field',
        last_name: 'Owner',
        role: 'field_owner'
      })
      .returning()
      .execute();

    // Create a field
    const [createdField] = await db.insert(fieldsTable)
      .values({
        owner_id: user.id,
        name: 'Verification Field',
        address: '999 Verify St',
        description: 'Test field for verification',
        hourly_rate: '99.99'
      })
      .returning()
      .execute();

    // Get fields via handler
    const handlerResults = await getFieldsByOwner(user.id);

    // Verify data directly from database
    const dbResults = await db.select()
      .from(fieldsTable)
      .where(eq(fieldsTable.owner_id, user.id))
      .execute();

    expect(handlerResults).toHaveLength(1);
    expect(dbResults).toHaveLength(1);

    // Verify handler result matches database
    expect(handlerResults[0].id).toEqual(createdField.id);
    expect(handlerResults[0].name).toEqual('Verification Field');
    expect(handlerResults[0].address).toEqual('999 Verify St');
    expect(handlerResults[0].description).toEqual('Test field for verification');
    expect(handlerResults[0].hourly_rate).toEqual(99.99);
    expect(typeof handlerResults[0].hourly_rate).toEqual('number');
    
    // Database stores numeric as string
    expect(parseFloat(dbResults[0].hourly_rate)).toEqual(99.99);
  });
});