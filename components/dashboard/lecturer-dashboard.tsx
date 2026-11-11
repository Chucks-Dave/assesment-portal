"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactElement, type RefObject } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { signOut } from "@/features/auth/api";
import { replaceSession } from "@/features/auth/session-cache";
import { getLecturerDashboard, getOfferingRoster, lecturerRosterQueryKey, LECTURER_DASHBOARD_QUERY_KEY, saveResultDraft, submitResultBatch } from "@/features/lecturer/api";
import { apiErrorMessage } from "@/lib/http-client";
import { resultFormSchema, type LecturerDashboard, type LecturerOffering, type OfferingRoster, type ResultForm } from "@/shared/lecturer";

type LecturerView = "dashboard" | "courses" | "results";

function LecturerSidebar({ open, close, closeRef, sidebarRef, view }: { open: boolean; close: () => void; closeRef: RefObject<HTMLButtonElement | null>; sidebarRef: RefObject<HTMLElement | null>; view: LecturerView }): ReactElement {
  return <><button className={`lecturerScrim ${open ? "lecturerScrimOpen" : ""}`} onClick={close} tabIndex={-1} aria-hidden="true" />
    <aside ref={sidebarRef} className={`lecturerSidebar ${open ? "lecturerSidebarOpen" : ""}`} id="lecturer-navigation" aria-label="Lecturer navigation" role={open ? "dialog" : undefined} aria-modal={open || undefined}>
      <div className="lecturerSidebarHead"><Link className="lecturerBrand" href="/"><span><Icon name="book" /></span>UEMP</Link><button ref={closeRef} className="lecturerClose" onClick={close} aria-label="Close navigation"><Icon name="close" /></button></div>
      <nav className="lecturerNav"><p>Lecturer workspace</p><Link className={view === "dashboard" ? "lecturerActiveNav" : ""} href="/lecturer/dashboard" onClick={close}><Icon name="grid" />Dashboard</Link><Link className={view === "courses" ? "lecturerActiveNav" : ""} href="/lecturer/courses" onClick={close}><Icon name="layers" />Assigned courses</Link><Link className={view === "results" ? "lecturerActiveNav" : ""} href="/lecturer/results" onClick={close}><Icon name="chart" />Result entry</Link><p>Support</p><Link href="/#support"><Icon name="help" />Help centre</Link></nav>
      <p className="lecturerSidebarNote">Scores remain editable as drafts until they are submitted for administrator approval.</p>
    </aside></>;
}

function OfferingStatus({ offering }: { offering: LecturerOffering }): ReactElement {
  const status = offering.resultBatches[0]?.status ?? "NOT_STARTED";
  const labels = { NOT_STARTED: "Not started", DRAFT: "Draft", REJECTED: "Needs changes", SUBMITTED: "Awaiting approval", APPROVED: "Approved" } as const;
  return <span className={`lecturerBadge lecturerBadge${status}`}>{labels[status]}</span>;
}

function OfferingList({ offerings, selectedId, select }: { offerings: LecturerOffering[]; selectedId: string | null; select: (id: string) => void }): ReactElement {
  return <section className="lecturerCourses" id="courses" aria-labelledby="assigned-title"><div className="lecturerSectionHead"><div><h2 id="assigned-title">Assigned courses</h2><p>Select a course to open its registered-student roster.</p></div><span>{offerings.length} active</span></div>
    {offerings.length === 0 ? <div className="lecturerEmpty"><Icon name="book" /><h3>No active assignments</h3><p>An administrator must assign you to an active course offering.</p></div> : <div className="lecturerCourseList">{offerings.map((offering) => <button key={offering.id} className={selectedId === offering.id ? "lecturerCourseSelected" : ""} onClick={(): void => select(offering.id)} aria-pressed={selectedId === offering.id}>
      <span className="lecturerCourseCode">{offering.course.code}</span><span className="lecturerCourseCopy"><strong>{offering.course.title}</strong><small>{offering.program.code} · Level {offering.level} · {offering._count.registrations} students</small></span><OfferingStatus offering={offering} /><Icon name="chevron" />
    </button>)}</div>}
  </section>;
}

function ResultEditor({ roster, onDirtyChange }: { roster: OfferingRoster; onDirtyChange: (dirty: boolean) => void }): ReactElement {
  const client = useQueryClient();
  const initial: ResultForm = { results: roster.registrations.map((registration) => ({ registrationId: registration.id, caScore: registration.result?.caScore ?? 0, examScore: registration.result?.examScore ?? 0 })) };
  const form = useForm<ResultForm>({ resolver: zodResolver(resultFormSchema), defaultValues: initial });
  const fields = useFieldArray({ control: form.control, name: "results" }).fields;
  const scores = useWatch({ control: form.control, name: "results" });
  const status = roster.offering.resultBatches[0]?.status;
  const locked = status === "SUBMITTED" || status === "APPROVED";
  const refresh = async (): Promise<void> => { await Promise.all([client.invalidateQueries({ queryKey: lecturerRosterQueryKey(roster.offering.id) }), client.invalidateQueries({ queryKey: LECTURER_DASHBOARD_QUERY_KEY })]); };
  const save = useMutation({ mutationFn: (input: ResultForm) => saveResultDraft(roster.offering.id, input), onSuccess: async (_data, input): Promise<void> => { form.reset(input); onDirtyChange(false); await refresh(); } });
  const submit = useMutation({ mutationFn: async (input: ResultForm): Promise<void> => { await saveResultDraft(roster.offering.id, input); await submitResultBatch(roster.offering.id); },
    onSuccess: async (_data, input): Promise<void> => { form.reset(input); onDirtyChange(false); await refresh(); } });
  useEffect((): void => { onDirtyChange(form.formState.isDirty); }, [form.formState.isDirty, onDirtyChange]);
  const error = save.error ?? submit.error;
  return <section className="lecturerResults" id="results" aria-labelledby="result-title"><div className="lecturerSectionHead"><div><h2 id="result-title">{roster.offering.course.code} result sheet</h2><p>{roster.offering.course.title} · CA 30 marks · Exam 70 marks</p></div><OfferingStatus offering={roster.offering} /></div>
    {roster.offering.resultBatches[0]?.feedback && <p className="lecturerFeedback" role="status"><strong>Administrator feedback:</strong> {roster.offering.resultBatches[0].feedback}</p>}
    {roster.registrations.length === 0 ? <div className="lecturerEmpty"><Icon name="user" /><h3>No registered students</h3><p>Result entry becomes available after students register for this offering.</p></div> : <form onSubmit={form.handleSubmit((input): void => save.mutate(input))} noValidate>
      <div className="lecturerTableWrap"><table><thead><tr><th>Student</th><th>Matric number</th><th>CA / 30</th><th>Exam / 70</th><th>Total</th></tr></thead><tbody>{fields.map((field, index) => {
        const registration = roster.registrations[index]; const ca = scores[index]?.caScore || 0; const exam = scores[index]?.examScore || 0;
        const caError = form.formState.errors.results?.[index]?.caScore?.message; const examError = form.formState.errors.results?.[index]?.examScore?.message;
        return <tr key={field.id}><td><strong>{registration.student.user.name}</strong></td><td>{registration.student.matricNumber}</td><td><input aria-label={`${registration.student.user.name} continuous assessment`} type="number" min="0" max="30" disabled={locked} aria-invalid={!!caError} aria-describedby={caError ? `ca-${registration.id}-error` : undefined} {...form.register(`results.${index}.caScore`, { valueAsNumber: true })} />{caError && <small id={`ca-${registration.id}-error`} className="lecturerFieldError">{caError}</small>}</td><td><input aria-label={`${registration.student.user.name} examination`} type="number" min="0" max="70" disabled={locked} aria-invalid={!!examError} aria-describedby={examError ? `exam-${registration.id}-error` : undefined} {...form.register(`results.${index}.examScore`, { valueAsNumber: true })} />{examError && <small id={`exam-${registration.id}-error`} className="lecturerFieldError">{examError}</small>}</td><td><strong>{ca + exam}</strong><span>/ 100</span></td></tr>;
      })}</tbody></table></div>
      {error && <p className="lecturerFormError" role="alert">{apiErrorMessage(error)}</p>}{save.isSuccess && <p className="lecturerFormSuccess" role="status">Draft results saved.</p>}{submit.isSuccess && <p className="lecturerFormSuccess" role="status">Results submitted for administrator approval.</p>}
      <div className="lecturerFormActions"><button className="button lecturerSecondaryButton" type="submit" disabled={locked || save.isPending || submit.isPending}>{save.isPending ? "Saving…" : "Save draft"}</button><button className="button button-green" type="button" disabled={locked || save.isPending || submit.isPending} onClick={form.handleSubmit((input): void => submit.mutate(input))}>{submit.isPending ? "Saving and submitting…" : "Submit for approval"}<Icon name="arrow" /></button></div>
    </form>}
  </section>;
}

function DashboardBody({ dashboard }: { dashboard: LecturerDashboard }): ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(dashboard.offerings[0]?.id ?? null);
  const [dirtyResults, setDirtyResults] = useState(false);
  const roster = useQuery({ queryKey: lecturerRosterQueryKey(selectedId ?? ""), queryFn: ({ signal }) => getOfferingRoster(selectedId!, signal), enabled: !!selectedId });
  const firstName = dashboard.lecturer.user.name.split(" ")[0];
  const selectOffering = (offeringId: string): void => {
    if (offeringId === selectedId) return;
    if (dirtyResults && !window.confirm("Discard unsaved score changes and open another course?")) return;
    setDirtyResults(false); setSelectedId(offeringId);
  };
  return <main className="lecturerMain" id="lecturer-main"><div className="lecturerWelcome" id="overview"><div><h1>Welcome, {firstName}.</h1><p>Manage assigned courses and prepare results for approval.</p></div><span><Icon name="graduation" />{dashboard.lecturer.department.name}</span></div>
    <section className="lecturerStats" aria-label="Teaching summary"><article><Icon name="book" /><div><strong>{dashboard.summary.assignedCourses}</strong><span>Assigned courses</span></div></article><article><Icon name="user" /><div><strong>{dashboard.summary.registeredStudents}</strong><span>Registered students</span></div></article><article><Icon name="clock" /><div><strong>{dashboard.summary.submittedBatches}</strong><span>Awaiting approval</span></div></article></section>
    <OfferingList offerings={dashboard.offerings} selectedId={selectedId} select={selectOffering} />
    {selectedId && (roster.isPending ? <div className="lecturerInlineLoading" role="status">Loading course roster…</div> : roster.data ? <ResultEditor key={`${selectedId}-${roster.data.offering.resultBatches[0]?.status ?? "new"}`} roster={roster.data} onDirtyChange={setDirtyResults} /> : <p className="lecturerFormError" role="alert">{apiErrorMessage(roster.error)}</p>)}
  </main>;
}

export function LecturerDashboardScreen({ view = "dashboard" }: { view?: LecturerView }): ReactElement {
  const [navOpen, setNavOpen] = useState(false); const router = useRouter(); const client = useQueryClient();
  const menu = useRef<HTMLButtonElement>(null); const closeButton = useRef<HTMLButtonElement>(null); const sidebar = useRef<HTMLElement>(null);
  const dashboard = useQuery({ queryKey: LECTURER_DASHBOARD_QUERY_KEY, queryFn: ({ signal }) => getLecturerDashboard(signal) });
  const logout = useMutation({ mutationFn: signOut, onSuccess: async (): Promise<void> => { await replaceSession(client, null); router.replace("/login"); } });
  const closeNav = (): void => { setNavOpen(false); requestAnimationFrame((): void => menu.current?.focus()); };
  useEffect((): (() => void) | undefined => { if (!navOpen) return undefined; closeButton.current?.focus(); const key = (event: KeyboardEvent): void => {
    if (event.key === "Escape") { closeNav(); return; } if (event.key !== "Tab" || !sidebar.current) return;
    const controls = [...sidebar.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")]; const first = controls[0]; const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }; window.addEventListener("keydown", key); return (): void => window.removeEventListener("keydown", key); }, [navOpen]);
  if (dashboard.isPending) return <div className="lecturerLoading" role="status"><span />Loading lecturer workspace…</div>;
  if (!dashboard.data || dashboard.error) { const denied = axios.isAxiosError(dashboard.error) && [401,403].includes(dashboard.error.response?.status ?? 0); return <main className="lecturerState"><div><Icon name={denied ? "lock" : "help"} /><h1>{denied ? "Lecturer access required" : "We couldn’t load your dashboard"}</h1><p>{denied ? "Sign in with an active lecturer account." : apiErrorMessage(dashboard.error)}</p><Link className="button button-green" href="/login">Go to sign in</Link></div></main>; }
  return <div className="lecturerShell"><a className="skip-link" href="#lecturer-main">Skip to dashboard content</a><LecturerSidebar open={navOpen} close={closeNav} closeRef={closeButton} sidebarRef={sidebar} view={view} /><div className="lecturerWorkspace" inert={navOpen ? true : undefined}>
    <header className="lecturerTopbar"><button ref={menu} className="lecturerMenu" onClick={(): void => setNavOpen(true)} aria-label="Open navigation" aria-controls="lecturer-navigation" aria-expanded={navOpen}><Icon name="menu" /></button><div><Icon name="grid" />Lecturer portal</div><button className="lecturerSignOut" onClick={(): void => logout.mutate()} disabled={logout.isPending}><Icon name="logout" />{logout.isPending ? "Signing out…" : "Sign out"}</button></header>
    {logout.isError && <p className="lecturerFormError lecturerLogoutError" role="alert">{apiErrorMessage(logout.error)}</p>}<DashboardBody dashboard={dashboard.data} />
  </div></div>;
}
