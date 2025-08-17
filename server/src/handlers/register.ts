import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const register = async (input: RegisterInput): Promise<User> => {
  try {
    // Check if user with this email already exists (case-insensitive)
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email.toLowerCase()))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash the password (using Bun's built-in password hashing)
    const password_hash = await Bun.password.hash(input.password);

    // Insert new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email.toLowerCase(),
        password_hash,
        first_name: input.first_name,
        last_name: input.last_name,
        role: input.role,
        phone: input.phone || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};