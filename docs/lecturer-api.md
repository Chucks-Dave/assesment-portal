# Lecturer result API

All routes require an active `LECTURER` session and derive the lecturer profile from that session.

- `GET /api/lecturer/dashboard` returns lecturer identity, active assigned offerings, roster totals, and submission totals.
- `GET /api/lecturer/offerings` lists assigned offerings with cursor pagination.
- `GET /api/lecturer/offerings/:id` returns an owned offering and its registered-student roster.
- `PUT /api/lecturer/offerings/:id/results` saves draft CA and examination scores.
- `POST /api/lecturer/offerings/:id/submit` submits a complete draft for administrator approval.

CA is limited to 30 and examination scores to 70. The server calculates totals, letter grades, and grade points. A lecturer cannot read or modify another lecturer’s offering, submit an incomplete roster, or edit a submitted/approved batch. Successful draft saves and submissions create audit events. Rejected batches may be corrected and resubmitted.
