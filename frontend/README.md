# PMO Dashboard

PMO Dashboard is a project management and reporting application for tracking projects, prospects, and backlog targets from Excel uploads. The frontend is built with Next.js and Supabase, and the repository also includes supporting SQL schemas and Go utilities in the `backend/` directory.

## What the app does

- Shows a dashboard with project and financial summary metrics
- Tracks uploaded project, prospect, and backlog data by batch
- Supports search, filtering, sorting, and pagination on large datasets
- Classifies records into business categories such as `FCC`, `CSS`, and `UNCLASSIFIED`
- Provides a user-management area backed by Supabase auth and profile data

## Tech stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth + PostgreSQL)
- Recharts
- `xlsx` for Excel ingestion

## Repository structure

```text
pmo-app/
|-- backend/
|   |-- *.sql                  # schema updates and dashboard RPC
|   |-- main.go                # Fiber backend entrypoint
|   |-- setup_db.go            # database setup utility
|   |-- run_*.go              # SQL runner utilities
|-- frontend/
|   |-- app/
|   |   |-- page.tsx           # login page
|   |   |-- dashboard/         # dashboard and data modules
|   |   `-- api/               # Next.js API routes
|   |-- components/
|   |-- lib/
|   `-- public/
`-- project_analysis.md        # internal project handoff notes
```

## Main frontend modules

- `app/page.tsx`: sign-in and registration flow
- `app/dashboard/page.tsx`: top-level dashboard and KPI/charts view
- `app/dashboard/projects/page.tsx`: uploaded project records
- `app/dashboard/prospects/page.tsx`: uploaded prospects records
- `app/dashboard/backlog/page.tsx`: project target and backlog tracking
- `app/dashboard/user-management/page.tsx`: user administration UI
- `components/auth-session-provider.tsx`: shared Supabase session state
- `lib/classification.ts`: shared category classification rules

## Data model and behavior

The application is designed around a latest-batch workflow:

- uploads are stored with batch metadata
- list pages query the latest available batch
- the dashboard prefers aggregated SQL results instead of recomputing everything in the browser

Classification is shared across pages through `lib/classification.ts` so that project, prospect, and backlog records use consistent category rules.

## Environment variables

Create a local environment file for the frontend and define:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required for client-side Supabase access.
- `SUPABASE_SERVICE_ROLE_KEY` is required for server-side admin operations.
- Do not commit real keys or secrets to the repository.

## Local development

Install dependencies and run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Backend notes

The `backend/` directory contains SQL files and Go utilities used to prepare database objects and run supporting services.

Important files include:

- `backend/dashboard_summary.sql`
- `backend/projects_schema.sql`
- `backend/prospects_schema.sql`
- `backend/project_targets_schema.sql`
- `backend/add_batch_columns.sql`
- `backend/add_category_columns.sql`

If you use the Go backend locally, make sure `DATABASE_URL` is set in your environment or local `.env` file before running it.

## Current product direction

The current implementation emphasizes:

- server-side filtering and pagination for large tables
- SQL-backed dashboard aggregation where possible
- shared auth session handling in the frontend
- centralized record classification logic

## Recommended next improvements

- Add automated tests for classification and dashboard summary mapping
- Tighten authorization around user-management flows
- Clean up lint warnings and type-safety issues
- Separate one-off Go utilities from the main backend package for easier builds and CI

## Supabase Database Types

The application uses generated TypeScript types from the Supabase project schema to ensure end-to-end type safety. These types are stored in `lib/database.types.ts`.

### Regenerating Types

If you change the database schema (tables, columns, or RPCs), you must regenerate the types:

1. Ensure you have the `SUPABASE_PROJECT_ID` and `SUPABASE_ACCESS_TOKEN` (or be logged in via `npx supabase login`).
2. Run the generation script:
   ```bash
   npm run db:types
   ```

Note: The script expects `SUPABASE_PROJECT_ID` to be set in your environment.

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
npm run db:types     # Generate Supabase types (requires SUPABASE_PROJECT_ID)
```
