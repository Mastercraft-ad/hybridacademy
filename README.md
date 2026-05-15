# Nigerian School Report Card Generator

A professional web application for Nigerian schools to manage student data, enter scores, generate graded report cards, and export bulk PDFs — all compliant with Nigeria's standard 40/60 test/exam grading structure.

---

## Project Vision

Nigerian schools need a fast, reliable, and professional tool for generating student report cards each term. This system handles the full lifecycle: from school setup and grading configuration, to bulk score entry, automatic position calculation, and PDF report card generation — complete with school branding, psychomotor assessments, and class statistics.

---

## Key Features

### 1. School Management
- Configure school name, logo, address, and motto
- Multiple-school support (for education management companies)

### 2. Student & Class Management
- Register students with admission numbers and class assignments
- Manage classes and academic sessions

### 3. Academic Term Management
- Define sessions (e.g., 2023/2024) and terms (1st, 2nd, 3rd)
- Historical term tracking for longitudinal performance analysis

### 4. Bulk Score Entry
- Enter Test (40%) and Exam (60%) scores for each student per subject
- System auto-calculates totals, grades, and remarks based on configured grading scale

### 5. Grading Settings Module
- Admin-defined grade scales (e.g., A1 = 75–100, B2 = 70–74)
- Configurable remarks per grade (e.g., "Excellent", "Very Good")
- Formula-based class position calculation

### 6. Psychomotor & Affective Traits
- Rate students on: Punctuality, Neatness, Honesty, Creativity, Sports, etc.
- Trait ratings: Excellent / Very Good / Good / Fair / Poor

### 7. Report Card Generation
- Per-student PDF report cards with school header/branding
- Includes: subject scores, totals, average, class position, psychomotor traits, teacher/principal remarks
- A4-optimised print layout

### 8. Bulk PDF Export
- Generate a ZIP file containing all report cards for a class in a single click
- Positions auto-calculated on the fly before export

### 9. Dashboard & Analytics
- Term summary stats: pass rate, class average, top performers
- Subject performance breakdown

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, TypeScript |
| UI Components | Shadcn/UI + Tailwind CSS |
| State / Data Fetching | TanStack React Query |
| Routing | Wouter |
| Backend | Node.js + Express 5 |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Validation | Zod v4 |
| PDF Generation | @react-pdf/renderer (client-side) |
| ZIP Export | JSZip |
| API Contract | OpenAPI 3.1 → Orval codegen |
| Build | esbuild (server), Vite (client) |

---

## Database Schema Overview

```
School
  └── id, name, address, motto, logoUrl

Class
  └── id, schoolId, name, section

Student
  └── id, schoolId, classId, name, admissionNo, gender, dateOfBirth

AcademicTerm
  └── id, schoolId, session (e.g. "2023/2024"), term (1|2|3), startDate, endDate

Subject
  └── id, schoolId, name, code

SubjectScore
  └── id, studentId, subjectId, termId
  └── testScore (max 40), examScore (max 60), total, grade, remark

PsychomotorTrait
  └── id, schoolId, name (e.g. "Punctuality"), displayOrder

PsychomotorRating
  └── id, studentId, traitId, termId, rating (1-5)

ReportCard
  └── id, studentId, termId
  └── totalScore, average, position, outOf (class size)
  └── teacherRemark, principalRemark, nextTermBegins, daysPresent, daysAbsent

GradeConfig
  └── id, schoolId, minScore, maxScore, grade (e.g. "A1"), remark (e.g. "Excellent")
```

---

## Architecture Decisions

- **Contract-first API**: OpenAPI spec is the single source of truth. All hooks and Zod validators are auto-generated via Orval — no hand-written types.
- **Calculation layer**: Position, average, and grade calculations live in a pure utility module (`lib/calculations.ts`) isolated from UI and API code. This makes them independently testable.
- **Client-side PDF**: Report cards are rendered in-browser using `@react-pdf/renderer`, avoiding costly server-side Puppeteer dependencies. The ZIP export collects blobs client-side.
- **Grading is runtime-configurable**: The `GradeConfig` table means school admins can change grade boundaries without a code deployment.
- **Drizzle schema-first migrations**: DB schema changes are pushed via `pnpm --filter @workspace/db run push` in dev, and are applied automatically on publish to production.

---

## Running Locally

```bash
# Install dependencies
pnpm install

# Start the API server
pnpm --filter @workspace/api-server run dev

# Start the frontend
pnpm --filter @workspace/school-report run dev

# Push DB schema changes
pnpm --filter @workspace/db run push

# Re-generate API client after spec changes
pnpm --filter @workspace/api-spec run codegen

# Full typecheck
pnpm run typecheck
```

**Required environment variables:**
- `DATABASE_URL` — PostgreSQL connection string

---

## Project Structure

```
artifacts/
  api-server/         # Express 5 backend — routes, middleware
  school-report/      # React + Vite frontend
lib/
  api-spec/           # OpenAPI 3.1 spec (source of truth)
  api-client-react/   # Generated React Query hooks
  api-zod/            # Generated Zod validators (used by server)
  db/                 # Drizzle ORM schema + migrations
```

---

## Nigerian Context

This app is built for Nigerian educational institutions and follows the Nigerian grading convention:
- **Test/CA**: 40 marks maximum
- **Exam**: 60 marks maximum  
- **Total**: 100 marks
- Grade scale typically: A1 (75–100), B2 (70–74), B3 (65–69), C4 (60–64), C5 (55–59), C6 (50–54), D7 (45–49), E8 (40–44), F9 (0–39)
- **Psychomotor domains** assessed each term (Neatness, Punctuality, Creativity, etc.)
- **Class position** calculated and printed on each report card
