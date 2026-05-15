# Nigerian School Report Card Generator

A full-stack web app for Nigerian schools to manage students, enter exam scores, and generate printable report cards with WAEC grading.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed the database with sample school data
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, TanStack Query, wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — all 9 DB schema files (schools, classes, students, terms, subjects, grading, psychomotor, scores, reportcards)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for API)
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas (do not edit)
- `artifacts/api-server/src/routes/` — all 10 route files + index.ts
- `artifacts/api-server/src/lib/` — calculations.ts, serialize.ts helpers
- `artifacts/school-report/src/pages/` — all 8 frontend pages

## Architecture decisions

- Date serialization: Drizzle returns JS Date objects; `serializeDates()` helper converts them to ISO strings before Zod parsing since OpenAPI schemas use `string` for date fields
- Numeric DB fields (scores, averages): stored as Postgres `numeric`, returned as strings by Drizzle — routes coerce with `Number()` before passing to Zod
- Grading: Test (40%) + Exam (60%) = 100; Nigerian WAEC scale from A1 (75-100) to F9 (0-39)
- Positions calculated by sorting students by average; ties share the same position number
- Report card generation is explicit (POST /reportcards/generate) — recalculates positions across the whole class

## Product

- Multi-school management with per-school isolation
- Class and student management with filtering
- Academic term tracking (session + term number)
- Subject management with codes
- Bulk score entry grid (Test 40 + Exam 60) with auto-grade calculation
- Configurable Nigerian WAEC grading scale
- Psychomotor traits with 5-star ratings
- Report card generation with class position ranking
- Printable single-student report card view with full details
- Dashboard with class performance bars and top students leaderboard

## User preferences

_Populate as you build._

## Gotchas

- Always run `pnpm run typecheck:libs` after changing `lib/db` schema files — routes import from `@workspace/db` which must be rebuilt
- Orval codegen: `mode: "single"` with `workspace` pointing to `lib/api-zod/src/generated/` — do not change `info.title` in openapi.yaml as it controls filenames
- `serializeDates()` must wrap all DB results before `.parse()` in routes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
