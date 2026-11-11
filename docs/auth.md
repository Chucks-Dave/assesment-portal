# Authentication contract

Custom authentication supports STUDENT, LECTURER, and ADMIN accounts. Accounts and roles are provisioned server-side. Public signup, password reset, and account-management HTTP endpoints are outside this phase.

## Endpoints

| Method | Endpoint | Input | Success payload |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | JSON `{ "email": "student@example.test", "password": "your password" }` | `{ user, expiresAt }` |
| GET | `/api/auth/me` | Session cookie | `{ user }` |
| POST | `/api/auth/logout` | Session cookie; no body or empty JSON `{}` | `null` |
| POST | `/api/auth/logout-all` | Session cookie; no body or empty JSON `{}` | `null` |

Successful responses use HTTP 200 and `{ "statusCode": 200, "message": "...", "payload": ... }`. A user contains exactly `id`, `email`, `name`, `role`, and `status`. `expiresAt` is an ISO 8601 string. Password hashes, session IDs, and tokens never appear in JSON. All responses use `Cache-Control: no-store`.

Email is lowercased and trimmed; passwords are preserved exactly. Unknown body fields, including role, status, studentId, and userId, are rejected. Query parameters are rejected. Login requires `Content-Type: application/json`; the 4 KiB body limit measures actual bytes without trusting Content-Length.

Every POST requires an `Origin` header exactly matching `AUTH_ORIGIN`, including port. Missing, null, mismatched, and cross-site origins are rejected. Browsers send Origin on same-origin POST requests; command-line clients must set it explicitly. CORS and bearer-token authentication are not enabled.

Example with fictitious credentials:

```bash
curl -i -c /tmp/uemp-cookies.txt http://localhost:3000/api/auth/login \
  -H 'Origin: http://localhost:3000' \
  -H 'Content-Type: application/json' \
  --data '{"email":"student@example.test","password":"fictional example passphrase"}'

curl -b /tmp/uemp-cookies.txt http://localhost:3000/api/auth/me

curl -b /tmp/uemp-cookies.txt -X POST http://localhost:3000/api/auth/logout \
  -H 'Origin: http://localhost:3000'
```

## Sessions and authorization

Passwords use asynchronous Node.js scrypt with `N=32768`, `r=8`, `p=3`, a random 16-byte salt, and timing-safe comparison, following [OWASP's scrypt guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt). Hashes are versioned for deliberate future parameter upgrades. Unknown-account login performs dummy password work and returns the same 401 response as an incorrect password.

Login creates a random 32-byte token, stores only its SHA-256 hash in PostgreSQL, and sends the token exclusively in a host-only HttpOnly SameSite=Lax cookie. Sessions last an absolute seven days without sliding renewal. HTTPS uses the Secure `__Host-uemp_session` cookie; local HTTP uses `uemp_session`. Production requires an HTTPS `AUTH_ORIGIN`.

Successful login revokes an existing session supplied in the request cookie. Current-device logout is idempotent, deletes that session, and expires the cookie. Logout-all requires an active account and deletes that user's sessions only. User-row locks serialize session creation and logout-all for the same account.

`requireUser(token, roles?)` loads the current session and safe user projection from PostgreSQL on every call, checks expiry and active status, and optionally enforces allowed roles. Future services must call this guard themselves and scope academic records to the returned user's identity. UI redirects alone are insufficient. Role changes and suspensions affect the next request. Reactivation permits otherwise unexpired sessions again unless they were explicitly revoked.

Example for a student-only server operation:

```typescript
import "server-only";
import { cookies } from "next/headers";
import { UserRole } from "@/generated/prisma/client";
import { sessionCookieOptions } from "@/server/auth/config";
import { requireUser, type AuthUser } from "@/server/auth/service";

export async function requireCurrentStudent(): Promise<AuthUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieOptions().name)?.value;
  return requireUser(token, [UserRole.STUDENT]);
}
```

| Actor | Login and own session | Future protected operations |
| --- | --- | --- |
| Anonymous | Login only | Denied |
| Active student | Allowed | Require STUDENT and resource ownership |
| Active lecturer | Allowed | Require LECTURER and resource ownership |
| Active admin | Allowed | Require ADMIN; student/lecturer access must be explicitly granted |
| Suspended/inactive | Login and reads denied; current-device logout allowed | Denied |

Only the session endpoints currently exist; the academic services will apply these guards as they are implemented.

## Login throttling

Atomic PostgreSQL UPSERT counters permit five attempts per normalized email per 15 minutes and 100 attempts globally per minute. Successful and failed credential attempts both consume limits. Email keys are SHA-256 digests. The global cap bounds password work and distinct-account counter creation without trusting spoofable IP headers.

Counters are shared across application instances. Exceeding a limit returns 429 with `Retry-After` seconds. Windows reset on expiration, not on successful login. Database failure blocks login rather than bypassing throttling. Expired counters are pruned in bounded batches after allowed attempts and by `auth:cleanup`.

An attacker can exhaust global or target-account limits and temporarily block legitimate logins. Tune these defaults with measured traffic and trusted infrastructure abuse controls when deploying at larger scale. PGlite tests exercise concurrent requests through real production queries, but serialized connections cannot reproduce every multi-process PostgreSQL race.

## Errors

Expected errors use `{ "statusCode": number, "code": string, "message": string }` and matching HTTP status.

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | INVALID_JSON | Missing or malformed JSON |
| 401 | INVALID_CREDENTIALS | Unknown email or incorrect password |
| 401 | UNAUTHENTICATED | Missing, invalid, expired, or revoked session |
| 403 | ACCOUNT_DISABLED | Correct credentials or session for a non-active account |
| 403 | FORBIDDEN | Wrong role |
| 403 | INVALID_ORIGIN | Missing or untrusted mutation origin |
| 413 | BODY_TOO_LARGE | Body exceeds 4 KiB |
| 415 | UNSUPPORTED_MEDIA_TYPE | Expected JSON content type |
| 422 | VALIDATION_ERROR | Invalid or extra body properties |
| 422 | INVALID_QUERY | Unsupported query parameters |
| 429 | RATE_LIMITED | Login window exceeded; Retry-After included |
| 500 | INTERNAL_ERROR | Sanitized failure, with requestId |

Unexpected failures are logged once with a correlation ID and error type. Credentials, request bodies, database strings, and stack traces are excluded from responses and these logs. Unsupported methods use Next.js's framework-generated 405 response.
