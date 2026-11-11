# Student API contract

The student API supports the authenticated Student workflow defined in the implementation plan. Every endpoint derives the student from the HttpOnly session cookie, rechecks active account status and the `STUDENT` role, and returns `Cache-Control: no-store`. Client-supplied student or user IDs are not accepted.

Successful responses use `{ "statusCode": 200, "message": "...", "payload": ... }`. Expected failures use `{ "statusCode", "code", "message" }`.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/student/dashboard` | Academic identity, active semester, registered units, and approved cumulative summary |
| GET | `/api/student/profile` | Read-only academic identity and editable contact details |
| PATCH | `/api/student/profile` | Update only `phone` and/or `address` |
| GET | `/api/student/courses` | Active-semester offerings matching the student's program and level |
| GET | `/api/student/registrations` | The current student's persisted registrations |
| POST | `/api/student/registrations` | Transactionally register an eligible set of offering IDs |
| DELETE | `/api/student/registrations/:id` | Withdraw an owned registration while registration remains open and no result exists |
| GET | `/api/student/results` | Approved results and the approved GPA summary |
| GET | `/api/student/history` | Approved results grouped by semester with semester GPA and cumulative GPA |

List endpoints accept `limit` from 1 to 50 and an opaque `cursor`. Registrations, results, and history also accept an optional `semesterId`. Results paginate individual approved results; history paginates complete semester groups so one semester is never split across pages. Unknown query fields return `422`.

## Mutations

Profile update body:

```json
{ "phone": "+2348000000000", "address": "Student residence" }
```

Either field may be `null`; at least one must be present. Academic identity fields such as program, level, matriculation number, role, and results are rejected.

Registration body:

```json
{ "offeringIds": ["offering-id-1", "offering-id-2"] }
```

The set must contain 1 to 30 unique IDs. Every offering must belong to the student's program and level, and its semester must be active with registration open. The entire set is validated before any row is written. Repeating an existing registration returns `409 ALREADY_REGISTERED`; an invalid set returns `422` without partial writes.

PATCH and POST requests require an `Origin` exactly matching `AUTH_ORIGIN` and `Content-Type: application/json`.

## Result privacy and calculations

Only results in an `APPROVED` batch are selected before serialization or aggregation. Draft, submitted, rejected, and other students' results are excluded from results, history, GPA, CGPA, and dashboard summaries.

GPA and cumulative GPA use credit-unit weighting: `sum(units × grade point) / sum(units)`. Failed courses remain in attempted units. Empty approved history returns `gpa: null`; otherwise only the final value is rounded to two decimal places.

## Current data requirement

An authenticated account must have a `Student` record linked through `Student.userId`, plus program, department, and faculty records. An account without that academic profile receives `404 STUDENT_PROFILE_NOT_FOUND`. This prevents the API from inventing matriculation, program, or level data from an email address.

For the local demonstration accounts, `npm run db:seed:academics` creates this academic context from `.env.demo-accounts`. The seed is deterministic and safe to rerun; it does not reset passwords or roles.
