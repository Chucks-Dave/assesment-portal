# Student workflow delivery checklist

| Requirement | Page or service | Verification |
| --- | --- | --- |
| Secure login and role redirect | `/login`, auth services | Auth integration and Playwright tests |
| Student dashboard and identity | `/student/dashboard` | Student integration and Playwright tests |
| Editable phone and address only | `/student/profile`, profile service | Boundary and Playwright validation tests |
| Eligible course discovery | `/student/courses`, course service | Eligibility integration tests |
| Transactional course registration | registration service | Duplicate, ineligible, and persistence tests |
| Persisted registered courses | `/student/registrations` | Integration and browser reload workflow |
| Approved results only | `/student/results`, result service | Batch-status isolation tests |
| Semester and cumulative GPA | `/student/history`, grading module | Grading boundary and integration tests |
| Printable registration summary | `/student/registrations` print media | Playwright print-media assertion |
| Printable approved result statement | `/student/results` print media | Playwright print-media assertion |
| Responsive and keyboard-accessible Student UI | Student layout and pages | Desktop/mobile Playwright workflow |
| Lecturer result submission support | `/lecturer/dashboard` | Lecturer integration and Playwright tests |
| Administrator catalogue and approval support | `/admin/*` | Admin integration and Playwright tests |
| Administrator user management | `/admin/users`, user-management services | Role-assignment, status, session, audit, and Playwright tests |

## Demonstration sequence

1. Sign in with the dedicated Student demonstration account.
2. Review academic identity and update contact details.
3. Register an eligible course and confirm it remains after reload or a new session.
4. Open Registered courses and print or save the registration summary as PDF.
5. Open Results and confirm only approved results contribute to CGPA.
6. Print or save the approved result statement as PDF.

## Known limitations

The MVP uses one active semester and additive registration. It does not implement prerequisites, maximum-unit policy, retakes, certified transcripts, public registration, or unauthenticated database reset. Browser-generated statements are explicitly non-certified. Deployment concurrency and connection pooling must be smoke-tested against the chosen managed PostgreSQL provider.
