# PropScout - AI Agency Caller

## Overview
A property sourcing and AI-powered agency calling dashboard. Users can search for properties by postcode, save them to a dashboard, and initiate AI agent calls to property agencies.

## Architecture
- **Frontend**: React + Vite + TypeScript with Tailwind CSS and shadcn/ui
- **Backend**: Express.js with TypeScript
- **Database**: AWS DynamoDB (via @aws-sdk/client-dynamodb and @aws-sdk/lib-dynamodb)
- **Routing**: wouter (frontend), Express (backend)
- **State**: TanStack Query for server state

## Key Files
- `shared/schema.ts` - Type definitions for properties, calls, opportunities (Zod schemas)
- `shared/routes.ts` - API route definitions with Zod validation
- `server/routes.ts` - Express route handlers
- `server/storage.ts` - DynamoDB access layer (DynamoStorage class implementing IStorage)
- `server/db.ts` - DynamoDB client setup (docClient + TABLES)
- `server/dynamo-setup.ts` - Table creation on startup with retry logic for counters
- `client/src/App.tsx` - Frontend router
- `client/src/components/layout/app-sidebar.tsx` - Sidebar navigation

## Pages
- **Dashboard** (`/`) - Property cards with Call Agency button
- **Sourcing** (`/sourcing`) - Search properties by postcode via external Lambda API
- **Opportunities** (`/opportunities`) - Form to submit user details (name, phone, email, address, availability, knowledge base)
- **Call History** (`/history`) - Log of all AI agent calls (auto-refreshes every 10s)

## DynamoDB Tables
- `propscout_properties` - Property listings; PK: `id` (number)
- `propscout_calls` - Call records linked to properties; PK: `id` (number)
- `propscout_opportunities` - User-submitted call profiles; PK: `id` (number)
- `propscout_counters` - Auto-increment counters; PK: `counterName` (string)

## Important Notes
- IDs are auto-incremented using `propscout_counters` table (atomic UpdateCommand)
- Properties and opportunities get a unique `uniqueIndex` (10-char nanoid) auto-generated on creation
- Existing records without uniqueIndex are backfilled on server startup
- Only one opportunity can be active at a time (used as the profile for calls)
- External property search API: Lambda at `czf7lucz4pn37ehngkrlcmarye0dxccr.lambda-url.us-east-1.on.aws`
- Call Agency Lambda: `zywrcov6gl5hx5urwlykshhowa0rnopp.lambda-url.us-east-1.on.aws` — receives `{ unique_index, call_id }`
- AWS credentials required: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- Tables are created automatically on first startup; counters initialized with retry logic
