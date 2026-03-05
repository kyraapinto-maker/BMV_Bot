# PropScout - AI Agency Caller

## Overview
A property sourcing and AI-powered agency calling dashboard. Users can search for properties by postcode, save them to a dashboard, and initiate AI agent calls to property agencies.

## Architecture
- **Frontend**: React + Vite + TypeScript with Tailwind CSS and shadcn/ui
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL (external AWS RDS) via Drizzle ORM
- **Routing**: wouter (frontend), Express (backend)
- **State**: TanStack Query for server state

## Key Files
- `shared/schema.ts` - Database schema (properties, calls, opportunities)
- `shared/routes.ts` - API route definitions with Zod validation
- `server/routes.ts` - Express route handlers
- `server/storage.ts` - Database access layer (IStorage interface)
- `server/db.ts` - Database connection (SSL enabled)
- `client/src/App.tsx` - Frontend router
- `client/src/components/layout/app-sidebar.tsx` - Sidebar navigation

## Pages
- **Dashboard** (`/`) - Property cards with Call Agency button
- **Sourcing** (`/sourcing`) - Search properties by postcode via external Lambda API
- **Opportunities** (`/opportunities`) - Form to submit user details (name, phone, email, address, availability, knowledge base)
- **Call History** (`/history`) - Log of all AI agent calls

## Database Tables
- `properties` - Property listings with uniqueIndex (nanoid)
- `calls` - Call records linked to properties
- `opportunities` - User-submitted call opportunity details, each with uniqueIndex (nanoid) and active flag

## Important Notes
- Properties and opportunities get a unique `uniqueIndex` (10-char nanoid) auto-generated on creation
- Existing records without uniqueIndex are backfilled on server startup
- Only one opportunity can be active at a time (used as the profile for calls)
- External property search API: Lambda function at `czf7lucz4pn37ehngkrlcmarye0dxccr.lambda-url.us-east-1.on.aws`
- Database requires SSL (`ssl: { rejectUnauthorized: false }`)
- Schema pushes require: `NODE_TLS_REJECT_UNAUTHORIZED=0 DATABASE_URL="${DATABASE_URL}?sslmode=require" npx drizzle-kit push`
