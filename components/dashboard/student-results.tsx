"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { Icon } from "@/components/ui/icon";
import { StudentPageError, StudentPortalFrame } from "@/components/dashboard/student-dashboard";
import {
  getStudentDashboard,
  getStudentHistory,
  getStudentResultStatement,
  getStudentResults,
  STUDENT_DASHBOARD_QUERY_KEY,
  STUDENT_HISTORY_QUERY_KEY,
  STUDENT_RESULTS_QUERY_KEY,
} from "@/features/student/api";
import type { StudentResult } from "@/shared/student";

type ResultsView = "results" | "history";

function termLabel(term: "FIRST" | "SECOND"): string {
  return term === "FIRST" ? "First semester" : "Second semester";
}

function ResultsPrintout({ name, matricNumber, program, level, pages }: {
  name: string; matricNumber: string; program: string; level: number;
  pages: Awaited<ReturnType<typeof getStudentResults>>[];
}): ReactElement {
  const items = pages.flatMap((page) => page.items);
  const summary = pages[0].summary;
  return <section className="printOnly printDocument" aria-label="Printable approved result statement">
    <header className="printBrand"><div><Icon name="book" /><strong>UEMP</strong></div><p>University Education Management Portal</p></header>
    <div className="printTitle"><h1>Approved result statement</h1><p>Student copy · Generated {new Date().toLocaleDateString()}</p></div>
    <dl className="printIdentity"><div><dt>Student</dt><dd>{name}</dd></div><div><dt>Matriculation number</dt><dd>{matricNumber}</dd></div><div><dt>Programme</dt><dd>{program}</dd></div><div><dt>Current level</dt><dd>{level}</dd></div></dl>
    <table className="printTable"><thead><tr><th>Course</th><th>Session</th><th>CA</th><th>Exam</th><th>Total</th><th>Grade</th><th>Units</th></tr></thead><tbody>
      {items.map((result) => <tr key={result.id}><td><strong>{result.registration.offering.course.code}</strong><br />{result.registration.offering.course.title}</td><td>{result.registration.offering.semester.session.name}<br />{termLabel(result.registration.offering.semester.term)}</td><td>{result.caScore}</td><td>{result.examScore}</td><td>{result.totalScore}</td><td>{result.grade}</td><td>{result.registration.creditUnitsSnapshot}</td></tr>)}
    </tbody></table>
    <dl className="printTotals"><div><dt>Cumulative GPA</dt><dd>{summary.gpa?.toFixed(2) ?? "Not available"}</dd></div><div><dt>Attempted units</dt><dd>{summary.attemptedUnits}</dd></div><div><dt>Weighted points</dt><dd>{summary.gradePoints}</dd></div></dl>
    <p className="printDisclaimer">This statement contains approved results only and is not a certified transcript.</p>
  </section>;
}

function ResultRow({ result, labelled = false }: { result: StudentResult; labelled?: boolean }): ReactElement {
  const course = result.registration.offering.course;
  return <article className={`resultRow ${labelled ? "resultRowLabelled" : ""}`}>
    <span className="courseCode">{course.code}</span>
    <span className="resultCourse"><strong>{course.title}</strong><small>{result.registration.creditUnitsSnapshot} {result.registration.creditUnitsSnapshot === 1 ? "unit" : "units"}</small></span>
    <span><small>CA</small><strong>{result.caScore}</strong></span>
    <span><small>Exam</small><strong>{result.examScore}</strong></span>
    <span><small>Total</small><strong>{result.totalScore}</strong></span>
    <span className={result.grade === "F" ? "gradeFail" : "gradePass"}><small>Grade</small><strong>{result.grade}</strong></span>
  </article>;
}

function SummaryStrip({ gpa, attemptedUnits, gradePoints, label }: {
  gpa: number | null; attemptedUnits: number; gradePoints: number; label: string;
}): ReactElement {
  return <section className="resultSummary" aria-label={label}>
    <div><span>{label}</span><strong>{gpa?.toFixed(2) ?? "—"}</strong></div>
    <div><span>Attempted units</span><strong>{attemptedUnits}</strong></div>
    <div><span>Weighted points</span><strong>{gradePoints}</strong></div>
    <p><Icon name="check" /> Approved results only</p>
  </section>;
}

function LoadMore({ pending, action, label }: { pending: boolean; action: () => void; label: string }): ReactElement {
  return <button className="resultsLoadMore" disabled={pending} onClick={action}>{pending ? "Loading…" : label}</button>;
}

function PaginationError({ action }: { action: () => void }): ReactElement {
  return <p className="resultsPageError" role="alert">We couldn’t load the next page. Your loaded records are still available. <button onClick={action}>Try again</button></p>;
}

export function StudentResultsScreen({ view }: { view: ResultsView }): ReactElement {
  const [printStatement, setPrintStatement] = useState<Awaited<ReturnType<typeof getStudentResultStatement>> | null>(null);
  const dashboard = useQuery({ queryKey: STUDENT_DASHBOARD_QUERY_KEY, queryFn: ({ signal }) => getStudentDashboard(signal) });
  const results = useInfiniteQuery({
    queryKey: STUDENT_RESULTS_QUERY_KEY,
    queryFn: ({ pageParam, signal }) => getStudentResults(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: view === "results",
  });
  const history = useInfiniteQuery({
    queryKey: STUDENT_HISTORY_QUERY_KEY,
    queryFn: ({ pageParam, signal }) => getStudentHistory(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: view === "history",
  });
  const statement = useQuery({
    queryKey: [...STUDENT_RESULTS_QUERY_KEY, "print"],
    queryFn: ({ signal }) => getStudentResultStatement(signal),
    enabled: false,
  });
  const pending = dashboard.isPending || (view === "results" ? results.isPending : history.isPending);
  if (pending) return <div className="loading" role="status"><span /><p>Loading your academic record…</p></div>;
  if (dashboard.error || !dashboard.data) return <StudentPageError error={dashboard.error} title="We couldn’t load your academic record" onRetry={(): void => { void dashboard.refetch(); }} />;
  if (view === "results") {
    if (!results.data) return <StudentPageError error={results.error} title="We couldn’t load your results" onRetry={(): void => { void results.refetch(); }} />;
    const summary = results.data.pages[0].summary;
    const print = async (): Promise<void> => {
      const response = await statement.refetch();
      if (!response.data) return;
      setPrintStatement(response.data);
      requestAnimationFrame((): void => { requestAnimationFrame((): void => window.print()); });
    };
    return <StudentPortalFrame name={dashboard.data.student.user.name} activeHref="/student/results">
      <main className="main coursePage resultsPage" id="main-content">
        <ResultsHeader view="results" program={dashboard.data.student.program.code} level={dashboard.data.student.level} onPrint={results.data.pages.some((page) => page.items.length > 0) ? (): void => { void print(); } : undefined} printing={statement.isFetching} />
        <SummaryStrip gpa={summary.gpa} attemptedUnits={summary.attemptedUnits} gradePoints={summary.gradePoints} label="Cumulative GPA" />
        <ResultsList pages={results.data.pages} />
        {results.isFetchNextPageError && <PaginationError action={(): void => { void results.fetchNextPage(); }} />}
        {results.hasNextPage && <LoadMore label="Load more results" pending={results.isFetchingNextPage} action={(): void => { void results.fetchNextPage(); }} />}
        {statement.isError && <p className="resultsPageError screenOnly" role="alert">We couldn’t prepare the complete result statement. Please try again.</p>}
        <ResultsPrintout name={dashboard.data.student.user.name} matricNumber={dashboard.data.student.matricNumber} program={dashboard.data.student.program.name} level={dashboard.data.student.level} pages={printStatement ? [printStatement] : results.data.pages} />
      </main>
    </StudentPortalFrame>;
  }
  if (!history.data) return <StudentPageError error={history.error} title="We couldn’t load your academic history" onRetry={(): void => { void history.refetch(); }} />;
  const summary = history.data.pages[0].cumulative;
  return <StudentPortalFrame name={dashboard.data.student.user.name} activeHref="/student/history">
    <main className="main coursePage resultsPage" id="main-content">
      <ResultsHeader view="history" program={dashboard.data.student.program.code} level={dashboard.data.student.level} printing={false} />
      <SummaryStrip gpa={summary.gpa} attemptedUnits={summary.attemptedUnits} gradePoints={summary.gradePoints} label="Cumulative GPA" />
      <HistoryList pages={history.data.pages} />
      {history.isFetchNextPageError && <PaginationError action={(): void => { void history.fetchNextPage(); }} />}
      {history.hasNextPage && <LoadMore label="Load more semesters" pending={history.isFetchingNextPage} action={(): void => { void history.fetchNextPage(); }} />}
    </main>
  </StudentPortalFrame>;
}

function ResultsHeader({ view, program, level, onPrint, printing }: { view: ResultsView; program: string; level: number; onPrint?: () => void; printing: boolean }): ReactElement {
  return <header className="resultsHeader screenOnly"><div><h1>{view === "results" ? "Approved results" : "Academic history"}</h1><p>{view === "results" ? "Review the grades released to your academic record." : "Follow your approved performance across semesters."}</p></div><div className="resultsHeaderActions"><span className="sessionPill"><Icon name="graduation" /> {program} · Level {level}</span>{onPrint && <button className="printButton" type="button" disabled={printing} onClick={onPrint}><Icon name="print" />{printing ? "Preparing statement…" : "Print result statement"}</button>}</div></header>;
}

function ResultsList({ pages }: { pages: Awaited<ReturnType<typeof getStudentResults>>[] }): ReactElement {
  const items = pages.flatMap((page) => page.items);
  if (items.length === 0) return <section className="emptyState resultsEmpty"><Icon name="chart" /><h2>No approved results yet</h2><p>Results will appear here after your lecturer submits them and an administrator approves them.</p></section>;
  return <section className="resultsTable" aria-label="Approved results">
    <div className="resultsTableHeader"><span>Code</span><span>Course</span><span>CA</span><span>Exam</span><span>Total</span><span>Grade</span></div>
    {items.map((result) => <ResultRow result={result} key={result.id} />)}
  </section>;
}

function HistoryList({ pages }: { pages: Awaited<ReturnType<typeof getStudentHistory>>[] }): ReactElement {
  const semesters = pages.flatMap((page) => page.items);
  if (semesters.length === 0) return <section className="emptyState resultsEmpty"><Icon name="history" /><h2>No academic history yet</h2><p>Your semester history will appear after your first results are approved.</p></section>;
  return <section className="historyList" aria-label="Academic history">
    {semesters.map((group, index) => <details key={`${group.semester.id}-${index}`} open={index === 0}>
      <summary><span><strong>{group.semester.session.name}</strong><small>{termLabel(group.semester.term)}</small></span><span><b>{group.summary.gpa?.toFixed(2) ?? "—"}</b> GPA</span><Icon name="chevron" /></summary>
      <div className="historySummary"><span>{group.grades.length} {group.grades.length === 1 ? "course" : "courses"}</span><span>{group.summary.attemptedUnits} attempted units</span><span>{group.summary.gradePoints} weighted points</span></div>
      <div className="historyGrades">{group.grades.map((result) => <ResultRow result={result} labelled key={result.id} />)}</div>
    </details>)}
  </section>;
}
