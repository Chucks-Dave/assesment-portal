"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactElement, type RefObject } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { Icon } from "@/components/ui/icon";
import { signOut } from "@/features/auth/api";
import { replaceSession } from "@/features/auth/session-cache";
import { ADMIN_DASHBOARD_QUERY_KEY, ADMIN_OPTIONS_QUERY_KEY, ADMIN_RESULT_BATCHES_QUERY_KEY, ADMIN_USERS_QUERY_KEY, approveResultBatch, createAdminUser, createCourse, createOffering, getAdminDashboard, getAdminOptions, getAdminUsers, getResultBatch, getSubmittedResultBatches, rejectResultBatch, resetAdminUserPassword, revokeAdminUserSessions, updateAdminUserStatus } from "@/features/admin/api";
import { apiErrorMessage } from "@/lib/http-client";
import { adminUserInputSchema, adminUserPasswordInputSchema, courseInputSchema, offeringInputSchema, resultRejectionInputSchema, type AdminDashboard, type AdminOptions, type AdminUser, type AdminUserInput, type AdminUserPasswordInput, type CourseInput, type OfferingInput, type ResultRejectionInput } from "@/shared/admin";

export type AdminView = "dashboard" | "courses" | "offerings" | "results" | "users";

function FieldError({ id, message }: { id: string; message?: string }): ReactElement | null {
  return message ? <span className="adminFieldError" id={id} role="alert">{message}</span> : null;
}

function Sidebar({ open, close, closeRef, sidebarRef, view }: { open: boolean; close: () => void; closeRef: RefObject<HTMLButtonElement | null>; sidebarRef: RefObject<HTMLElement | null>; view: AdminView }): ReactElement {
  return <>
    <button className={`adminScrim ${open ? "adminScrimOpen" : ""}`} onClick={close} aria-hidden="true" tabIndex={-1} />
    <aside ref={sidebarRef} className={`adminSidebar ${open ? "adminSidebarOpen" : ""}`} id="admin-navigation" aria-label="Administration navigation" role={open ? "dialog" : undefined} aria-modal={open || undefined}>
      <div className="adminSidebarHead"><Link className="adminBrand" href="/"><span><Icon name="book" /></span>UEMP</Link><button ref={closeRef} className="adminClose" onClick={close} aria-label="Close navigation"><Icon name="close" /></button></div>
      <nav className="adminNav"><p>Administration</p><Link className={view === "dashboard" ? "adminActiveNav" : ""} href="/admin/dashboard" onClick={close}><Icon name="grid" />Overview</Link><Link className={view === "courses" ? "adminActiveNav" : ""} href="/admin/courses" onClick={close}><Icon name="book" />Course catalogue</Link><Link className={view === "offerings" ? "adminActiveNav" : ""} href="/admin/offerings" onClick={close}><Icon name="layers" />Semester offerings</Link><Link className={view === "results" ? "adminActiveNav" : ""} href="/admin/results" onClick={close}><Icon name="check" />Result approval</Link><Link className={view === "users" ? "adminActiveNav" : ""} href="/admin/users" onClick={close}><Icon name="user" />User management</Link></nav>
    </aside>
  </>;
}

function CourseForm({ options }: { options: AdminOptions }): ReactElement {
  const client = useQueryClient();
  const form = useForm<CourseInput>({ resolver: zodResolver(courseInputSchema), defaultValues: { departmentId: "", code: "", title: "", defaultCreditUnits: 3 } });
  const mutation = useMutation({ mutationFn: createCourse, onSuccess: async (): Promise<void> => { form.reset(); await Promise.all([client.invalidateQueries({ queryKey: ADMIN_DASHBOARD_QUERY_KEY }), client.invalidateQueries({ queryKey: ADMIN_OPTIONS_QUERY_KEY })]); } });
  return <section className="adminPanel" id="catalogue"><div className="adminPanelHead"><span><Icon name="book" /></span><div><h2>Create a course</h2></div></div>
    <form onSubmit={form.handleSubmit((input): void => mutation.mutate(input))} noValidate>
      <label>Department<select aria-invalid={!!form.formState.errors.departmentId} aria-describedby={form.formState.errors.departmentId ? "department-error" : undefined} {...form.register("departmentId")}><option value="">Select department</option>{options.departments.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><FieldError id="department-error" message={form.formState.errors.departmentId?.message} />
      <div className="adminFormRow"><label>Course code<input placeholder="CSC201" autoCapitalize="characters" aria-invalid={!!form.formState.errors.code} aria-describedby={form.formState.errors.code ? "course-code-error" : undefined} {...form.register("code")} /><FieldError id="course-code-error" message={form.formState.errors.code?.message} /></label><label>Default credit units<input type="number" min="1" max="12" aria-invalid={!!form.formState.errors.defaultCreditUnits} aria-describedby={form.formState.errors.defaultCreditUnits ? "course-units-error" : "course-units-help"} {...form.register("defaultCreditUnits", { valueAsNumber: true })} /><small id="course-units-help">Used to prefill semester offerings.</small><FieldError id="course-units-error" message={form.formState.errors.defaultCreditUnits?.message} /></label></div>
      <label>Course title<input placeholder="Data Structures" aria-invalid={!!form.formState.errors.title} aria-describedby={form.formState.errors.title ? "course-title-error" : undefined} {...form.register("title")} /><FieldError id="course-title-error" message={form.formState.errors.title?.message} /></label>
      {mutation.isError && <p className="adminFormError" role="alert">{apiErrorMessage(mutation.error)}</p>}
      {mutation.isSuccess && <p className="adminFormSuccess" role="status">Course added. <Link href="/admin/offerings">Publish it from Semester offerings.</Link></p>}
      <button className="button button-green" disabled={mutation.isPending}>{mutation.isPending ? "Creating…" : "Create course"}<Icon name="arrow" /></button>
    </form>
  </section>;
}

function OfferingForm({ options }: { options: AdminOptions }): ReactElement {
  const client = useQueryClient();
  const form = useForm<OfferingInput>({ resolver: zodResolver(offeringInputSchema), defaultValues: { courseId: "", semesterId: options.semesters.find((item) => item.isActive)?.id ?? "", programId: "", lecturerId: "", level: 100, creditUnits: 3 } });
  const courseId = useWatch({ control: form.control, name: "courseId" });
  const course = options.courses.find((item) => item.id === courseId);
  const programmes = course ? options.programs.filter((item) => item.departmentId === course.department.id) : options.programs;
  const lecturers = course ? options.lecturers.filter((item) => item.departmentId === course.department.id) : options.lecturers;
  const mutation = useMutation({ mutationFn: createOffering, onSuccess: async (): Promise<void> => { form.reset({ ...form.getValues(), courseId: "" }); await client.invalidateQueries({ queryKey: ADMIN_DASHBOARD_QUERY_KEY }); } });
  useEffect((): void => { if (course) form.setValue("creditUnits", course.defaultCreditUnits); }, [course, form]);
  return <section className="adminPanel" id="offerings"><div className="adminPanelHead"><span><Icon name="calendar" /></span><div><h2>Publish an offering</h2></div></div>
    <form onSubmit={form.handleSubmit((input): void => mutation.mutate(input))} noValidate>
      <label>Course<select aria-invalid={!!form.formState.errors.courseId} aria-describedby={form.formState.errors.courseId ? "offering-course-error" : undefined} {...form.register("courseId")}><option value="">Select course</option>{options.courses.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}</select></label><FieldError id="offering-course-error" message={form.formState.errors.courseId?.message} />
      <div className="adminFormRow"><label>Semester<select aria-invalid={!!form.formState.errors.semesterId} aria-describedby={form.formState.errors.semesterId ? "semester-error" : undefined} {...form.register("semesterId")}><option value="">Select semester</option>{options.semesters.map((item) => <option key={item.id} value={item.id}>{item.session.name} · {item.term === "FIRST" ? "First" : "Second"}</option>)}</select><FieldError id="semester-error" message={form.formState.errors.semesterId?.message} /></label><label>Programme<select aria-invalid={!!form.formState.errors.programId} aria-describedby={form.formState.errors.programId ? "program-error" : undefined} {...form.register("programId")}><option value="">Select programme</option>{programmes.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select><FieldError id="program-error" message={form.formState.errors.programId?.message} /></label></div>
      <div className="adminFormRow"><label>Lecturer<select aria-invalid={!!form.formState.errors.lecturerId} aria-describedby={form.formState.errors.lecturerId ? "lecturer-error" : undefined} {...form.register("lecturerId")}><option value="">Unassigned</option>{lecturers.map((item) => <option key={item.id} value={item.id}>{item.user.name}</option>)}</select><FieldError id="lecturer-error" message={form.formState.errors.lecturerId?.message} /></label><label>Level<select aria-invalid={!!form.formState.errors.level} aria-describedby={form.formState.errors.level ? "level-error" : undefined} {...form.register("level", { valueAsNumber: true })}>{[100,200,300,400,500,600].map((level) => <option key={level}>{level}</option>)}</select><FieldError id="level-error" message={form.formState.errors.level?.message} /></label><label>Units<input type="number" min="1" max="12" aria-invalid={!!form.formState.errors.creditUnits} aria-describedby={form.formState.errors.creditUnits ? "units-error" : undefined} {...form.register("creditUnits", { valueAsNumber: true })} /><FieldError id="units-error" message={form.formState.errors.creditUnits?.message} /></label></div>
      {mutation.isError && <p className="adminFormError" role="alert">{apiErrorMessage(mutation.error)}</p>}
      {mutation.isSuccess && <p className="adminFormSuccess" role="status">Offering published successfully.</p>}
      <button className="button button-green" disabled={mutation.isPending}>{mutation.isPending ? "Publishing…" : "Publish offering"}<Icon name="arrow" /></button>
    </form>
  </section>;
}

function Overview({ dashboard }: { dashboard: AdminDashboard }): ReactElement {
  const cards = [{ label: "Courses", value: dashboard.counts.courses, icon: "book" as const }, { label: "Offerings", value: dashboard.counts.offerings, icon: "layers" as const }, { label: "Students", value: dashboard.counts.students, icon: "graduation" as const }, { label: "Lecturers", value: dashboard.counts.lecturers, icon: "user" as const }];
  return <><section className="adminStats" aria-label="Institution summary">{cards.map((card) => <article key={card.label}><span><Icon name={card.icon} /></span><div><strong>{card.value}</strong><p>{card.label}</p></div></article>)}</section>
    <section className="adminRecent"><div className="adminSectionHead"><div><h2>Recent course offerings</h2></div><span>{dashboard.activeSemester ? `${dashboard.activeSemester.session.name} · ${dashboard.activeSemester.term === "FIRST" ? "First semester" : "Second semester"}` : "No active semester"}</span></div>
      {dashboard.recentOfferings.length === 0 ? <div className="adminEmpty"><Icon name="layers" /><h3>No offerings published yet</h3><p>Publish a catalogue course from the Semester offerings page.</p><Link href="/admin/offerings">Open semester offerings <Icon name="arrow" /></Link></div> : <div className="adminTableWrap"><table><thead><tr><th>Course</th><th>Programme</th><th>Level</th><th>Lecturer</th><th>Units</th><th>Registrations</th></tr></thead><tbody>{dashboard.recentOfferings.map((item) => <tr key={item.id}><td><strong>{item.course.code}</strong><span>{item.course.title}</span></td><td>{item.program.code}</td><td>{item.level}</td><td>{item.lecturer?.user.name ?? "Unassigned"}</td><td>{item.creditUnits}</td><td>{item._count.registrations}</td></tr>)}</tbody></table></div>}
    </section></>;
}

function CourseCatalogue({ options }: { options: AdminOptions }): ReactElement {
  return <><aside className="adminGuidance"><Icon name="help" /><div><strong>Who sets the course units?</strong><p>The administrator enters the normal units while creating the course. That value automatically prefills <Link href="/admin/offerings">Semester offerings</Link>, where it can be adjusted for an exceptional programme or semester.</p></div></aside><div className="adminPageGrid"><CourseForm options={options} /><section className="adminRecent"><div className="adminSectionHead"><div><h2>Course catalogue</h2></div><span>{options.courses.length} shown</span></div>
    <div className="adminTableWrap"><table><thead><tr><th>Code</th><th>Course title</th><th>Default units</th><th>Department</th></tr></thead><tbody>{options.courses.map((course) => <tr key={course.id}><td><strong>{course.code}</strong></td><td>{course.title}</td><td>{course.defaultCreditUnits}</td><td>{course.department.name}</td></tr>)}</tbody></table></div>
  </section></div></>;
}

function OfferingManagement({ options, dashboard }: { options: AdminOptions; dashboard: AdminDashboard }): ReactElement {
  return <div className="adminPageGrid"><OfferingForm options={options} /><section className="adminRecent"><div className="adminSectionHead"><div><h2>Recent semester offerings</h2></div><span>{dashboard.recentOfferings.length} shown</span></div>
    <div className="adminTableWrap"><table><thead><tr><th>Course</th><th>Programme</th><th>Level</th><th>Lecturer</th><th>Students</th></tr></thead><tbody>{dashboard.recentOfferings.map((item) => <tr key={item.id}><td><strong>{item.course.code}</strong><span>{item.course.title}</span></td><td>{item.program.code}</td><td>{item.level}</td><td>{item.lecturer?.user.name ?? "Unassigned"}</td><td>{item._count.registrations}</td></tr>)}</tbody></table></div>
  </section></div>;
}

function ResultApproval(): ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(null); const client = useQueryClient();
  const batches = useQuery({ queryKey: ADMIN_RESULT_BATCHES_QUERY_KEY, queryFn: ({ signal }) => getSubmittedResultBatches(signal) });
  const activeId = selectedId ?? batches.data?.[0]?.id ?? null;
  const detail = useQuery({ queryKey: [...ADMIN_RESULT_BATCHES_QUERY_KEY, activeId], queryFn: ({ signal }) => getResultBatch(activeId!, signal), enabled: !!activeId });
  const form = useForm<ResultRejectionInput>({ resolver: zodResolver(resultRejectionInputSchema), defaultValues: { feedback: "" } });
  const reviewed = async (): Promise<void> => { form.reset(); setSelectedId(null); await client.invalidateQueries({ queryKey: ADMIN_RESULT_BATCHES_QUERY_KEY }); };
  const approve = useMutation({ mutationFn: () => approveResultBatch(activeId!), onSuccess: reviewed });
  const reject = useMutation({ mutationFn: (input: ResultRejectionInput) => rejectResultBatch(activeId!, input), onSuccess: reviewed });
  const selectBatch = (batchId: string): void => { form.reset(); approve.reset(); reject.reset(); setSelectedId(batchId); };
  if (batches.isPending) return <div className="adminInlineLoading" role="status">Loading submitted result batches…</div>;
  if (batches.error) return <p className="adminFormError" role="alert">{apiErrorMessage(batches.error)}</p>;
  if (!batches.data?.length) return <section className="adminRecent"><div className="adminEmpty"><Icon name="check" /><h2>No results awaiting approval</h2><p>Submitted lecturer batches will appear here for review.</p></div></section>;
  return <div className="adminReviewGrid"><section className="adminBatchList" aria-labelledby="batch-queue-title"><div className="adminSectionHead"><div><h2 id="batch-queue-title">Submitted batches</h2></div><span>{batches.data.length} awaiting review</span></div>{batches.data.map((batch) => <button key={batch.id} onClick={(): void => selectBatch(batch.id)} aria-pressed={activeId === batch.id}><strong>{batch.offering.course.code}</strong><span>{batch.offering.course.title}</span><small>{batch.submitter.name} · {batch._count.results} results</small></button>)}</section>
    <section className="adminResultDetail" aria-labelledby="batch-detail-title">{detail.isPending ? <div className="adminInlineLoading" role="status">Loading result sheet…</div> : detail.error || !detail.data ? <p className="adminFormError" role="alert">{apiErrorMessage(detail.error)}</p> : <><div className="adminSectionHead"><div><h2 id="batch-detail-title">{detail.data.offering.course.code} result sheet</h2><p>{detail.data.offering.course.title} · {detail.data.submitter.name}</p></div><span>{detail.data.offering.program.code} · Level {detail.data.offering.level}</span></div>
      <div className="adminTableWrap"><table><thead><tr><th>Student</th><th>Matric number</th><th>CA</th><th>Exam</th><th>Total</th><th>Grade</th></tr></thead><tbody>{detail.data.results.map((result) => <tr key={result.id}><td><strong>{result.registration.student.user.name}</strong></td><td>{result.registration.student.matricNumber}</td><td>{result.caScore}</td><td>{result.examScore}</td><td>{result.totalScore}</td><td><strong>{result.grade}</strong></td></tr>)}</tbody></table></div>
      {(approve.error || reject.error) && <p className="adminFormError" role="alert">{apiErrorMessage(approve.error ?? reject.error)}</p>}
      <form className="adminReviewActions" onSubmit={form.handleSubmit((input): void => reject.mutate(input))} noValidate><label>Rejection feedback<textarea placeholder="Explain what the lecturer must correct" aria-invalid={!!form.formState.errors.feedback} aria-describedby={form.formState.errors.feedback ? "feedback-error" : undefined} {...form.register("feedback")} /></label><FieldError id="feedback-error" message={form.formState.errors.feedback?.message} /><div><button className="button adminRejectButton" disabled={reject.isPending || approve.isPending}>{reject.isPending ? "Returning…" : "Return for correction"}</button><button className="button button-green" type="button" disabled={reject.isPending || approve.isPending} onClick={(): void => approve.mutate()}>{approve.isPending ? "Approving…" : "Approve results"}<Icon name="check" /></button></div></form>
    </>}</section></div>;
}

function UserCreateForm({ options }: { options: AdminOptions }): ReactElement {
  const client = useQueryClient();
  const form = useForm<AdminUserInput>({ resolver: zodResolver(adminUserInputSchema), defaultValues: {
    name: "", email: "", password: "", role: UserRole.STUDENT, programId: "", matricNumber: "", level: 100, departmentId: "",
  } });
  const role = useWatch({ control: form.control, name: "role" });
  const mutation = useMutation({ mutationFn: createAdminUser, onSuccess: async (): Promise<void> => {
    form.reset(); await Promise.all([client.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }), client.invalidateQueries({ queryKey: ADMIN_DASHBOARD_QUERY_KEY }), client.invalidateQueries({ queryKey: ADMIN_OPTIONS_QUERY_KEY })]);
  } });
  return <section className="adminPanel adminUserCreate"><div className="adminPanelHead"><span><Icon name="user" /></span><div><h2>Create a user account</h2></div></div>
    <form onSubmit={form.handleSubmit((input): void => mutation.mutate(input))} noValidate>
      <label>Account type<select {...form.register("role")}><option value={UserRole.STUDENT}>Student</option><option value={UserRole.LECTURER}>Lecturer</option><option value={UserRole.ADMIN}>Administrator</option></select></label>
      <div className="adminFormRow"><label>Full name<input autoComplete="name" placeholder="Ada Mensah" aria-invalid={!!form.formState.errors.name} {...form.register("name")} /><FieldError id="user-name-error" message={form.formState.errors.name?.message} /></label><label>Email address<input type="email" autoComplete="off" placeholder="ada@university.edu" aria-invalid={!!form.formState.errors.email} {...form.register("email")} /><FieldError id="user-email-error" message={form.formState.errors.email?.message} /></label></div>
      <label>Initial password<input type="password" autoComplete="new-password" placeholder="At least 12 characters" aria-invalid={!!form.formState.errors.password} {...form.register("password")} /><FieldError id="user-password-error" message={form.formState.errors.password?.message} /></label>
      {role === UserRole.STUDENT && <><label>Programme<select aria-invalid={!!form.formState.errors.programId} {...form.register("programId")}><option value="">Select programme</option>{options.programs.map((program) => <option key={program.id} value={program.id}>{program.code} · {program.name}</option>)}</select></label><div className="adminFormRow"><label>Matriculation number<input autoCapitalize="characters" placeholder="UEMP/CSC/2026/001" aria-invalid={!!form.formState.errors.matricNumber} {...form.register("matricNumber")} /></label><label>Academic level<select {...form.register("level", { valueAsNumber: true })}>{[100,200,300,400,500,600].map((level) => <option key={level}>{level}</option>)}</select></label></div></>}
      {role === UserRole.LECTURER && <label>Department<select aria-invalid={!!form.formState.errors.departmentId} {...form.register("departmentId")}><option value="">Select department</option>{options.departments.map((department) => <option key={department.id} value={department.id}>{department.code} · {department.name}</option>)}</select></label>}
      {form.formState.errors.root?.message && <p className="adminFormError" role="alert">{form.formState.errors.root.message}</p>}
      {mutation.isError && <p className="adminFormError" role="alert">{apiErrorMessage(mutation.error)}</p>}
      {mutation.isSuccess && <p className="adminFormSuccess" role="status">User account and academic assignment created.</p>}
      <button className="button button-green" disabled={mutation.isPending}>{mutation.isPending ? "Creating account…" : "Create user account"}<Icon name="arrow" /></button>
    </form>
  </section>;
}

function UserRow({ user, currentUserId, selectPasswordReset }: { user: AdminUser; currentUserId: string; selectPasswordReset: (user: AdminUser) => void }): ReactElement {
  const client = useQueryClient();
  const refresh = async (): Promise<void> => { await client.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }); };
  const status = useMutation({ mutationFn: updateAdminUserStatus, onSuccess: refresh });
  const sessions = useMutation({ mutationFn: revokeAdminUserSessions, onSuccess: refresh });
  const isCurrentUser = user.id === currentUserId;
  const assignment = user.student ? `${user.student.program.code} · Level ${user.student.level} · ${user.student.matricNumber}`
    : user.lecturer ? user.lecturer.department.name : "Administration";
  return <article className="adminUserRow">
    <div className="adminUserIdentity"><strong>{user.name}</strong><span>{user.email}</span><small>{assignment}</small></div>
    <span className="adminRoleTag">{user.role === UserRole.ADMIN ? "Administrator" : user.role === UserRole.LECTURER ? "Lecturer" : "Student"}</span>
    <span className={`adminAccountStatus adminAccountStatus${user.status}`}>{user.status.toLowerCase()}</span>
    <span className="adminSessionCount">{user._count.sessions} active {user._count.sessions === 1 ? "session" : "sessions"}</span>
    <div className="adminUserActions">{isCurrentUser ? <span className="adminCurrentAccount">Current account</span> : <>{user.status === UserStatus.ACTIVE ? <><button disabled={status.isPending} onClick={(): void => status.mutate({ userId: user.id, status: UserStatus.SUSPENDED })}>Suspend</button><button disabled={status.isPending} onClick={(): void => status.mutate({ userId: user.id, status: UserStatus.INACTIVE })}>Deactivate</button></> : <button disabled={status.isPending} onClick={(): void => status.mutate({ userId: user.id, status: UserStatus.ACTIVE })}>Activate</button>}<button disabled={sessions.isPending || user._count.sessions === 0} onClick={(): void => sessions.mutate(user.id)}>{sessions.isPending ? "Revoking…" : "Revoke sessions"}</button><button onClick={(): void => selectPasswordReset(user)}>Reset password</button></>}</div>
    {(status.error || sessions.error) && <p className="adminUserError" role="alert">{apiErrorMessage(status.error ?? sessions.error)}</p>}
  </article>;
}

function PasswordReset({ user, close }: { user: AdminUser; close: () => void }): ReactElement {
  const client = useQueryClient();
  const form = useForm<AdminUserPasswordInput>({ resolver: zodResolver(adminUserPasswordInputSchema), defaultValues: { password: "" } });
  const mutation = useMutation({ mutationFn: (input: AdminUserPasswordInput) => resetAdminUserPassword({ userId: user.id, ...input }), onSuccess: async (): Promise<void> => {
    form.reset(); await client.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
  } });
  return <section className="adminPasswordReset" aria-labelledby="password-reset-title"><div><h2 id="password-reset-title">Reset {user.name}’s password</h2><p>This immediately revokes every active session for the account.</p></div><form onSubmit={form.handleSubmit((input): void => mutation.mutate(input))} noValidate><label>New password<input type="password" autoComplete="new-password" aria-invalid={!!form.formState.errors.password} {...form.register("password")} /><FieldError id="reset-password-error" message={form.formState.errors.password?.message} /></label>{mutation.isError && <p className="adminFormError" role="alert">{apiErrorMessage(mutation.error)}</p>}{mutation.isSuccess && <p className="adminFormSuccess" role="status">Password reset and sessions revoked.</p>}<div><button className="button adminRejectButton" type="button" onClick={close}>Close</button><button className="button button-green" disabled={mutation.isPending}>{mutation.isPending ? "Resetting…" : "Reset password"}</button></div></form></section>;
}

function UserManagement({ options }: { options: AdminOptions }): ReactElement {
  const [draftSearch, setDraftSearch] = useState("");
  const [filters, setFilters] = useState<{ search: string; role: UserRole | ""; status: UserStatus | "" }>({ search: "", role: "", status: "" });
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const users = useInfiniteQuery({ queryKey: [...ADMIN_USERS_QUERY_KEY, filters], queryFn: ({ pageParam, signal }) => getAdminUsers(filters, pageParam, signal), initialPageParam: null as string | null, getNextPageParam: (page) => page.nextCursor });
  const items = users.data?.pages.flatMap((page) => page.items) ?? [];
  const currentUserId = users.data?.pages[0].currentUserId;
  return <><div className="adminUsersGrid"><UserCreateForm options={options} /><section className="adminUserDirectory" aria-labelledby="user-directory-title"><div className="adminSectionHead"><div><h2 id="user-directory-title">User directory</h2><p>{items.length} accounts loaded</p></div></div>
    <div className="adminUserFilters"><label><span>Search accounts</span><input value={draftSearch} onChange={(event): void => setDraftSearch(event.target.value)} placeholder="Name, email, or matric number" /></label><label><span>Role</span><select value={filters.role} onChange={(event): void => setFilters((current) => ({ ...current, role: event.target.value as UserRole | "" }))}><option value="">All roles</option><option value={UserRole.STUDENT}>Students</option><option value={UserRole.LECTURER}>Lecturers</option><option value={UserRole.ADMIN}>Administrators</option></select></label><label><span>Status</span><select value={filters.status} onChange={(event): void => setFilters((current) => ({ ...current, status: event.target.value as UserStatus | "" }))}><option value="">All statuses</option><option value={UserStatus.ACTIVE}>Active</option><option value={UserStatus.SUSPENDED}>Suspended</option><option value={UserStatus.INACTIVE}>Inactive</option></select></label><button className="button button-green" onClick={(): void => setFilters((current) => ({ ...current, search: draftSearch.trim() }))}>Search</button></div>
    {users.isPending ? <div className="adminInlineLoading" role="status">Loading user accounts…</div> : users.error || !currentUserId ? <p className="adminFormError" role="alert">{apiErrorMessage(users.error)}</p> : items.length === 0 ? <div className="adminEmpty"><Icon name="user" /><h3>No matching accounts</h3><p>Adjust the filters or create a new user account.</p></div> : <div className="adminUserList">{items.map((user) => <UserRow key={user.id} user={user} currentUserId={currentUserId} selectPasswordReset={setPasswordUser} />)}</div>}
    {users.hasNextPage && <button className="resultsLoadMore" disabled={users.isFetchingNextPage} onClick={(): void => { void users.fetchNextPage(); }}>{users.isFetchingNextPage ? "Loading…" : "Load more accounts"}</button>}
  </section></div>{passwordUser && <PasswordReset user={passwordUser} close={(): void => setPasswordUser(null)} />}</>;
}

const pageCopy = {
  dashboard: { title: "Manage the course cycle.", description: "Review institutional activity and move into a focused administration workspace." },
  courses: { title: "Course catalogue.", description: "Create and review the department-owned courses used across programmes." },
  offerings: { title: "Semester offerings.", description: "Publish catalogue courses for a programme, level, semester, and lecturer." },
  results: { title: "Result approval.", description: "Review submitted lecturer batches before results become visible to students." },
  users: { title: "User management.", description: "Create role-aware accounts, maintain access status, and protect active sessions." },
} as const;

export function AdminDashboardScreen({ view = "dashboard" }: { view?: AdminView }): ReactElement {
  const [navOpen, setNavOpen] = useState(false); const router = useRouter(); const client = useQueryClient();
  const menuButton = useRef<HTMLButtonElement>(null); const closeButton = useRef<HTMLButtonElement>(null); const sidebar = useRef<HTMLElement>(null);
  const dashboard = useQuery({ queryKey: ADMIN_DASHBOARD_QUERY_KEY, queryFn: ({ signal }) => getAdminDashboard(signal) });
  const options = useQuery({ queryKey: ADMIN_OPTIONS_QUERY_KEY, queryFn: ({ signal }) => getAdminOptions(signal) });
  const logout = useMutation({ mutationFn: signOut, onSuccess: async (): Promise<void> => { await replaceSession(client, null); router.replace("/login"); } });
  const closeNav = (): void => { setNavOpen(false); requestAnimationFrame((): void => menuButton.current?.focus()); };
  useEffect((): (() => void) | undefined => {
    if (!navOpen) return undefined;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") { closeNav(); return; }
      if (event.key !== "Tab" || !sidebar.current) return;
      const focusable = [...sidebar.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKeyDown); return (): void => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);
  const error = dashboard.error ?? options.error;
  if (dashboard.isPending || options.isPending) return <div className="adminLoading" role="status"><div><span /><p>Loading administration workspace…</p></div></div>;
  if (error || !dashboard.data || !options.data) { const denied = axios.isAxiosError(error) && [401,403].includes(error.response?.status ?? 0); return <main className="adminState"><div><Icon name={denied ? "lock" : "help"} /><h1>{denied ? "Administrator access required" : "We couldn’t load administration"}</h1><p>{denied ? "Sign in with an active administrator account to continue." : apiErrorMessage(error)}</p><Link className="button button-green" href="/login">Go to sign in</Link></div></main>; }
  const copy = pageCopy[view];
  return <div className="adminShell"><a className="skip-link" href="#admin-main">Skip to dashboard content</a><Sidebar open={navOpen} close={closeNav} closeRef={closeButton} sidebarRef={sidebar} view={view} /><div className="adminWorkspace" inert={navOpen ? true : undefined}>
    <header className="adminTopbar"><button ref={menuButton} className="adminMenu" onClick={(): void => setNavOpen(true)} aria-label="Open navigation" aria-controls="admin-navigation" aria-expanded={navOpen}><Icon name="menu" /></button><div><Icon name="grid" />Administration portal</div><button className="adminSignOut" onClick={(): void => logout.mutate()} disabled={logout.isPending}><Icon name="logout" />{logout.isPending ? "Signing out…" : "Sign out"}</button></header>
    {logout.isError && <p className="adminLogoutError" role="alert">{apiErrorMessage(logout.error)}</p>}
    <main className="adminMain" id="admin-main"><div className="adminWelcome"><div><h1>{copy.title}</h1><span>{copy.description}</span></div><span className="adminStatus"><i />{dashboard.data.activeSemester?.registrationOpen ? "Registration open" : "Registration closed"}</span></div>
      {view === "dashboard" && <Overview dashboard={dashboard.data} />}{view === "courses" && <CourseCatalogue options={options.data} />}{view === "offerings" && <OfferingManagement options={options.data} dashboard={dashboard.data} />}{view === "results" && <ResultApproval />}{view === "users" && <UserManagement options={options.data} />}
    </main></div></div>;
}
