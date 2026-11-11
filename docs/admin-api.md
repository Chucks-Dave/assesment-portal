# Admin academic API

All routes require an active `ADMIN` session. Mutation requests require a matching `Origin` header and `application/json`; unknown fields are rejected.

- `GET /api/admin/dashboard` returns institution counts, the active semester, and recent offerings.
- `GET /api/admin/options` returns bounded choices for administration forms.
- `GET|POST /api/admin/courses` lists or creates department-owned catalogue courses with required default credit units.
- `GET|POST /api/admin/offerings` lists or publishes semester offerings.
- `PATCH /api/admin/offerings/:id` changes only the lecturer and/or credit units.
- `GET /api/admin/result-batches?status=SUBMITTED` lists result batches awaiting review.
- `GET /api/admin/result-batches/:id` returns the submitted score sheet and student identities.
- `POST /api/admin/result-batches/:id/approve` permanently approves a submitted batch.
- `POST /api/admin/result-batches/:id/reject` returns a submitted batch with required `{ feedback }`.

List routes use cursor pagination with a maximum page size of 50. The course, programme, and assigned lecturer must belong to the same department. Duplicates return `409`; invalid academic relationships return `422`. Every successful mutation writes an `AuditEvent`. Offering identity and scope cannot be edited after publication because registrations and results depend on them.

The administrator sets `defaultCreditUnits` (1–12) when creating a course. Selecting that course while publishing an offering prefills `creditUnits`; the offering keeps its own value so approved historical registrations remain tied to the units actually offered.

Only `SUBMITTED` result batches can be approved or rejected. The conditional database update prevents two administrators from reviewing the same batch concurrently. Approved results become visible through the student API; rejected batches return to the lecturer as editable drafts with the administrator’s feedback.
