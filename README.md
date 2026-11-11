# UEMP

University student portal built with Next.js, TypeScript, PostgreSQL, and Prisma. The backend implements custom authentication for STUDENT, LECTURER, and ADMIN accounts plus the authenticated Student academic API.

Follow `CODING_STANDARDS.md` and `public/UEMP_Nextjs_Agent_Plan.docx`. Custom auth and PostgreSQL throttling replace the plan's authentication-library recommendation by explicit user request.

## Setup

Run `npm ci`. Configure private `.env` values using `.env.example`: `DATABASE_URL` must point to PostgreSQL; `AUTH_ORIGIN` must match the application origin, such as `http://localhost:3000` (HTTPS in production).

```bash
npm run db:generate
npm run db:validate
npm run db:deploy
npm run dev
```

For later schema changes in a development database, use `npm run db:migrate -- --name descriptive_name`. Deployment runs `npm run build` and `npm run db:deploy`. Configure pooling for your PostgreSQL host and a direct migration URL in `prisma.config.ts` if required by that host.

## Authentication

See [the authentication contract](docs/auth.md) for endpoints, request and response shapes, role guards, security behavior, and limitations. All roles use the same login endpoint; credentials determine the role.

Public signup is disabled. Run `npm run auth:provision` with `AUTH_USER_EMAIL`, `AUTH_USER_NAME`, `AUTH_USER_PASSWORD`, and `AUTH_USER_ROLE` supplied through your local environment or secrets manager. Roles are STUDENT, LECTURER, and ADMIN. Passwords must contain 12–128 characters. Repeating the command leaves existing accounts, passwords, and roles unchanged. It provisions authentication records; academic student profiles are separate records and require institutional program, level, and matriculation data.

## Student API

Authenticated student endpoints cover dashboard summary, profile/contact updates, eligible courses, transactional registrations, approved results, and academic history. See [the student API contract](docs/student-api.md) for request contracts, pagination, authorization, data requirements, and result privacy rules.

After provisioning the three local demonstration accounts in `.env.demo-accounts`, run `npm run db:seed:academics`. The idempotent command links the configured student account to a demonstration Computer Science profile, active semester, registered courses, and approved historical results. It also links the configured lecturer to the demonstration department. Repeating the command does not duplicate records or change account credentials.

Use fictitious demonstration credentials. Keep passwords out of committed files and command arguments. Never expose a public provisioning/reset endpoint.

## Administration

Administrators are taken directly to `/admin/dashboard` after login. The first administration phase provides institution counts, recent offering activity, catalogue-course creation, and semester-offering publication. Programme and lecturer choices are constrained to the selected course department. See [the admin academic API contract](docs/admin-api.md) for routes, validation, pagination, and audit behavior.

## Lecturer results

Lecturers are taken directly to `/lecturer/dashboard` after login. They can view active assigned offerings, open registered-student rosters, save CA/exam scores as drafts, and submit complete batches for administrator approval. The server owns grade calculation and locks submitted batches. See [the lecturer result API contract](docs/lecturer-api.md).

Schedule `npm run auth:cleanup` to delete up to 100 expired sessions and 100 expired throttle counters per run; repeat for higher volume. Expired sessions are rejected regardless of cleanup.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run db:validate
npm run build
```

Tests start an isolated PostgreSQL-compatible PGlite instance over a loopback socket and execute the migration, real Prisma queries, auth services, and Route Handlers. They do not use your `.env` database or require Redis/Docker. Your execution environment must permit the loopback listener. PGlite serializes connections: verify deployment concurrency and pooling against the target PostgreSQL host before release.

Import `prisma` from `@/server/db` only in Node.js server modules. Generated Prisma files are excluded from version control and linting; regenerate them after schema changes.

## Frontend

The public landing page at `/` adapts the approved school-site reference into UEMP's red/green identity. `/login` provides a working frontend for all three account roles. Academic services shown on the landing page describe the planned student workflow; the authenticated academic workspace is still to be implemented.

Browser requests use the shared Axios client in `lib/http-client.ts`. TanStack Query handles session reads and authentication mutations inside a login-scoped provider. React Hook Form and the shared Zod login schema provide form validation. Passwords and tokens are never persisted in browser storage; session changes cancel pending queries and discard the previous account's other cached data while preserving the current-session observer.

Run `npm run test:e2e` with a preview running at `http://localhost:3000`, or set `PLAYWRIGHT_BASE_URL` to another local preview URL. These three Chrome checks cover responsive overflow, keyboard navigation, linked guides, frontend validation, login/logout UI, and error handling. Browser auth responses are mocked; the separate Vitest integration suite verifies real database-backed authentication.

The design system is captured in `DESIGN.md` and `.impeccable/design.json`. The Figma file could not be read through the tools available in this session, so the supplied screenshot and confirmed adaptation guided implementation. Photography in `public/images` is illustrative stock from Pexels and Unsplash; source origins are embedded in the files and are not claims about a particular university.
