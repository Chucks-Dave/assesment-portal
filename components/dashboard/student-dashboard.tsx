"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactElement, type ReactNode, type RefObject } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signOut } from "@/features/auth/api";
import { replaceSession } from "@/features/auth/session-cache";
import {
  getRecentRegistrations,
  getEligibleCourses,
  getRegistrations,
  registerCourses,
  withdrawRegistration,
  getStudentDashboard,
  STUDENT_DASHBOARD_QUERY_KEY,
  STUDENT_OFFERINGS_QUERY_KEY,
  STUDENT_REGISTRATIONS_QUERY_KEY,
} from "@/features/student/api";
import { apiErrorMessage } from "@/lib/http-client";
import type { StudentDashboard, StudentOffering, StudentRegistration } from "@/shared/student";
import { Icon } from "@/components/ui/icon";

const styles = {
  academicFacts: "academicFacts", academicPanel: "academicPanel", activeNav: "activeNav",
  avatar: "avatar", brand: "brand", brandMark: "brandMark", closeNav: "closeNav",
  contentGrid: "contentGrid", courseCode: "courseCode", courseList: "courseList",
  courseRow: "courseRow", courseSection: "courseSection", emptyState: "emptyState",
  gpaValue: "gpaValue", helpLink: "helpLink", loading: "loading", logoutError: "logoutError",
  main: "main", menuButton: "menuButton", nav: "nav", panelIcon: "panelIcon",
  profilePanel: "profilePanel", registeredTag: "registeredTag", registrationPanel: "registrationPanel",
  rightRail: "rightRail", scrim: "scrim", scrimOpen: "scrimOpen", searchHint: "searchHint",
  sectionHeader: "sectionHeader", sectionLabel: "sectionLabel", sessionPill: "sessionPill",
  shell: "shell", sidebar: "sidebar", sidebarHead: "sidebarHead", sidebarNote: "sidebarNote",
  sidebarOpen: "sidebarOpen", signOut: "signOut", stateIcon: "stateIcon", statePage: "statePage",
  statusClosed: "statusClosed", statusOpen: "statusOpen", summaryCard: "summaryCard",
  summaryGrid: "summaryGrid", summaryIcon: "summaryIcon", topActions: "topActions",
  topbar: "topbar", userName: "userName", welcome: "welcome", workspace: "workspace",
  courseActions: "courseActions", courseChoice: "courseChoice", courseMeta: "courseMeta",
  coursePage: "coursePage", coursePageHeader: "coursePageHeader", courseTable: "courseTable",
  courseTableHeader: "courseTableHeader", formError: "formError", selectionBar: "selectionBar",
  registeredCourse: "registeredCourse", statusSummary: "statusSummary", textButton: "textButton",
} as const;

const navigation = [
  { label: "Dashboard", icon: "grid", href: "/student/dashboard" },
  { label: "Course registration", icon: "book", href: "/student/courses" },
  { label: "Registered courses", icon: "layers", href: "/student/registrations" },
  { label: "Results", icon: "chart", href: "/student/results" },
  { label: "Academic history", icon: "history", href: "/student/history" },
  { label: "Student profile", icon: "user", href: "/student/dashboard#profile" },
] as const;

function Brand(): ReactElement {
  return <Link className={styles.brand} href="/" aria-label="UEMP home">
    <span className={styles.brandMark}><Icon name="book" /></span>
    <span>UEMP</span>
  </Link>;
}

function Sidebar({ open, close, sidebarRef, closeRef, activeHref }: {
  open: boolean; close: () => void; sidebarRef: RefObject<HTMLElement | null>;
  closeRef: RefObject<HTMLButtonElement | null>; activeHref: string;
}): ReactElement {
  return <>
    <button className={`${styles.scrim} ${open ? styles.scrimOpen : ""}`} onClick={close} tabIndex={-1} aria-hidden="true" />
    <aside ref={sidebarRef} id="student-navigation" className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`} aria-label="Student navigation" role={open ? "dialog" : undefined} aria-modal={open ? true : undefined}>
      <div className={styles.sidebarHead}><Brand /><button ref={closeRef} className={styles.closeNav} onClick={close} aria-label="Close navigation"><Icon name="close" /></button></div>
      <nav className={styles.nav}>
        <p>Student workspace</p>
        {navigation.map((item) => <Link key={item.label} className={item.href === activeHref ? styles.activeNav : ""} href={item.href} onClick={close}>
          <Icon name={item.icon} /><span>{item.label}</span>
        </Link>)}
        <p>Support</p>
        <Link href="/#support"><Icon name="help" /><span>Help centre</span></Link>
      </nav>
      <p className={styles.sidebarNote}>Your records are private and available only through your authenticated session.</p>
    </aside>
  </>;
}

function Topbar({ name, openNav, onSignOut, signingOut, menuRef, navOpen }: {
  name: string; openNav: () => void; onSignOut: () => void; signingOut: boolean;
  menuRef: RefObject<HTMLButtonElement | null>; navOpen: boolean;
}): ReactElement {
  const initials = name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <header className={styles.topbar}>
    <button ref={menuRef} className={styles.menuButton} onClick={openNav} aria-label="Open navigation" aria-controls="student-navigation" aria-expanded={navOpen}><Icon name="menu" /></button>
    <div className={styles.searchHint}><Icon name="search" /><span>Student portal</span></div>
    <div className={styles.topActions}>
      <Link className={styles.helpLink} href="/#support"><Icon name="help" /><span>Help</span></Link>
      <span className={styles.avatar} aria-hidden="true">{initials}</span>
      <span className={styles.userName}>{name}</span>
      <button className={styles.signOut} onClick={onSignOut} disabled={signingOut}>
        <Icon name="logout" /><span>{signingOut ? "Signing out…" : "Sign out"}</span>
      </button>
    </div>
  </header>;
}

function SummaryCards({ dashboard }: { dashboard: StudentDashboard }): ReactElement {
  const facts = [
    { label: "Registered units", value: String(dashboard.registeredUnits), note: "Active semester", icon: "layers" as const },
    { label: "Current level", value: String(dashboard.student.level), note: dashboard.student.program.code, icon: "graduation" as const },
    { label: "Cumulative GPA", value: dashboard.academicSummary.gpa?.toFixed(2) ?? "—", note: dashboard.academicSummary.gpa === null ? "No approved results" : `${dashboard.academicSummary.attemptedUnits} attempted units`, icon: "chart" as const },
  ];
  return <section className={styles.summaryGrid} aria-label="Academic summary">
    {facts.map((fact) => <article className={styles.summaryCard} key={fact.label}>
      <span className={styles.summaryIcon}><Icon name={fact.icon} /></span>
      <div><p>{fact.label}</p><strong>{fact.value}</strong><span>{fact.note}</span></div>
    </article>)}
  </section>;
}

function RegistrationPanel({ dashboard }: { dashboard: StudentDashboard }): ReactElement {
  const semester = dashboard.activeSemester;
  const term = semester?.term === "FIRST" ? "First semester" : "Second semester";
  return <section className={styles.registrationPanel} aria-labelledby="registration-title">
    <div><span className={styles.panelIcon}><Icon name="calendar" /></span><div>
      <p className={styles.sectionLabel}>Current registration period</p>
      <h2 id="registration-title">{semester ? `${semester.session.name} · ${term}` : "No active semester"}</h2>
      <p>{semester?.registrationOpen ? "Course registration is currently open." : "Course registration is not currently open."}</p>
    </div></div>
    <span className={semester?.registrationOpen ? styles.statusOpen : styles.statusClosed}>{semester?.registrationOpen ? "Registration open" : "Registration closed"}</span>
  </section>;
}

function CourseList({ registrations }: { registrations: StudentRegistration[] }): ReactElement {
  return <section className={styles.courseSection} id="courses" aria-labelledby="courses-title">
    <div className={styles.sectionHeader}><div><p className={styles.sectionLabel}>Current semester</p><h2 id="courses-title">Registered courses</h2></div><span>{registrations.length} shown</span></div>
    {registrations.length === 0 ? <div className={styles.emptyState}><Icon name="book" /><h3>No registered courses yet</h3><p>Your eligible courses will appear here after registration.</p></div> :
      <div className={styles.courseList}>{registrations.map((registration) => <article key={registration.id} className={styles.courseRow}>
        <span className={styles.courseCode}>{registration.offering.course.code}</span>
        <div><h3>{registration.offering.course.title}</h3><p>{registration.creditUnitsSnapshot} credit {registration.creditUnitsSnapshot === 1 ? "unit" : "units"}</p></div>
        <span className={styles.registeredTag}><Icon name="check" /> Registered</span>
      </article>)}</div>}
  </section>;
}

function ProfilePanel({ dashboard }: { dashboard: StudentDashboard }): ReactElement {
  const student = dashboard.student;
  return <section className={styles.profilePanel} id="profile" aria-labelledby="profile-title">
    <p className={styles.sectionLabel}>Student identity</p><h2 id="profile-title">Your academic profile</h2>
    <dl><div><dt>Matriculation number</dt><dd>{student.matricNumber}</dd></div><div><dt>Programme</dt><dd>{student.program.name}</dd></div><div><dt>Department</dt><dd>{student.program.department.name}</dd></div><div><dt>Faculty</dt><dd>{student.program.department.faculty.name}</dd></div></dl>
  </section>;
}

function AcademicPanel({ dashboard }: { dashboard: StudentDashboard }): ReactElement {
  const summary = dashboard.academicSummary;
  return <section className={styles.academicPanel} id="academic" aria-labelledby="academic-title">
    <p className={styles.sectionLabel}>Approved results only</p><h2 id="academic-title">Academic standing</h2>
    <div className={styles.gpaValue}><strong>{summary.gpa?.toFixed(2) ?? "—"}</strong><span>CGPA</span></div>
    <div className={styles.academicFacts}><span><b>{summary.attemptedUnits}</b> attempted units</span><span><b>{summary.gradePoints}</b> weighted points</span></div>
    <p>{summary.gpa === null ? "Your summary will appear when approved results are available." : "Calculated from all approved results using credit-unit weighting."}</p>
  </section>;
}

function DashboardContent({ dashboard, registrations }: { dashboard: StudentDashboard; registrations: StudentRegistration[] }): ReactElement {
  const firstName = dashboard.student.user.name.split(" ")[0];
  return <main className={styles.main} id="main-content">
    <div className={styles.welcome}><div><p className={styles.sectionLabel}>Student dashboard</p><h1>Welcome back, {firstName}.</h1><p>Here’s the latest view of your academic record.</p></div><span className={styles.sessionPill}><Icon name="clock" /> {dashboard.activeSemester?.session.name ?? "No active session"}</span></div>
    <SummaryCards dashboard={dashboard} />
    <RegistrationPanel dashboard={dashboard} />
    <div className={styles.contentGrid}><CourseList registrations={registrations} /><div className={styles.rightRail}><AcademicPanel dashboard={dashboard} /><ProfilePanel dashboard={dashboard} /></div></div>
  </main>;
}

export function StudentPageError({ error, title = "We couldn’t load your dashboard", onRetry }: { error: unknown; title?: string; onRetry: () => void }): ReactElement {
  const signedOut = axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0);
  return <main className={styles.statePage}><div><Icon className={styles.stateIcon} name={signedOut ? "lock" : "help"} /><h1>{signedOut ? "Sign in to continue" : title}</h1><p>{signedOut ? "Your session may have expired or this account does not have student access." : apiErrorMessage(error)}</p>{signedOut ? <Link className="button button-green" href="/login">Go to sign in <Icon name="arrow" /></Link> : <button className="button button-green" onClick={onRetry}>Try again</button>}</div></main>;
}

export function StudentPortalFrame({ name, activeHref, children }: { name: string; activeHref: string; children: ReactNode }): ReactElement {
  const [navOpen, setNavOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const router = useRouter();
  const client = useQueryClient();
  const closeNav = (): void => {
    setNavOpen(false);
    requestAnimationFrame((): void => menuButton.current?.focus());
  };
  const logout = useMutation({ mutationFn: signOut, onSuccess: async (): Promise<void> => { await replaceSession(client, null); router.replace("/login"); } });
  useEffect((): (() => void) | undefined => {
    if (!navOpen) return undefined;
    closeButton.current?.focus();
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") { closeNav(); return; }
      if (event.key !== "Tab" || !sidebar.current) return;
      const focusable = [...sidebar.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    return (): void => window.removeEventListener("keydown", handleKey);
  }, [navOpen]);
  return <div className={styles.shell}>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <Sidebar open={navOpen} close={closeNav} sidebarRef={sidebar} closeRef={closeButton} activeHref={activeHref} />
    <div className={styles.workspace} inert={navOpen ? true : undefined}>
      <Topbar name={name} openNav={(): void => setNavOpen(true)} onSignOut={(): void => logout.mutate()} signingOut={logout.isPending} menuRef={menuButton} navOpen={navOpen} />
      {logout.isError && <p className={styles.logoutError} role="alert">{apiErrorMessage(logout.error)}</p>}
      {children}
    </div>
  </div>;
}

export function StudentDashboardScreen(): ReactElement {
  const dashboard = useQuery({ queryKey: STUDENT_DASHBOARD_QUERY_KEY, queryFn: ({ signal }) => getStudentDashboard(signal) });
  const semesterId = dashboard.data?.activeSemester?.id;
  const registrations = useQuery({ queryKey: [...STUDENT_REGISTRATIONS_QUERY_KEY, semesterId],
    queryFn: ({ signal }) => getRecentRegistrations(semesterId!, signal), enabled: !!semesterId });
  if (dashboard.isPending || (semesterId && registrations.isPending)) return <div className={styles.loading} role="status"><span /><p>Loading your academic workspace…</p></div>;
  const error = dashboard.error ?? registrations.error;
  if (error || !dashboard.data || (semesterId && !registrations.data)) return <StudentPageError error={error} onRetry={(): void => { void Promise.all([dashboard.refetch(), registrations.refetch()]); }} />;
  return <StudentPortalFrame name={dashboard.data.student.user.name} activeHref="/student/dashboard">
    <DashboardContent dashboard={dashboard.data} registrations={registrations.data ?? []} />
  </StudentPortalFrame>;
}

function AvailableCourseRow({ offering, selected, toggle, disabled }: {
  offering: StudentOffering; selected: boolean; toggle: () => void; disabled: boolean;
}): ReactElement {
  return <label className={styles.courseChoice}>
    <input type="checkbox" checked={selected} onChange={toggle} disabled={disabled || offering.registered} />
    <span className={styles.courseCode}>{offering.course.code}</span>
    <span><strong>{offering.course.title}</strong><small>{offering.lecturer?.user.name ?? "Lecturer not assigned"}</small></span>
    <span className={styles.courseMeta}>{offering.creditUnits} {offering.creditUnits === 1 ? "unit" : "units"}</span>
    <span className={offering.registered ? styles.registeredTag : ""}>{offering.registered ? "Registered" : "Available"}</span>
  </label>;
}

export function StudentCoursesScreen({ view }: { view: "available" | "registered" }): ReactElement {
  const [selected, setSelected] = useState<string[]>([]);
  const client = useQueryClient();
  const dashboard = useQuery({ queryKey: STUDENT_DASHBOARD_QUERY_KEY, queryFn: ({ signal }) => getStudentDashboard(signal) });
  const semesterId = dashboard.data?.activeSemester?.id;
  const offerings = useQuery({ queryKey: STUDENT_OFFERINGS_QUERY_KEY, queryFn: ({ signal }) => getEligibleCourses(signal), enabled: view === "available" });
  const registrations = useQuery({ queryKey: [...STUDENT_REGISTRATIONS_QUERY_KEY, semesterId, "all"],
    queryFn: ({ signal }) => getRegistrations(semesterId!, signal), enabled: view === "registered" && !!semesterId });
  const refresh = async (): Promise<void> => {
    await Promise.all([
      client.invalidateQueries({ queryKey: STUDENT_OFFERINGS_QUERY_KEY }),
      client.invalidateQueries({ queryKey: STUDENT_REGISTRATIONS_QUERY_KEY }),
      client.invalidateQueries({ queryKey: STUDENT_DASHBOARD_QUERY_KEY }),
    ]);
  };
  const register = useMutation({ mutationFn: registerCourses, onSuccess: async (): Promise<void> => { setSelected([]); await refresh(); } });
  const withdraw = useMutation({ mutationFn: withdrawRegistration, onSuccess: refresh });
  const loading = dashboard.isPending || (view === "available" ? offerings.isPending : !!semesterId && registrations.isPending);
  if (loading) return <div className={styles.loading} role="status"><span /><p>Loading your courses…</p></div>;
  const error = dashboard.error ?? offerings.error ?? registrations.error;
  if (error || !dashboard.data) return <StudentPageError error={error} title="We couldn’t load your courses" onRetry={(): void => { void Promise.all([dashboard.refetch(), offerings.refetch(), registrations.refetch()]); }} />;
  const registrationOpen = dashboard.data.activeSemester?.registrationOpen === true;
  const selectedUnits = (offerings.data ?? []).filter((item) => selected.includes(item.id)).reduce((sum, item) => sum + item.creditUnits, 0);
  const mutationError = register.error ?? withdraw.error;
  return <StudentPortalFrame name={dashboard.data.student.user.name} activeHref={view === "available" ? "/student/courses" : "/student/registrations"}>
    <main className={`${styles.main} ${styles.coursePage}`} id="main-content">
      <header className={styles.coursePageHeader}><div><h1>{view === "available" ? "Course registration" : "Registered courses"}</h1><p>{view === "available" ? "Choose the courses you will take this semester." : "Review the courses currently on your semester record."}</p></div><div className={styles.statusSummary}><span className={registrationOpen ? styles.statusOpen : styles.statusClosed}>{registrationOpen ? "Registration open" : "Registration closed"}</span><p>Registered load <strong>{dashboard.data.registeredUnits} units</strong></p></div></header>
      {mutationError && <p className={styles.formError} role="alert">{apiErrorMessage(mutationError)}</p>}
      {view === "available" ? <>
        <div className={styles.selectionBar}><div><strong>{selected.length}</strong><span> courses selected</span><b>{selectedUnits} units</b></div><button className="button button-green" disabled={!registrationOpen || selected.length === 0 || register.isPending} onClick={(): void => register.mutate(selected)}>{register.isPending ? "Registering…" : "Register selected courses"}</button></div>
        <section className={styles.courseTable} aria-label="Eligible courses">
          <div className={styles.courseTableHeader}><span>Choose</span><span>Code</span><span>Course</span><span>Units</span><span>Status</span></div>
          {(offerings.data ?? []).length === 0 ? <div className={styles.emptyState}><Icon name="book" /><h2>No eligible courses</h2><p>Your administrator has not published courses for your programme and level yet.</p></div> :
            offerings.data?.map((offering) => <AvailableCourseRow key={offering.id} offering={offering} selected={selected.includes(offering.id)} disabled={!registrationOpen || register.isPending} toggle={(): void => setSelected((current) => current.includes(offering.id) ? current.filter((id) => id !== offering.id) : [...current, offering.id])} />)}
        </section>
      </> : <section className={styles.courseTable} aria-label="Registered courses">
        <div className={`${styles.courseTableHeader} ${styles.registeredCourse}`}><span>Code</span><span>Course</span><span>Units</span><span>Action</span></div>
        {(registrations.data ?? []).length === 0 ? <div className={styles.emptyState}><Icon name="layers" /><h2>No registered courses</h2><p>Go to course registration to choose from your eligible semester courses.</p><Link className="button button-green" href="/student/courses">Choose courses</Link></div> : registrations.data?.map((item) => { const withdrawing = withdraw.isPending && withdraw.variables === item.id; return <article className={`${styles.courseChoice} ${styles.registeredCourse}`} key={item.id}><span className={styles.courseCode}>{item.offering.course.code}</span><span><strong>{item.offering.course.title}</strong><small>Registered {new Date(item.registeredAt).toLocaleDateString()}</small></span><span className={styles.courseMeta}>{item.creditUnitsSnapshot} {item.creditUnitsSnapshot === 1 ? "unit" : "units"}</span><button className={styles.textButton} aria-busy={withdrawing} disabled={!registrationOpen || withdraw.isPending} onClick={(): void => withdraw.mutate(item.id)}>{withdrawing ? "Withdrawing…" : "Withdraw"}</button></article>; })}
      </section>}
    </main>
  </StudentPortalFrame>;
}
