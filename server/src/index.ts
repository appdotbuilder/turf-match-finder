import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  registerInputSchema,
  loginInputSchema,
  createFieldInputSchema,
  updateFieldInputSchema,
  createFieldSlotInputSchema,
  createTeamInputSchema,
  addTeamMemberInputSchema,
  createMatchRequestInputSchema,
  createBookingInputSchema,
  createInterestInputSchema,
  sendMessageInputSchema,
  createRatingInputSchema,
  matchRequestTypeSchema,
  bookingStatusSchema
} from './schema';

// Import handlers
import { register } from './handlers/register';
import { login } from './handlers/login';
import { createField } from './handlers/create_field';
import { getFields, getFieldsByOwner } from './handlers/get_fields';
import { updateField } from './handlers/update_field';
import { createFieldSlot } from './handlers/create_field_slot';
import { getAvailableFieldSlots, getFieldSlotsByField } from './handlers/get_field_slots';
import { createTeam } from './handlers/create_team';
import { getTeams, getTeamsByUser } from './handlers/get_teams';
import { addTeamMember, removeTeamMember, getTeamMembers } from './handlers/manage_team_members';
import { createMatchRequest } from './handlers/create_match_request';
import { getMatchRequests, getMatchRequestsByType, getMatchRequestsByUser } from './handlers/get_match_requests';
import { createBooking } from './handlers/create_booking';
import { getBookingsByUser, getBookingsByFieldOwner } from './handlers/get_bookings';
import { updateBookingStatus } from './handlers/update_booking_status';
import { createInterest } from './handlers/create_interest';
import { getInterestsByMatchRequest, getInterestsByFieldSlot, getInterestsByUser } from './handlers/get_interests';
import { sendMessage } from './handlers/send_message';
import { getMessagesBetweenUsers, getConversations, markMessagesAsRead } from './handlers/get_messages';
import { createRating } from './handlers/create_rating';
import { getRatingsByTeam, getAverageRatingByTeam } from './handlers/get_ratings';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(({ input }) => register(input)),
  
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // Field management
  createField: publicProcedure
    .input(createFieldInputSchema)
    .mutation(({ input }) => createField(input, 1)), // TODO: Get user ID from context

  getFields: publicProcedure
    .query(() => getFields()),

  getFieldsByOwner: publicProcedure
    .input(z.object({ ownerId: z.number() }))
    .query(({ input }) => getFieldsByOwner(input.ownerId)),

  updateField: publicProcedure
    .input(updateFieldInputSchema)
    .mutation(({ input }) => updateField(input, 1)), // TODO: Get user ID from context

  // Field slot management
  createFieldSlot: publicProcedure
    .input(createFieldSlotInputSchema)
    .mutation(({ input }) => createFieldSlot(input)),

  getAvailableFieldSlots: publicProcedure
    .query(() => getAvailableFieldSlots()),

  getFieldSlotsByField: publicProcedure
    .input(z.object({ fieldId: z.number() }))
    .query(({ input }) => getFieldSlotsByField(input.fieldId)),

  // Team management
  createTeam: publicProcedure
    .input(createTeamInputSchema)
    .mutation(({ input }) => createTeam(input, 1)), // TODO: Get user ID from context

  getTeams: publicProcedure
    .query(() => getTeams()),

  getTeamsByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getTeamsByUser(input.userId)),

  addTeamMember: publicProcedure
    .input(addTeamMemberInputSchema)
    .mutation(({ input }) => addTeamMember(input, 1)), // TODO: Get user ID from context

  removeTeamMember: publicProcedure
    .input(z.object({ teamId: z.number(), userId: z.number() }))
    .mutation(({ input }) => removeTeamMember(input.teamId, input.userId, 1)), // TODO: Get user ID from context

  getTeamMembers: publicProcedure
    .input(z.object({ teamId: z.number() }))
    .query(({ input }) => getTeamMembers(input.teamId)),

  // Match requests
  createMatchRequest: publicProcedure
    .input(createMatchRequestInputSchema)
    .mutation(({ input }) => createMatchRequest(input, 1)), // TODO: Get user ID from context

  getMatchRequests: publicProcedure
    .query(() => getMatchRequests()),

  getMatchRequestsByType: publicProcedure
    .input(z.object({ type: matchRequestTypeSchema }))
    .query(({ input }) => getMatchRequestsByType(input.type)),

  getMatchRequestsByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getMatchRequestsByUser(input.userId)),

  // Bookings
  createBooking: publicProcedure
    .input(createBookingInputSchema)
    .mutation(({ input }) => createBooking(input, 1)), // TODO: Get user ID from context

  getBookingsByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getBookingsByUser(input.userId)),

  getBookingsByFieldOwner: publicProcedure
    .input(z.object({ ownerId: z.number() }))
    .query(({ input }) => getBookingsByFieldOwner(input.ownerId)),

  updateBookingStatus: publicProcedure
    .input(z.object({ bookingId: z.number(), status: bookingStatusSchema }))
    .mutation(({ input }) => updateBookingStatus(input.bookingId, input.status, 1)), // TODO: Get user ID from context

  // Interests
  createInterest: publicProcedure
    .input(createInterestInputSchema)
    .mutation(({ input }) => createInterest(input, 1)), // TODO: Get user ID from context

  getInterestsByMatchRequest: publicProcedure
    .input(z.object({ matchRequestId: z.number() }))
    .query(({ input }) => getInterestsByMatchRequest(input.matchRequestId)),

  getInterestsByFieldSlot: publicProcedure
    .input(z.object({ fieldSlotId: z.number() }))
    .query(({ input }) => getInterestsByFieldSlot(input.fieldSlotId)),

  getInterestsByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getInterestsByUser(input.userId)),

  // Messages
  sendMessage: publicProcedure
    .input(sendMessageInputSchema)
    .mutation(({ input }) => sendMessage(input, 1)), // TODO: Get user ID from context

  getMessagesBetweenUsers: publicProcedure
    .input(z.object({ userId1: z.number(), userId2: z.number() }))
    .query(({ input }) => getMessagesBetweenUsers(input.userId1, input.userId2)),

  getConversations: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getConversations(input.userId)),

  markMessagesAsRead: publicProcedure
    .input(z.object({ senderId: z.number(), receiverId: z.number() }))
    .mutation(({ input }) => markMessagesAsRead(input.senderId, input.receiverId)),

  // Ratings
  createRating: publicProcedure
    .input(createRatingInputSchema)
    .mutation(({ input }) => createRating(input, 1)), // TODO: Get user ID from context

  getRatingsByTeam: publicProcedure
    .input(z.object({ teamId: z.number() }))
    .query(({ input }) => getRatingsByTeam(input.teamId)),

  getAverageRatingByTeam: publicProcedure
    .input(z.object({ teamId: z.number() }))
    .query(({ input }) => getAverageRatingByTeam(input.teamId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();