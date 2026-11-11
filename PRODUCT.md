# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

University students managing their academic activities, lecturers preparing result batches, and administrators publishing the academic catalogue, semester offerings, reviewing submitted results, and managing user accounts.

## Product Purpose

UEMP provides authenticated student access to approved academic records and profile contact maintenance, lecturer access to audited result preparation and submission, and administrator access to course, offering, result-approval, and user-account management.

## Capabilities and Constraints

One Next.js App Router application with TypeScript, PostgreSQL, and Prisma. Custom cookie sessions and PostgreSQL-backed throttling; no Redis or authentication library. Student, lecturer, and administrator workspaces exist. Lecturers prepare and submit complete result batches; administrators approve them or return them with feedback. Administrators can create role-aware student, lecturer, and administrator accounts; filter the user directory; change account status; revoke sessions; and reset passwords, while the signed-in administrator account is protected from self-directed account actions. Authenticated students can print course-registration summaries and approved-result statements for their records; these copies are explicitly non-certified and must include the complete relevant record set rather than only the currently loaded cursor page. Never imply that a particular university or academic calendar has been supplied.

## Brand Commitments

The user approved adapting the supplied Schooling Figma reference and screenshot into a UEMP university landing page, retaining its red/green branding and using student portal login as the primary action. Build directly from the reference. Figma URL: https://www.figma.com/design/ep86FXFCw2YNGGgjUQlSmE/Schooling-%7C-Educational-%7C-Website-Landing-Pages-UI-Design-Template--Community-?node-id=0-1

## Evidence on Hand

The implementation plan at public/UEMP_Nextjs_Agent_Plan.docx and the user-supplied reference screenshot. No institution-specific logo, campus photographs, testimonials, dates, or performance statistics have been supplied. Sourced photography is illustrative.

## Accessibility & Inclusion

Responsive desktop and mobile web, accessible labels, visible keyboard focus, reduced-motion support, and readable contrast.
