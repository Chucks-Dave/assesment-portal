# UEMP coding standards

These rules apply to all implementation and review work. They adapt the supplied NestJS enterprise standards to the approved full-stack Next.js plan. Keep Next.js App Router and Prisma; framework-specific NestJS decorators, dependency injection containers, ValidationPipe, ConfigService, exceptions, and Swagger plugins are replaced by the equivalents below.

## Architecture

- Keep Route Handlers responsible for HTTP parsing, validation, delegation, and response formatting. Put business rules, authorization, and database access in server-only services. Server Components call services directly.
- Use the Node.js runtime for database-backed handlers. Import `server-only` in modules containing database access or secrets.
- Share repeated business rules and complex queries. Introduce interfaces at meaningful substitution boundaries; keep simple code direct rather than adding pass-through layers.
- Write focused functions under 50 lines, use guard clauses, and prefer pure functions for calculations.

## TypeScript and skills

- Apply `anti-slop-typescript` whenever editing TypeScript or JavaScript. Use relevant installed Matt Pocock skills according to their triggers; do not force unrelated workflows.
- Keep strict TypeScript enabled. Ban authored `any`; use `unknown` only at genuinely untrusted boundaries and narrow it before business logic.
- Give functions and methods explicit return types. Infer local values and derive model types from Prisma and validated schemas instead of duplicating them.
- Validate untrusted input once, then trust precise internal types. Avoid redundant checks, silent empty fallbacks, unnecessary coercion, speculative generics, trivial helpers, and pointless DTO copies.
- Model mutually exclusive states with discriminated unions. Review every new abstraction, assertion, branch, and fallback for a real need.

## Data and performance

- Use PostgreSQL through Prisma with versioned migrations and deterministic, idempotent seeds. Keep schema constraints and domain validation aligned; reuse generated enums for persisted domain values.
- Extract business constants such as roles, grading thresholds, timeouts, and page limits into their owning domain modules. Ordinary syntax and self-evident literals do not need artificial wrappers.
- Paginate list queries with bounded limits, preferring cursor pagination. Use set-based operations, relation loading, or joins to avoid N+1 queries.
- Use transactions and database uniqueness for registration consistency and concurrent submissions. Preserve academic history and credit/grade snapshots.
- Store sessions, locks, and shared counters in PostgreSQL, outside process memory. Authentication uses custom server-only code and atomic PostgreSQL throttling; do not add Redis or an authentication library unless the user changes this decision. This explicit user decision overrides the library recommendation in the implementation plan. A process-local Prisma connection pool is infrastructure, not application state.

## Security and validation

- Validate request bodies, parameters, queries, and environment configuration at boundaries. Use strict Zod objects to reject unknown request fields; derive input types from schemas.
- Authenticate and authorize inside every service entry point. Check active account status, role, and ownership. Derive student identity from the session, never a client-supplied student ID.
- Allowlist editable profile fields. Filter results to APPROVED before serialization or academic aggregation.
- Keep secrets and password hashes server-side. Read environment values through server configuration, keep `.env` ignored, and commit only placeholder examples. Never log credentials or sensitive student data.
- Use secure HttpOnly sessions, password hashing, logout/invalidation, login throttling, and CSRF protection for cookie-authenticated mutations.
- Rate-limit external-service and costly endpoints using shared storage rather than in-memory counters.

## Errors and response contracts

- Represent expected failures with typed application errors and map them at the HTTP boundary to consistent 401/403/404/409/422 responses as appropriate. Do not use generic errors for expected business failures.
- Return sanitized unexpected errors; keep stack traces and database details out of responses. Catch external network failures where they can be translated, meaningfully logged, recovered, or cleaned up; avoid catch-and-rethrow wrappers.
- Return explicit safe DTO shapes or Prisma `select` projections. Never serialize raw sensitive database records. Use specialized response types where endpoint contracts materially differ.
- Successful JSON APIs, including authentication, use `{ statusCode, message, payload }`, with the actual HTTP status matching `statusCode`. Print routes return their document format.
- Keep documented schemas exactly aligned with serialized fields, optionality, nullability, and HTTP status codes. If OpenAPI is introduced, derive documentation from the same validation/response schemas and verify parity. Add examples where they clarify contracts.

## Verification

- Inspect the diff for security, boundary validation, unnecessary complexity, and scope before finishing.
- Run typecheck, lint, Prisma validation/generation, and the checks appropriate to the change. For workflow implementation, cover authorization attacks, transactional registration, approved-only results, grading boundaries, persistence, and print access as required by the plan.
- Document setup, migrations, seed/reset procedures, grading assumptions, and material limitations. Report unrun or failed checks accurately.
