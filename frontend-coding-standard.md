# NestJS Production-Ready Enterprise Standards


This document defines the absolute minimum standards for code quality, scalability, and security in this repository. The AI Agent must rewrite any code that violates these principles.

## 1. DRY & Single Source of Truth (SSOT)
- **No Magic Strings or Numbers:** Hardcoded values (e.g., roles like `'admin'`, expiration times like `3600`) are strictly forbidden. They must be extracted into Enums or Constants files (`src/common/constants/`).
- **Single Source of Truth:** Database schemas and TypeScript interfaces must align. Use shared Enums for both database constraints and DTO validation. 
- **Don't Repeat Yourself:** If a piece of business logic or a complex query appears twice, it must be extracted into a shared reusable Service or utility function.

## 2. Scalability & Performance
- **Statelessness is Mandatory:** Never store user sessions, locks, or cache data in Node.js memory (e.g., inside an array or variable). Always use **Upstash Redis** so the app can horizontally scale to multiple instances without state conflicts.
- **Pagination Everywhere:** Any database query that returns a list of items (e.g., users, chat history, feed posts) MUST use pagination (Cursor-based preferred, or offset-based) to prevent memory crashes on large datasets.
- **Prevent N+1 DB Queries:** Avoid making database queries inside `for` loops. Always use SQL `JOIN`s, `IN` clauses, or TypeORM/Prisma relation loaders to fetch associated data in a single query.

## 3. Flexibility & Maintainability
- **Dependency Inversion:** Depend on abstractions (Interfaces), not concrete implementations. This makes it easy to swap out services (e.g., swapping a local email sender for AWS SES) without rewriting business logic.
- **Small, Pure Functions:** Functions should do exactly one thing and be under 50 lines. Where possible, write pure functions that do not mutate external state, making them highly testable.
- **Guard Clauses:** Avoid deeply nested `if/else` statements. Use early returns to keep the code flat and readable.

## 4. NestJS Architecture (Separation of Concerns)
- **Controllers:** Must ONLY handle HTTP routing, request parsing, and response formatting. Zero business logic or direct DB calls are allowed here.
- **Services:** Contain the core business processing and orchestrate database calls.
- **Dependency Injection:** Never use `new ClassName()` to instantiate providers. Always use the constructor for Dependency Injection.

## 5. Security & Validation
- **DTOs Everywhere:** Every incoming request body, parameter, and query string must have a DTO class with `class-validator` decorators (e.g., `@IsString()`).
- **Whitelist Strictness:** The global `ValidationPipe` must be configured with `whitelist: true` and `forbidNonWhitelisted: true` to instantly reject requests with unknown or malicious payload properties.
- **Secrets Management:** Never commit secrets. Always use `@nestjs/config` (`ConfigService`) to read `.env` variables.
- **Rate Limiting:** Any endpoint interacting with external services (especially FastAPI LLM generation) must have `@nestjs/throttler` applied to prevent cost-spike attacks.

## 6. Strict TypeScript Rules
- **No `any`:** The `any` keyword is banned. Use `unknown` if the type is truly dynamic, followed by strict type narrowing.
- **Explicit Returns:** All functions, methods, and controller endpoints must have explicit return types.

## 7. Error Handling
- **No Raw Errors:** Never `throw new Error()`. Always use NestJS built-in HTTP Exceptions (`BadRequestException`, `UnauthorizedException`).
- **Sanitize Stack Traces:** Do not leak database stack traces to the client. Use a global Exception Filter to catch and format errors cleanly.
- **Try/Catch Blocks:** All external network requests (like gRPC calls to FastAPI) must be wrapped in `try/catch` with proper failure logging.

## 8. Swagger & Documentation Integrity
- **Response DTOs are Mandatory:** Never return raw Prisma models or database objects directly from a Controller. Always map them to a DTO class. This prevents "leaking" sensitive database fields and ensures Swagger knows the exact shape of the response.
- **Use the Generic Wrapper:** All successful responses must use the custom `@ApiApiResponse(Dto)` decorator to ensure the standard `{ statusCode, message, payload }` structure is documented.
- **Strict Schema Parity:** You must achieve 100% exact parity between the actual JSON response and the Swagger schema. 
    - **No Assumptions:** Never assume a DTO is "close enough." Compare the response line-by-line.
    - **Zero Extra/Missing Fields:** If a field exists in the response but not the DTO (or vice-versa), it is a violation of these standards.
    - **Optional Field Integrity:** If a field is marked as optional (`?`) in a DTO, it must still be explicitly handled or default-assigned in the logic. Never leave a DTO field unmapped if it is part of the contract.
    - **Status Code Accuracy:** The HTTP status code in documentation must match the actual code returned (e.g., use 201 for POST creations).
    - **Specialized DTOs over "Shared" DTOs:** If an endpoint returns a subset or superset of a model (e.g., Session List vs. Session Detail), you MUST create specialized DTOs (e.g., `ChatSessionListDto`, `ChatSessionDetailDto`) rather than using a single shared class with optional fields.
- **Self-Documenting Code:** Use standard JSDoc comments (`/** @example '...' */`) within DTOs. The Swagger CLI plugin is enabled to automatically pick these up, reducing the need for manual `@ApiProperty` decorators.




