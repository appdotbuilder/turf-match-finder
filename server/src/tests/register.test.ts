import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput } from '../schema';
import { register } from '../handlers/register';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: RegisterInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'player',
  phone: '+1234567890'
};

const testInputWithoutPhone: RegisterInput = {
  email: 'nophone@example.com',
  password: 'password123',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'field_owner'
};

describe('register', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user with all fields', async () => {
    const result = await register(testInput);

    // Verify returned user data
    expect(result.email).toEqual('test@example.com'); // Email should be stored as lowercase
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('player');
    expect(result.phone).toEqual('+1234567890');
    expect(result.avatar_url).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify password is hashed (not plain text)
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(10);
  });

  it('should register a user without optional phone field', async () => {
    const result = await register(testInputWithoutPhone);

    expect(result.email).toEqual('nophone@example.com');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.role).toEqual('field_owner');
    expect(result.phone).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should save user to database', async () => {
    const result = await register(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.first_name).toEqual('John');
    expect(savedUser.last_name).toEqual('Doe');
    expect(savedUser.role).toEqual('player');
    expect(savedUser.phone).toEqual('+1234567890');
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should hash the password properly', async () => {
    const result = await register(testInput);

    // Verify password is hashed using Bun's password methods
    const isValid = await Bun.password.verify('password123', result.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password doesn't match
    const isInvalid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should handle different user roles correctly', async () => {
    const playerInput: RegisterInput = {
      ...testInput,
      email: 'player@example.com',
      role: 'player'
    };

    const fieldOwnerInput: RegisterInput = {
      ...testInput,
      email: 'owner@example.com',
      role: 'field_owner'
    };

    const adminInput: RegisterInput = {
      ...testInput,
      email: 'admin@example.com',
      role: 'admin'
    };

    const player = await register(playerInput);
    const fieldOwner = await register(fieldOwnerInput);
    const admin = await register(adminInput);

    expect(player.role).toEqual('player');
    expect(fieldOwner.role).toEqual('field_owner');
    expect(admin.role).toEqual('admin');
  });

  it('should throw error when registering user with existing email', async () => {
    // Register first user
    await register(testInput);

    // Try to register another user with same email
    const duplicateInput: RegisterInput = {
      ...testInput,
      first_name: 'Different',
      last_name: 'Person'
    };

    await expect(register(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should normalize email to lowercase', async () => {
    const uppercaseEmailInput: RegisterInput = {
      ...testInput,
      email: 'UPPERCASE@EXAMPLE.COM'
    };

    const result = await register(uppercaseEmailInput);
    expect(result.email).toEqual('uppercase@example.com');
  });

  it('should throw error for duplicate email regardless of case', async () => {
    await register(testInput);

    const uppercaseEmailInput: RegisterInput = {
      ...testInput,
      email: 'TEST@EXAMPLE.COM',
      first_name: 'Different',
      last_name: 'Person'
    };

    await expect(register(uppercaseEmailInput)).rejects.toThrow(/already exists/i);
  });

  it('should create unique users with different emails', async () => {
    const user1Input: RegisterInput = {
      ...testInput,
      email: 'user1@example.com'
    };

    const user2Input: RegisterInput = {
      ...testInput,
      email: 'user2@example.com'
    };

    const user1 = await register(user1Input);
    const user2 = await register(user2Input);

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('user1@example.com');
    expect(user2.email).toEqual('user2@example.com');

    // Verify both users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });
});