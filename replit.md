# PropScout - AI Agency Caller

## Overview
A property sourcing and AI-powered agency calling dashboard. Users register/login and each user has their own isolated data — properties, calls, and opportunities are scoped per user.

## Architecture
- **Frontend**: React + Vite + TypeScript with Tailwind CSS and shadcn/ui
- **Backend**: Express.js with TypeScript
- **Database**: AWS DynamoDB (via @aws-sdk/client-dynamodb and @aws-sdk/lib-dynamodb)
- **Auth**: passport.js + express-session with bcrypt password hashing
- **Routing**: wouter (frontend), Express (backend)
- **State**: TanStack Query for server state

## Key Files
- `shared/schema.ts` - Type definitions for users, properties, calls, opportunities (Zod schemas)
- `shared/routes.ts` - API route definitions with Zod validation
- `server/auth.ts` - Passport local strategy, session setup, auth endpoints, isAuthenticated middleware
- `server/routes.ts` - Express route handlers (all protected by isAuthenticated)
- `server/storage.ts` - DynamoDB access layer; all data methods scoped by userId
- `server/db.ts` - DynamoDB client setup (docClient + TABLES)
- `server/dynamo-setup.ts` - Table creation on startup with retry logic for counters
- `client/src/App.tsx` - Frontend router with auth gating
- `client/src/hooks/use-auth.ts` - useAuth, useLogin, useRegister, useLogout hooks
- `client/src/pages/login.tsx` - Login page
- `client/src/pages/signup.tsx` - Signup page
- `client/src/components/layout/app-sidebar.tsx` - Sidebar navigation with logout

## Pages
- **Login** (`/login`) - Public; redirects to dashboard if authenticated
- **Signup** (`/signup`) - Public; redirects to dashboard if authenticated
- **Dashboard** (`/`) - Property cards with Call Agency button (per-user data)
- **Sourcing** (`/sourcing`) - Search properties by postcode via external Lambda API
- **Opportunities** (`/opportunities`) - Form to submit user details (per-user data)
- **Call History** (`/history`) - Log of AI agent calls (per-user, auto-refreshes every 10s)

## DynamoDB Tables
- `propscout_auth_users` - Auth users; PK: `id` (string/nanoid)
- `propscout_properties` - Property listings; PK: `id` (number), field: `userId`
- `propscout_calls` - Call records linked to properties; PK: `id` (number), field: `userId`
- `propscout_users` (opportunities) - User-submitted call profiles; PK: `id` (string), field: `userId`
- `propscout_counters` - Auto-increment counters; PK: `counterName` (string)

## User Data Isolation
Every record in properties, calls, and opportunities stores a `userId` field. All queries filter by the logged-in user's ID via DynamoDB Scan FilterExpression. Users only ever see and modify their own data.

## Important Notes
- IDs are auto-incremented using `propscout_counters` table (atomic UpdateCommand)
- Properties and opportunities get a unique `uniqueIndex` (10-char nanoid) auto-generated on creation
- SESSION_SECRET env var required in production (throws on startup if missing)
- Only one opportunity can be active at a time (used as the profile for calls)
- External property search API: Lambda at `czf7lucz4pn37ehngkrlcmarye0dxccr.lambda-url.us-east-1.on.aws`
- Call Agency Lambda: `zywrcov6gl5hx5urwlykshhowa0rnopp.lambda-url.us-east-1.on.aws` — receives `{ unique_index, call_id }`
- AWS credentials required: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- Tables are created automatically on first startup; counters initialized with retry logic
