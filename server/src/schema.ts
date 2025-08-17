import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['player', 'field_owner', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleSchema,
  phone: z.string().nullable(),
  avatar_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Auth schemas
export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleSchema,
  phone: z.string().optional()
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Field schema
export const fieldSchema = z.object({
  id: z.number(),
  owner_id: z.number(),
  name: z.string(),
  address: z.string(),
  description: z.string().nullable(),
  hourly_rate: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Field = z.infer<typeof fieldSchema>;

export const createFieldInputSchema = z.object({
  name: z.string(),
  address: z.string(),
  description: z.string().nullable().optional(),
  hourly_rate: z.number().positive()
});

export type CreateFieldInput = z.infer<typeof createFieldInputSchema>;

export const updateFieldInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  address: z.string().optional(),
  description: z.string().nullable().optional(),
  hourly_rate: z.number().positive().optional()
});

export type UpdateFieldInput = z.infer<typeof updateFieldInputSchema>;

// Field slot schema
export const fieldSlotSchema = z.object({
  id: z.number(),
  field_id: z.number(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  price: z.number(),
  is_available: z.boolean(),
  created_at: z.coerce.date()
});

export type FieldSlot = z.infer<typeof fieldSlotSchema>;

export const createFieldSlotInputSchema = z.object({
  field_id: z.number(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  price: z.number().positive()
});

export type CreateFieldSlotInput = z.infer<typeof createFieldSlotInputSchema>;

// Team schema
export const teamSchema = z.object({
  id: z.number(),
  captain_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  skill_level: z.number().int().min(1).max(10),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Team = z.infer<typeof teamSchema>;

export const createTeamInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  skill_level: z.number().int().min(1).max(10)
});

export type CreateTeamInput = z.infer<typeof createTeamInputSchema>;

// Team member schema
export const teamMemberSchema = z.object({
  id: z.number(),
  team_id: z.number(),
  user_id: z.number(),
  joined_at: z.coerce.date()
});

export type TeamMember = z.infer<typeof teamMemberSchema>;

export const addTeamMemberInputSchema = z.object({
  team_id: z.number(),
  user_id: z.number()
});

export type AddTeamMemberInput = z.infer<typeof addTeamMemberInputSchema>;

// Match request type enum
export const matchRequestTypeSchema = z.enum(['find_opponent', 'find_players']);
export type MatchRequestType = z.infer<typeof matchRequestTypeSchema>;

// Match request schema
export const matchRequestSchema = z.object({
  id: z.number(),
  creator_id: z.number(),
  team_id: z.number().nullable(),
  type: matchRequestTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  preferred_date: z.coerce.date().nullable(),
  preferred_location: z.string().nullable(),
  skill_level: z.number().int().min(1).max(10),
  max_fee: z.number().nullable(),
  players_needed: z.number().int().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type MatchRequest = z.infer<typeof matchRequestSchema>;

export const createMatchRequestInputSchema = z.object({
  team_id: z.number().optional(),
  type: matchRequestTypeSchema,
  title: z.string(),
  description: z.string().nullable().optional(),
  preferred_date: z.coerce.date().optional(),
  preferred_location: z.string().optional(),
  skill_level: z.number().int().min(1).max(10),
  max_fee: z.number().positive().optional(),
  players_needed: z.number().int().positive().optional()
});

export type CreateMatchRequestInput = z.infer<typeof createMatchRequestInputSchema>;

// Booking status enum
export const bookingStatusSchema = z.enum(['pending', 'confirmed', 'cancelled']);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

// Booking schema
export const bookingSchema = z.object({
  id: z.number(),
  slot_id: z.number(),
  user_id: z.number(),
  team_id: z.number().nullable(),
  status: bookingStatusSchema,
  total_price: z.number(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Booking = z.infer<typeof bookingSchema>;

export const createBookingInputSchema = z.object({
  slot_id: z.number(),
  team_id: z.number().optional(),
  notes: z.string().optional()
});

export type CreateBookingInput = z.infer<typeof createBookingInputSchema>;

// Interest type enum
export const interestTypeSchema = z.enum(['match_request', 'field_slot']);
export type InterestType = z.infer<typeof interestTypeSchema>;

// Interest schema
export const interestSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  type: interestTypeSchema,
  match_request_id: z.number().nullable(),
  field_slot_id: z.number().nullable(),
  message: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Interest = z.infer<typeof interestSchema>;

export const createInterestInputSchema = z.object({
  type: interestTypeSchema,
  match_request_id: z.number().optional(),
  field_slot_id: z.number().optional(),
  message: z.string().optional()
});

export type CreateInterestInput = z.infer<typeof createInterestInputSchema>;

// Message schema
export const messageSchema = z.object({
  id: z.number(),
  sender_id: z.number(),
  receiver_id: z.number(),
  content: z.string(),
  is_read: z.boolean(),
  created_at: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;

export const sendMessageInputSchema = z.object({
  receiver_id: z.number(),
  content: z.string()
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

// Rating schema
export const ratingSchema = z.object({
  id: z.number(),
  rater_id: z.number(),
  rated_team_id: z.number(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Rating = z.infer<typeof ratingSchema>;

export const createRatingInputSchema = z.object({
  rated_team_id: z.number(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional()
});

export type CreateRatingInput = z.infer<typeof createRatingInputSchema>;