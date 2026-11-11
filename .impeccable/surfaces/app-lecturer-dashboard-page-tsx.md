---
version: 1
slug: "app-lecturer-dashboard-page-tsx"
primary_target: "app/lecturer/dashboard/page.tsx"
related_targets: ["app/lecturer/layout.tsx","components/dashboard/lecturer-dashboard.tsx","app/lecturer/dashboard/lecturer-dashboard.css"]
---

## Direction contract

THESIS: The lecturer workspace is a controlled result-preparation desk. It keeps course selection, roster identity, score entry, and approval status in one traceable flow rather than resembling a generic analytics dashboard.

OWN-WORLD: The existing UEMP red navigation, forest-green committed actions, pale green-gray workspace, flat white bordered surfaces, compact Manrope typography, and authored line icons remain authoritative.

STORY: A lecturer confirms current teaching load, chooses an assigned course, reviews the registered roster, saves calculated scores as a draft, and submits the complete batch for administrator approval.

FIRST VIEWPORT: Fixed navigation and a compact top bar frame the lecturer identity, three teaching facts, and assigned-course selector. The selected roster follows immediately as the primary work surface, with status, feedback, inline scores, and draft/submission actions.

FORM: Operate mode extends the authenticated dashboard system. The course list and result sheet share one page so identity and scope remain visible while editing. Desktop uses a compact table; mobile preserves the table’s semantic structure through horizontal containment and enlarged inputs. seed: 737ebb3750a197a7

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
