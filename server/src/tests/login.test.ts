import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password_123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'player' as const,
  phone: '123-456-7890'
};

// Valid login input
const validLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'validpassword123'
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await login(validLoginInput);

    // Verify returned user data
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('player');
    expect(result.phone).toEqual('123-456-7890');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify sensitive data is included (password_hash should be in response for auth purposes)
    expect(result.password_hash).toEqual('hashed_password_123');
  });

  it('should reject login with non-existent email', async () => {
    const invalidInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'validpassword123'
    };

    await expect(login(invalidInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should reject login with invalid password format', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const invalidInput: LoginInput = {
      email: 'test@example.com',
      password: '12345' // Too short
    };

    await expect(login(invalidInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should handle different user roles correctly', async () => {
    const fieldOwnerUser = {
      ...testUser,
      email: 'owner@example.com',
      role: 'field_owner' as const,
      first_name: 'Jane',
      last_name: 'Smith'
    };

    await db.insert(usersTable)
      .values(fieldOwnerUser)
      .execute();

    const ownerLoginInput: LoginInput = {
      email: 'owner@example.com',
      password: 'validpassword123'
    };

    const result = await login(ownerLoginInput);

    expect(result.role).toEqual('field_owner');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
  });

  it('should handle users with optional fields', async () => {
    const minimalUser = {
      email: 'minimal@example.com',
      password_hash: 'hashed_password_123',
      first_name: 'Min',
      last_name: 'User',
      role: 'admin' as const,
      phone: null as string | null
    };

    await db.insert(usersTable)
      .values(minimalUser)
      .execute();

    const minimalLoginInput: LoginInput = {
      email: 'minimal@example.com',
      password: 'validpassword123'
    };

    const result = await login(minimalLoginInput);

    expect(result.phone).toBeNull();
    expect(result.avatar_url).toBeNull();
    expect(result.role).toEqual('admin');
  });

  it('should verify user exists in database after login', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await login(validLoginInput);

    // Verify user exists in database
    const dbUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(dbUsers).toHaveLength(1);
    expect(dbUsers[0].email).toEqual('test@example.com');
    expect(dbUsers[0].first_name).toEqual('John');
  });
});