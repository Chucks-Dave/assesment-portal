<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project standards

Read `CODING_STANDARDS.md` before implementation or review and follow it for all changes. The implementation plan is `public/UEMP_Nextjs_Agent_Plan.docx`; build the Student workflow in one Next.js app using PostgreSQL and Prisma.

For frontend changes, also read `frontend-coding-standard.md`. Apply its compatible quality and security rules to Next.js; the explicit custom-auth/no-Redis decisions in `CODING_STANDARDS.md` remain in force. Use Axios for browser HTTP requests, TanStack Query for remote state and mutations, and React Hook Form with Zod for forms. Keep public presentation content server-rendered when it does not need a request.

For every TypeScript or JavaScript change, apply the installed `anti-slop-typescript` skill. Use relevant installed Matt Pocock engineering skills for the task (such as diagnosing-bugs, codebase-design, domain-modeling, tdd, and code-review), respecting their invocation rules. Read the selected skill before use; if a required skill is unavailable, report that rather than claiming to apply it.
