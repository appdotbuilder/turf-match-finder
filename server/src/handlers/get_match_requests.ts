import { db } from '../db';
import { matchRequestsTable } from '../db/schema';
import { type MatchRequest, type MatchRequestType } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getMatchRequests(): Promise<MatchRequest[]> {
  try {
    const results = await db.select()
      .from(matchRequestsTable)
      .where(eq(matchRequestsTable.is_active, true))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(request => ({
      ...request,
      max_fee: request.max_fee ? parseFloat(request.max_fee) : null
    }));
  } catch (error) {
    console.error('Failed to fetch match requests:', error);
    throw error;
  }
}

export async function getMatchRequestsByType(type: MatchRequestType): Promise<MatchRequest[]> {
  try {
    const results = await db.select()
      .from(matchRequestsTable)
      .where(and(
        eq(matchRequestsTable.is_active, true),
        eq(matchRequestsTable.type, type)
      ))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(request => ({
      ...request,
      max_fee: request.max_fee ? parseFloat(request.max_fee) : null
    }));
  } catch (error) {
    console.error('Failed to fetch match requests by type:', error);
    throw error;
  }
}

export async function getMatchRequestsByUser(userId: number): Promise<MatchRequest[]> {
  try {
    const results = await db.select()
      .from(matchRequestsTable)
      .where(eq(matchRequestsTable.creator_id, userId))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(request => ({
      ...request,
      max_fee: request.max_fee ? parseFloat(request.max_fee) : null
    }));
  } catch (error) {
    console.error('Failed to fetch match requests by user:', error);
    throw error;
  }
}