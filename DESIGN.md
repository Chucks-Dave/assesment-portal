---
name: UEMP
description: University red, forest-green actions, and an open photographic welcome.
colors:
  red: "#921f27"
  red-deep: "#74171d"
  green: "#24713f"
  green-deep: "#19572f"
  background: "#ffffff"
  ink: "#222b27"
  muted: "#5d6761"
  surface: "#f3f6f2"
  line: "#dce2dc"
  focus: "#19572f"
  input-border: "#b8c3ba"
  error-surface: "#fff0ef"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(48px, 5.2vw, 74px)"
    fontWeight: 750
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(30px, 3.1vw, 44px)"
    fontWeight: 750
    lineHeight: 1.25
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "20px"
    fontWeight: 750
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "0em"
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0em"
rounded:
  button: "3px"
  input: "4px"
  square: "0px"
spacing:
  compact: "12px"
  control-gap: "18px"
  standard: "24px"
  grid: "32px"
  section-mobile: "66px"
  section: "104px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "13px 25px"
  button-primary-hover:
    backgroundColor: "{colors.green-deep}"
  button-outline:
    backgroundColor: "#ffffff08"
    textColor: "{colors.background}"
    rounded: "{rounded.button}"
    padding: "13px 25px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "13px 14px"
  navigation:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
  support-disclosure:
    textColor: "{colors.ink}"
    padding: "23px 0"
  service-card:
    backgroundColor: "{colors.background}"
    rounded: "{rounded.square}"
    padding: "25px 23px 23px"
---

# Design System: UEMP

## Overview

**Creative North Star: "The academic welcome"**

UEMP adapts the approved school reference into a university portal identity: university red frames the page, forest green marks actions, and white sections give photography and clear headings room to breathe. Manrope supplies a single readable voice across public pages and authentication.

The material is flat and restrained. Illustrative campus and student photographs carry the atmosphere; compact rectangular controls and carefully spaced text carry the tasks. The implementation is the visual source of truth; the supplied screenshot establishes the red/green direction rather than an independently approved generated composition.

**Key Characteristics:**

- University red framing and forest-green actions.
- Photographic media with readable dark overlays.
- Compact rectangular controls and generous section spacing.
- Responsive stacking, visible focus, and reduced motion.

## Colors

The palette pairs university red with forest green and quiet green-tinted neutrals. Frontmatter contains the canonical values; CSS custom properties in `app/globals.css` are the implementation source.

### Primary

- **Forest green:** Primary buttons, links, photo captions, and the featured service card. Deep green is the button hover state.

### Secondary

- **University red:** Announcement strip, section headings, brand details, footer, and invalid field borders. Deep red supports error text.

### Neutral

- **White:** Page, navigation, inputs, and card surfaces; reversed text on saturated backgrounds.
- **Ink / muted:** Headings and body copy respectively.
- **Quiet surface / line:** Alternating section backgrounds and dividers.
- **Input border / error surface:** Field edges and the form-level error panel.
- **Forest-green focus:** Keyboard focus uses deep green with a white separation edge so it remains visible across light and saturated surfaces.

**The Action Color Rule.** Use forest green for primary actions and university red for section headings and page framing.

## Typography

**Display Font:** Manrope, sans-serif fallback.  
**Body Font:** Manrope, sans-serif fallback.

### Hierarchy

The frontmatter records desktop display, section headline, base title, body, and button label roles. Service and guide titles use an 18px variant; descriptive section copy uses 12–14px. The login title uses 34px with 1.2 line height and the shared tight tracking. Form labels use 12px at weight 750. Support answers use 13px.

At widths up to 1050px, the hero headline uses 62px; up to 760px it uses `clamp(40px, 8vw, 58px)`; up to 450px it uses 43px. Inputs use 14px on desktop and 16px up to 760px. Small announcement, brand-caption, and footer metadata are contextual treatments, not a default for new body content.

## Layout

The main container is capped at 1160px with 48px side gutters. Gutters reduce to 32px up to 1050px and 20px up to 760px. Sections use the section spacing tokens.

Desktop service and guide grids have three columns; the about section has equal columns and the support section uses a 0.85:1.15 split. Up to 760px, about and support stack, services use two columns, and guides become horizontal rows. Up to 450px, services and guides become single-column blocks. Footer columns reduce from four to two at 760px.

Desktop authentication divides the viewport equally between an illustrative photograph and the form panel. The form is capped at 400px. At 760px the photograph is hidden and the panel fills the viewport with 24px side padding. The hero minimum height steps from 640px to 610px at 760px and 600px at 450px.

## Elevation & Depth

Flat color bands, thin dividers, a photo-caption overlap, and service-card content overlapping images provide depth. The offset outline behind the about photograph is a border, not a hard shadow. The mobile navigation alone uses a diffuse `0 12px 20px #17241b12` shadow. Dark gradient overlays on hero and login photographs support reversed type.

**The Flat Surface Rule.** Use color, borders, and image overlap to separate content; reserve the existing diffuse shadow for the mobile navigation.

## Shapes

Controls have subtly eased corners; photographs and content panels remain square. Buttons and inputs use their frontmatter radius tokens. Inputs have a thin border. Service panels end with a 2px green bottom rule. Circular dots are reserved for carousel pagination.

## Components

### Buttons

Primary actions use white text on green, a minimum height of 50px, and the frontmatter padding. Hover deepens green on fine pointers; active press scales to 0.97. The white outlined hero action reverses to a white background with deep-green text on hover. The compact desktop navigation action is 42px minimum height. Disabled buttons use 0.65 opacity and a waiting cursor.

### Cards / Containers

Service cards combine a 1.8-ratio photograph with an inset overlapping white panel and green bottom border. The first service panel reverses into green. Guide cards use a 1.65-ratio photograph with a small functional step label, followed by a title, copy, and text link. These labels identify sequence, not promotional eyebrows.

### Inputs / Fields

Fields use white backgrounds, ink text, the input-border token, a 50px minimum height, and green carets. Focused fields use a forest-green border. Labels remain visible. Invalid fields use red borders and adjacent error text. Form errors sit on the error surface. The password control occupies a 44px square within the field. All interactive elements inherit the 3px deep-green keyboard outline with a white separation edge.

### Navigation

White navigation holds the UEMP wordmark, text links, and a green portal action. At 760px a 44px menu control opens a full-width menu below the header; Escape closes it and returns focus. Text links turn red on fine-pointer hover. The footer reverses into red with pale text and underlined hover links.

### Hero and support

Hero slides change only on user input, crossfading photographs over 440ms with the shared ease-out curve. Native support disclosures use thin separators and a plus SVG that rotates when open. Button state changes take 160ms; service photograph hover zoom takes 320ms. Reduced-motion preference removes smooth scrolling, reduces transition durations, and suppresses the existing button/image transforms.

## Do's and Don'ts

### Do:

- Do retain the red/green identity and use the primary green treatment for portal actions.
- Do keep the Manrope hierarchy, visible keyboard focus, and mobile input text at 16px.
- Do use illustrative photography without presenting it as a supplied institutional asset.
- Do preserve user-controlled slides and the reduced-motion override.

### Don't:

- Don't replace compact rectangular controls with pill-shaped buttons.
- Don't add ambient card shadows; use the existing flat surfaces and borders.
- Don't imply that illustrative photographs establish a particular institution.

Login keeps the page and image at viewport height. The form panel owns vertical scrolling independently; on mobile the image is hidden and the form panel remains the scroll container. Use a minimum of 16px for mobile input text.

## Student dashboard

The authenticated workspace uses an Operate composition derived from the supplied dashboard reference. Desktop keeps a 252px university-red sidebar and a compact translucent top bar around a pale green-gray workspace. Summary facts, the active registration period, registered courses, approved academic standing, and academic identity are separated with white surfaces and hairline borders rather than ambient shadows.

Dashboard type is intentionally denser than the public site: labels use 9–12px at strong weights, operational headings use 18–38px, and tabular academic values use compact numerals. Forest-green tints identify registration and approved status; university red remains structural and labels sections without competing with actions.

At 820px and below, the sidebar becomes a red navigation drawer behind a dim scrim. Hidden navigation is removed from keyboard visibility; Escape closes the drawer and returns focus to its trigger. Summary facts stack before the semester panel, course records, academic standing, and profile. Loading, missing-profile, signed-out, empty-course, and sign-out-error states preserve the same visual system.

Course registration and the current registered load use dedicated pages within the same authenticated shell. Registration keeps the open-or-closed status and registered-unit total visible beside the page heading, then pairs a green-tinted selection summary with eligible course records that state code, title, lecturer, units, and availability. Registered-course records keep the same hierarchy and expose withdrawal as a restrained red secondary action. On desktop these records align as compact table-like columns; at 820px and below the header row disappears and each record becomes a readable stacked layout without losing its status, units, or action.

Approved results and academic history extend this shell without changing its hierarchy. Both lead with approved-only cumulative GPA, attempted units, and weighted points before the records. Result rows retain course identity, credit units, continuous-assessment score, exam score, total, and grade: desktop supplies shared column labels, while stacked mobile rows repeat the score labels beside their values. Academic history groups complete semesters in native disclosures, keeps each semester's GPA and summary visible at the disclosure boundary, and labels every score inside the expanded group.

Cursor pagination names the collection it extends: results load more results and history loads more semesters. A next-page failure leaves existing records in place and offers an adjacent retry. Initial and other non-authentication failures offer retry; authentication or authorization failures direct the student to sign in.

Authenticated browser-print views are purpose-built academic documents, not printed captures of the portal shell. Hide navigation, workspace chrome, and screen-only controls; retain the UEMP identity and document title; show the student identity and relevant academic or semester context; and print the complete applicable record set, including records beyond the cursor pages already loaded on screen. Every student copy must plainly state that it is not a certified university document or transcript.

Student profile pages separate university-managed identity from student-maintained contact details. On wide screens, the read-only identity panel sits beside the editable contact panel; narrower layouts stack them, and small screens collapse identity facts into label-value pairs while contact controls and the save action fill the available width. Keep validation adjacent to its field, expose request failures as alerts, and confirm a successful save with an inline status message only after the returned values have replaced the form state. Disable submission when nothing has changed or while a save is pending.

## Admin dashboard

Administration extends the authenticated Operate shell with the same 252px university-red navigation, pale workspace, flat white panels, hairline borders, compact type, and green primary actions. The first viewport prioritizes active-registration context, institution counts, and recent publishing activity; catalogue and offering forms sit directly below rather than hiding core work behind decorative widgets.

Admin forms use explicit labels and native controls. Programme and lecturer choices narrow to the selected course department, feedback stays adjacent to its form, and mobile stacks controls into a single column. Features planned for a later phase remain visibly disabled in navigation so the current authority boundary is honest.

Course creation asks the administrator for default credit units alongside the course code and title. The catalogue table repeats that value, and selecting the course on Semester offerings prefills the offering’s editable units. Full-page administration loading uses a viewport-centered grouped spinner and status message.

Admin navigation uses real pages rather than in-page anchors: overview, course catalogue, semester offerings, and result approval each retain the shared shell while presenting one focused task. Result approval uses a queue-and-detail composition on wide screens and stacks the queue above the horizontally contained score table on narrow screens. Approval remains the green committed action; returning a batch uses a restrained red outline and requires adjacent written feedback.

User management uses the same focused-page model. On wide screens, place the account-creation form beside the larger searchable user directory and keep the form available while the directory scrolls; below the compact workspace breakpoint, stack the form before the directory, then collapse filters and account rows into readable single-column groups on small screens. Account creation reveals academic fields by role: students require programme, matriculation number, and level; lecturers require department; administrators do not receive academic fields.

Directory rows keep identity, role, status, active-session count, and actions distinct. Use explicit `Active`, `Suspended`, and `Inactive` status text, with `Suspend`, `Deactivate`, or `Activate` actions that state the resulting account condition. Mark the signed-in administrator as `Current account` and replace self-directed status, session, and password actions with that protective marker. Password reset is a separate section for the selected account, states that all active sessions will be revoked, keeps validation and result feedback adjacent to the new-password field, and provides clear close and reset actions.

## Lecturer dashboard

The lecturer workspace reuses the authenticated Operate shell and places the assigned-course list directly above the active result sheet. Status badges distinguish untouched, draft, rejected, submitted, and approved work without replacing explicit text. Score inputs retain visible labels through the table headers and per-student accessible names; administrator feedback stays adjacent to the affected batch.

Lecturer navigation uses real pages rather than in-page anchors: dashboard, assigned courses, and result entry each retain the shared shell and expose the active destination in the sidebar. In-page anchors remain appropriate only for skip links or navigation into a genuinely shared public-page section.

On mobile the navigation becomes the same focus-managed drawer used by other authenticated workspaces. Summary facts and course records stack, while the roster table remains semantically tabular inside horizontal containment. Score controls use 16px text and draft/submission actions become full-width controls.
