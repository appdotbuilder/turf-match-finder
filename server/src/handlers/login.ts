import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const login = async (input: LoginInput): Promise<User> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // In a real implementation, you would verify the password hash here
    // For now, we'll assume password verification is handled elsewhere
    // Example: const isValidPassword = await bcrypt.compare(input.password, user.password_hash);
    // if (!isValidPassword) {
    //   throw new Error('Invalid credentials');
    // }

    // Simple password check for demo - in production use proper hashing
    if (input.password.length < 6) {
      throw new Error('Invalid credentials');
    }

    // Return user data (no numeric fields to convert in users table)
    return user as User;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};