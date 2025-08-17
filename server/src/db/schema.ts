import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['player', 'field_owner', 'admin']);
export const matchRequestTypeEnum = pgEnum('match_request_type', ['find_opponent', 'find_players']);
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'confirmed', 'cancelled']);
export const interestTypeEnum = pgEnum('interest_type', ['match_request', 'field_slot']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull(),
  phone: text('phone'),
  avatar_url: text('avatar_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Fields table
export const fieldsTable = pgTable('fields', {
  id: serial('id').primaryKey(),
  owner_id: integer('owner_id').references(() => usersTable.id).notNull(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  description: text('description'),
  hourly_rate: numeric('hourly_rate', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Field slots table
export const fieldSlotsTable = pgTable('field_slots', {
  id: serial('id').primaryKey(),
  field_id: integer('field_id').references(() => fieldsTable.id).notNull(),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  is_available: boolean('is_available').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Teams table
export const teamsTable = pgTable('teams', {
  id: serial('id').primaryKey(),
  captain_id: integer('captain_id').references(() => usersTable.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  skill_level: integer('skill_level').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Team members table
export const teamMembersTable = pgTable('team_members', {
  id: serial('id').primaryKey(),
  team_id: integer('team_id').references(() => teamsTable.id).notNull(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  joined_at: timestamp('joined_at').defaultNow().notNull()
});

// Match requests table
export const matchRequestsTable = pgTable('match_requests', {
  id: serial('id').primaryKey(),
  creator_id: integer('creator_id').references(() => usersTable.id).notNull(),
  team_id: integer('team_id').references(() => teamsTable.id),
  type: matchRequestTypeEnum('type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  preferred_date: timestamp('preferred_date'),
  preferred_location: text('preferred_location'),
  skill_level: integer('skill_level').notNull(),
  max_fee: numeric('max_fee', { precision: 10, scale: 2 }),
  players_needed: integer('players_needed'),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Bookings table
export const bookingsTable = pgTable('bookings', {
  id: serial('id').primaryKey(),
  slot_id: integer('slot_id').references(() => fieldSlotsTable.id).notNull(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  team_id: integer('team_id').references(() => teamsTable.id),
  status: bookingStatusEnum('status').default('pending').notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Interest expressions table
export const interestsTable = pgTable('interests', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  type: interestTypeEnum('type').notNull(),
  match_request_id: integer('match_request_id').references(() => matchRequestsTable.id),
  field_slot_id: integer('field_slot_id').references(() => fieldSlotsTable.id),
  message: text('message'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Messages table
export const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  sender_id: integer('sender_id').references(() => usersTable.id).notNull(),
  receiver_id: integer('receiver_id').references(() => usersTable.id).notNull(),
  content: text('content').notNull(),
  is_read: boolean('is_read').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Ratings table
export const ratingsTable = pgTable('ratings', {
  id: serial('id').primaryKey(),
  rater_id: integer('rater_id').references(() => usersTable.id).notNull(),
  rated_team_id: integer('rated_team_id').references(() => teamsTable.id).notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many, one }) => ({
  fields: many(fieldsTable),
  teams: many(teamsTable),
  teamMemberships: many(teamMembersTable),
  matchRequests: many(matchRequestsTable),
  bookings: many(bookingsTable),
  interests: many(interestsTable),
  sentMessages: many(messagesTable, { relationName: 'sender' }),
  receivedMessages: many(messagesTable, { relationName: 'receiver' }),
  ratings: many(ratingsTable)
}));

export const fieldsRelations = relations(fieldsTable, ({ one, many }) => ({
  owner: one(usersTable, {
    fields: [fieldsTable.owner_id],
    references: [usersTable.id]
  }),
  slots: many(fieldSlotsTable)
}));

export const fieldSlotsRelations = relations(fieldSlotsTable, ({ one, many }) => ({
  field: one(fieldsTable, {
    fields: [fieldSlotsTable.field_id],
    references: [fieldsTable.id]
  }),
  bookings: many(bookingsTable),
  interests: many(interestsTable)
}));

export const teamsRelations = relations(teamsTable, ({ one, many }) => ({
  captain: one(usersTable, {
    fields: [teamsTable.captain_id],
    references: [usersTable.id]
  }),
  members: many(teamMembersTable),
  matchRequests: many(matchRequestsTable),
  bookings: many(bookingsTable),
  ratings: many(ratingsTable)
}));

export const teamMembersRelations = relations(teamMembersTable, ({ one }) => ({
  team: one(teamsTable, {
    fields: [teamMembersTable.team_id],
    references: [teamsTable.id]
  }),
  user: one(usersTable, {
    fields: [teamMembersTable.user_id],
    references: [usersTable.id]
  })
}));

export const matchRequestsRelations = relations(matchRequestsTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [matchRequestsTable.creator_id],
    references: [usersTable.id]
  }),
  team: one(teamsTable, {
    fields: [matchRequestsTable.team_id],
    references: [teamsTable.id]
  }),
  interests: many(interestsTable)
}));

export const bookingsRelations = relations(bookingsTable, ({ one }) => ({
  slot: one(fieldSlotsTable, {
    fields: [bookingsTable.slot_id],
    references: [fieldSlotsTable.id]
  }),
  user: one(usersTable, {
    fields: [bookingsTable.user_id],
    references: [usersTable.id]
  }),
  team: one(teamsTable, {
    fields: [bookingsTable.team_id],
    references: [teamsTable.id]
  })
}));

export const interestsRelations = relations(interestsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [interestsTable.user_id],
    references: [usersTable.id]
  }),
  matchRequest: one(matchRequestsTable, {
    fields: [interestsTable.match_request_id],
    references: [matchRequestsTable.id]
  }),
  fieldSlot: one(fieldSlotsTable, {
    fields: [interestsTable.field_slot_id],
    references: [fieldSlotsTable.id]
  })
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  sender: one(usersTable, {
    fields: [messagesTable.sender_id],
    references: [usersTable.id],
    relationName: 'sender'
  }),
  receiver: one(usersTable, {
    fields: [messagesTable.receiver_id],
    references: [usersTable.id],
    relationName: 'receiver'
  })
}));

export const ratingsRelations = relations(ratingsTable, ({ one }) => ({
  rater: one(usersTable, {
    fields: [ratingsTable.rater_id],
    references: [usersTable.id]
  }),
  ratedTeam: one(teamsTable, {
    fields: [ratingsTable.rated_team_id],
    references: [teamsTable.id]
  })
}));

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  fields: fieldsTable,
  fieldSlots: fieldSlotsTable,
  teams: teamsTable,
  teamMembers: teamMembersTable,
  matchRequests: matchRequestsTable,
  bookings: bookingsTable,
  interests: interestsTable,
  messages: messagesTable,
  ratings: ratingsTable
};