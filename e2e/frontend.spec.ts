import { expect, test } from "@playwright/test";

const user = {
  id: "browser-demo",
  email: "student@example.test",
  name: "Demo Student",
  role: "STUDENT",
  status: "ACTIVE",
};

test("landing navigation, linked guides, and responsive layout", async ({
  page,
}): Promise<void> => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your next chapter",
  );
  await page.getByRole("button", { name: "Next welcome slide" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A place to learn",
  );
  await page
    .getByRole("link", { name: "Learn more", exact: true })
    .first()
    .click();
  await expect(page.locator("#guide-registration")).toHaveAttribute("open", "");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        (): boolean =>
          document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("link", { name: "Student services", exact: true })
    .first()
    .focus();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
});

test("student dashboard is responsive and keeps academic data scannable", async ({ page }): Promise<void> => {
  let algorithmsRegistered = false;
  await page.route("**/api/student/dashboard", async (route): Promise<void> => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      statusCode: 200, message: "Student dashboard loaded.", payload: {
        student: { id: "student-a", matricNumber: "UEMP/CSC/2026/001", level: 200,
          phone: null, address: null, user: { name: "Okechukwu David", email: "student@example.test" },
          program: { id: "program", code: "BSC-CS", name: "Computer Science",
            department: { id: "department", code: "CSC", name: "Computer Science",
              faculty: { id: "faculty", code: "SCI", name: "Faculty of Science" } } } },
        activeSemester: { id: "semester", term: "FIRST", registrationOpen: true,
          session: { id: "session", name: "2026/2027" } },
        registeredUnits: 15,
        academicSummary: { attemptedUnits: 18, gradePoints: 78, gpa: 4.33 },
      },
    }) });
  });
  await page.route("**/api/student/registrations?limit=4&semesterId=semester", async (route): Promise<void> => {
    const courses = [
      ["CSC201", "Data Structures and Algorithms", 3],
      ["CSC203", "Database Systems", 3],
      ["MTH201", "Discrete Mathematics", 3],
    ];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      statusCode: 200, message: "Registrations loaded.", payload: { nextCursor: null,
        items: courses.map(([code, title, units], index) => ({ id: `registration-${index}`,
          registeredAt: "2026-11-11T08:00:00.000Z", creditUnitsSnapshot: units,
          offering: { id: `offering-${index}`, course: { code, title }, semester: {
            id: "semester", term: "FIRST", session: { id: "session", name: "2026/2027" },
          } } })) },
    }) });
  });
  await page.route("**/api/student/courses?limit=50", async (route): Promise<void> => route.fulfill({ json: { statusCode: 200, message: "Eligible courses loaded.", payload: { nextCursor: null, items: [
    { id: "offering-algorithms", creditUnits: 3, registered: algorithmsRegistered, course: { code: "CSC205", title: "Algorithm Design" }, lecturer: { user: { name: "Dr Ada Mensah" } }, semester: { id: "semester", term: "FIRST", registrationOpen: true, session: { id: "session", name: "2026/2027" } } },
    { id: "offering-web", creditUnits: 2, registered: false, course: { code: "CSC207", title: "Web Engineering" }, lecturer: null, semester: { id: "semester", term: "FIRST", registrationOpen: true, session: { id: "session", name: "2026/2027" } } },
  ] } } }));
  await page.route("**/api/student/registrations", async (route): Promise<void> => {
    if (route.request().method() === "POST") algorithmsRegistered = true;
    await route.fulfill({ json: { statusCode: 200, message: "Courses registered successfully.", payload: [] } });
  });
  await page.route("**/api/student/registrations?limit=50&semesterId=semester", async (route): Promise<void> => {
    const items = algorithmsRegistered ? [{
      id: "registration-algorithms", registeredAt: "2026-11-11T08:00:00.000Z", creditUnitsSnapshot: 3,
      offering: { id: "offering-algorithms", course: { code: "CSC205", title: "Algorithm Design" },
        semester: { id: "semester", term: "FIRST", session: { id: "session", name: "2026/2027" } } },
    }] : [];
    await route.fulfill({ json: { statusCode: 200, message: "Registrations loaded.", payload: { nextCursor: null, items } } });
  });
  await page.route("**/api/student/registrations/registration-algorithms", async (route): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    algorithmsRegistered = false;
    await route.fulfill({ json: { statusCode: 200, message: "Course withdrawn successfully.", payload: { id: "registration-algorithms" } } });
  });
  const approvedResult = { id: "result-algorithms", caScore: 27, examScore: 51, totalScore: 78, grade: "A", gradePoint: 5,
    registration: { creditUnitsSnapshot: 3, offering: { course: { code: "CSC201", title: "Data Structures and Algorithms" }, semester: {
      id: "semester", term: "FIRST", session: { id: "session", name: "2026/2027" },
    } } } };
  await page.route("**/api/student/results?limit=20", async (route): Promise<void> => route.fulfill({ json: { statusCode: 200, message: "Approved results loaded.", payload: {
    items: [approvedResult], nextCursor: "next-result", summary: { attemptedUnits: 3, gradePoints: 15, gpa: 5 },
  } } }));
  await page.route("**/api/student/results?limit=20&cursor=next-result", async (route): Promise<void> => route.fulfill({ status: 503, json: { statusCode: 503, code: "TEMPORARY_ERROR", message: "Results are temporarily unavailable." } }));
  await page.route("**/api/student/history?limit=20", async (route): Promise<void> => route.fulfill({ json: { statusCode: 200, message: "Academic history loaded.", payload: {
    items: [{ semester: approvedResult.registration.offering.semester, grades: [approvedResult], summary: { attemptedUnits: 3, gradePoints: 15, gpa: 5 } }],
    nextCursor: "next-semester", cumulative: { attemptedUnits: 3, gradePoints: 15, gpa: 5 },
  } } }));

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/student/dashboard");
  await expect(page.getByRole("heading", { name: "Welcome back, Okechukwu." })).toBeVisible();
  await expect(page.getByText("Data Structures and Algorithms")).toBeVisible();
  expect(await page.getByRole("complementary", { name: "Student navigation" }).evaluate((element): string => getComputedStyle(element).position)).toBe("fixed");
  expect(await page.evaluate((): boolean => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: ".impeccable/review/dashboard-desktop.png", fullPage: true });

  await page.getByRole("link", { name: "Course registration" }).click();
  await expect(page).toHaveURL(/\/student\/courses$/);
  await page.getByText("Algorithm Design").click();
  await expect(page.getByText("3 units", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Register selected courses" }).click();
  await expect(page.getByText("Registered", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: ".impeccable/review/student-courses-desktop.png", fullPage: true });
  await page.getByRole("link", { name: "Registered courses" }).click();
  await expect(page.getByRole("heading", { name: "Registered courses" })).toBeVisible();
  await page.screenshot({ path: ".impeccable/review/student-registrations-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Withdraw" }).click();
  await expect(page.getByRole("button", { name: "Withdrawing…" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No registered courses" })).toBeVisible();
  await page.getByRole("link", { name: "Results" }).click();
  await expect(page).toHaveURL(/\/student\/results$/);
  await expect(page.getByRole("heading", { name: "Approved results" })).toBeVisible();
  await expect(page.getByText("Data Structures and Algorithms")).toBeVisible();
  await expect(page.getByText("5.00")).toBeVisible();
  await page.getByRole("button", { name: "Load more results" }).click();
  await expect(page.getByText("Your loaded records are still available.", { exact: false })).toBeVisible();
  await expect(page.getByText("Data Structures and Algorithms")).toBeVisible();
  await page.goto("/student/results");
  await expect(page.getByRole("heading", { name: "Approved results" })).toBeVisible();
  await page.screenshot({ path: ".impeccable/review/student-results-desktop.png", fullPage: true });
  await page.getByRole("link", { name: "Academic history" }).click();
  await expect(page).toHaveURL(/\/student\/history$/);
  await expect(page.getByRole("heading", { name: "Academic history" })).toBeVisible();
  await expect(page.getByText("First semester")).toBeVisible();
  await expect(page.getByRole("button", { name: "Load more semesters" })).toBeVisible();
  await page.goto("/student/history");
  await expect(page.getByRole("heading", { name: "Academic history" })).toBeVisible();
  await page.screenshot({ path: ".impeccable/review/student-history-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/student/results");
  await expect(page.getByRole("heading", { name: "Approved results" })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog", { name: "Student navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close navigation" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  expect(await page.evaluate((): boolean => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: ".impeccable/review/student-results-mobile.png", fullPage: true });
});

test("admin dashboard publishes academic records and adapts to mobile", async ({ page }): Promise<void> => {
  const semester = { id: "semester", term: "FIRST", isActive: true, registrationOpen: true, session: { id: "session", name: "2026/2027" } };
  const batch = { id: "batch", status: "SUBMITTED", submittedAt: "2026-11-11T10:00:00.000Z", feedback: null, submitter: { name: "Dr Ada Mensah" },
    offering: { id: "offering", level: 200, course: { code: "CSC201", title: "Data Structures" }, program: { code: "BSC-CS", name: "Computer Science" },
      semester: { term: "FIRST", session: { name: "2026/2027" } }, _count: { registrations: 1 } }, _count: { results: 1 } };
  const secondBatch = { ...batch, id: "batch-2", submitter: { name: "Dr Tunde Okafor" }, offering: { ...batch.offering, course: { code: "CSC203", title: "Database Systems" } } };
  await page.route("**/api/admin/dashboard", async (route): Promise<void> => { await new Promise((resolve) => setTimeout(resolve, 250)); await route.fulfill({ json: { payload: {
    counts: { courses: 18, offerings: 12, students: 486, lecturers: 24 }, activeSemester: semester,
    recentOfferings: [{ id: "offering", level: 200, creditUnits: 3, course: { id: "course", code: "CSC201", title: "Data Structures" }, semester,
      program: { id: "program", code: "BSC-CS", name: "Computer Science" }, lecturer: { id: "lecturer", user: { name: "Dr Ada Mensah" } }, _count: { registrations: 42 } }],
  } } }); });
  await page.route("**/api/admin/options", async (route): Promise<void> => route.fulfill({ json: { payload: {
    departments: [{ id: "department", code: "CSC", name: "Computer Science" }],
    programs: [{ id: "program", departmentId: "department", code: "BSC-CS", name: "Computer Science" }],
    semesters: [semester], lecturers: [{ id: "lecturer", departmentId: "department", user: { name: "Dr Ada Mensah" } }],
    courses: [{ id: "course", code: "CSC201", title: "Data Structures", defaultCreditUnits: 3, department: { id: "department", code: "CSC", name: "Computer Science" } }],
  } } }));
  await page.route("**/api/admin/courses", async (route): Promise<void> => route.fulfill({ json: { payload: {} } }));
  await page.route("**/api/admin/result-batches?status=SUBMITTED&limit=50", async (route): Promise<void> => route.fulfill({ json: { payload: { items: [batch, secondBatch], nextCursor: null } } }));
  await page.route("**/api/admin/result-batches/batch", async (route): Promise<void> => route.fulfill({ json: { payload: { ...batch, reviewer: null, reviewedAt: null, results: [
    { id: "result", caScore: 25, examScore: 50, totalScore: 75, grade: "A", gradePoint: 5, registration: { id: "registration", student: { matricNumber: "UEMP/001", user: { name: "Student One" } } } },
  ] } } }));
  await page.route("**/api/admin/result-batches/batch-2", async (route): Promise<void> => route.fulfill({ json: { payload: { ...secondBatch, reviewer: null, reviewedAt: null, results: [] } } }));
  let approved = false;
  await page.route("**/api/admin/result-batches/batch/approve", async (route): Promise<void> => { approved = true; await route.fulfill({ json: { payload: { id: "batch", status: "APPROVED", reviewedAt: "2026-11-11T12:00:00.000Z", feedback: null } } }); });

  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto("/admin/dashboard");
  const loading = page.locator(".adminLoading"); await expect(loading).toContainText("Loading administration workspace…");
  const loadingBox = await loading.boundingBox(); expect(loadingBox?.width).toBe(1440); expect(loadingBox?.height).toBe(1000);
  await expect(page.getByRole("heading", { name: "Manage the course cycle." })).toBeVisible();
  await expect(page.getByText("Data Structures", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Course catalogue" }).click(); await expect(page).toHaveURL(/\/admin\/courses$/);
  await expect(page.getByText("Who sets the course units?")).toBeVisible();
  await page.getByLabel("Department").selectOption("department"); await page.getByLabel("Course code").fill("CSC203"); await page.getByLabel("Default credit units").fill("4"); await page.getByLabel("Course title").fill("Database Systems");
  await page.getByRole("button", { name: "Create course" }).click(); await expect(page.getByText(/Course added\./)).toBeVisible();
  await page.getByRole("complementary", { name: "Administration navigation" }).getByRole("link", { name: "Semester offerings" }).click(); await expect(page).toHaveURL(/\/admin\/offerings$/); await expect(page.getByRole("heading", { name: "Publish an offering" })).toBeVisible();
  await page.getByRole("link", { name: "Result approval" }).click(); await expect(page).toHaveURL(/\/admin\/results$/); await expect(page.getByRole("heading", { name: "CSC201 result sheet" })).toBeVisible();
  await page.getByLabel("Rejection feedback").fill("Please verify this result before approval."); await page.getByRole("button", { name: /CSC203 Database Systems/ }).click();
  await expect(page.getByRole("heading", { name: "CSC203 result sheet" })).toBeVisible(); await expect(page.getByLabel("Rejection feedback")).toHaveValue("");
  await page.getByRole("button", { name: /CSC201 Data Structures/ }).click();
  await page.getByRole("button", { name: "Approve results" }).click(); await expect.poll((): boolean => approved).toBe(true);
  expect(await page.evaluate((): boolean => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".impeccable/review/admin-results-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 }); await page.reload();
  await page.getByRole("button", { name: "Open navigation" }).click(); await expect(page.getByRole("dialog", { name: "Administration navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close navigation" })).toBeFocused();
  await expect.poll(async (): Promise<number> => page.getByRole("dialog", { name: "Administration navigation" }).evaluate((element): number => element.getBoundingClientRect().left)).toBe(0);
  expect(await page.evaluate((): boolean => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".impeccable/review/admin-results-mobile.png", fullPage: true });
  await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
});

test("lecturer dashboard saves a result draft and remains usable on mobile", async ({ page }): Promise<void> => {
  const offering = { id: "offering", level: 200, creditUnits: 3, course: { code: "CSC201", title: "Data Structures and Algorithms" },
    program: { code: "BSC-CS", name: "Computer Science" }, semester: { id: "semester", term: "FIRST", isActive: true, session: { name: "2026/2027" } },
    resultBatches: [], _count: { registrations: 2 } };
  const secondOffering = { ...offering, id: "offering-2", course: { code: "CSC203", title: "Operating Systems" }, _count: { registrations: 0 } };
  await page.route("**/api/lecturer/dashboard", async (route): Promise<void> => route.fulfill({ json: { payload: {
    lecturer: { id: "lecturer", user: { name: "Ada Mensah", email: "ada@example.test" }, department: { code: "CSC", name: "Computer Science" } },
    offerings: [offering, secondOffering], summary: { assignedCourses: 2, registeredStudents: 2, submittedBatches: 0 },
  } } }));
  await page.route("**/api/lecturer/offerings/offering", async (route): Promise<void> => route.fulfill({ json: { payload: { offering, registrations: [
    { id: "registration-1", student: { matricNumber: "UEMP/001", user: { name: "Student One" } }, result: null },
    { id: "registration-2", student: { matricNumber: "UEMP/002", user: { name: "Student Two" } }, result: null },
  ] } } }));
  let savedPayload: object | null = null;
  await page.route("**/api/lecturer/offerings/offering/results", async (route): Promise<void> => { savedPayload = route.request().postDataJSON(); await route.fulfill({ json: { payload: { batchId: "batch", savedCount: 2 } } }); });
  await page.route("**/api/lecturer/offerings/offering/submit", async (route): Promise<void> => route.fulfill({ json: { payload: { id: "batch", status: "SUBMITTED", submittedAt: "2026-11-11T12:00:00.000Z" } } }));

  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto("/lecturer/dashboard");
  await expect(page.getByRole("heading", { name: "Welcome, Ada." })).toBeVisible(); await expect(page.getByRole("heading", { name: "CSC201 result sheet" })).toBeVisible();
  await page.getByLabel("Student One continuous assessment").fill("25"); await page.getByLabel("Student One examination").fill("50");
  page.once("dialog", async (dialog): Promise<void> => { expect(dialog.message()).toContain("Discard unsaved score changes"); await dialog.dismiss(); });
  await page.getByRole("button", { name: /CSC203 Operating Systems/ }).click(); await expect(page.getByRole("heading", { name: "CSC201 result sheet" })).toBeVisible();
  await page.getByLabel("Student Two continuous assessment").fill("18"); await page.getByLabel("Student Two examination").fill("35");
  await page.getByRole("button", { name: "Save draft" }).click(); await expect(page.getByText("Draft results saved.")).toBeVisible(); expect(savedPayload).toBeTruthy();
  await page.getByLabel("Student One continuous assessment").fill("26"); await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page.getByText("Results submitted for administrator approval.")).toBeVisible(); expect(savedPayload).toEqual({ results: [
    { registrationId: "registration-1", caScore: 26, examScore: 50 }, { registrationId: "registration-2", caScore: 18, examScore: 35 },
  ] });
  expect(await page.evaluate((): boolean => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".impeccable/review/lecturer-dashboard-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 }); await page.reload(); await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog", { name: "Lecturer navigation" })).toBeVisible(); await expect(page.getByRole("button", { name: "Close navigation" })).toBeFocused();
  await expect.poll(async (): Promise<number> => page.getByRole("dialog", { name: "Lecturer navigation" }).evaluate((element): number => element.getBoundingClientRect().left)).toBe(0);
  await page.screenshot({ path: ".impeccable/review/lecturer-dashboard-mobile.png", fullPage: true }); await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused(); expect(await page.evaluate((): boolean => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("login validates input, sends credentials with Axios, and redirects active sessions", async ({
  page,
}): Promise<void> => {
  let authenticated = false;
  await page.route("**/api/auth/me", async (route): Promise<void> => {
    await route.fulfill({
      status: authenticated ? 200 : 401,
      json: authenticated
        ? { payload: { user } }
        : { message: "Authentication is required." },
    });
  });
  await page.route("**/api/auth/login", async (route): Promise<void> => {
    expect(route.request().postDataJSON()).toEqual({
      email: user.email,
      password: "A fictional test passphrase",
    });
    authenticated = true;
    await route.fulfill({
      json: { payload: { user, expiresAt: "2026-11-18T12:00:00.000Z" } },
    });
  });
  await page.route("**/api/student/**", async (route): Promise<void> => {
    await route.fulfill({ status: 404, json: { message: "Student profile was not found." } });
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in to your portal" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await page
    .getByLabel("University email address")
    .fill(" STUDENT@EXAMPLE.TEST ");
  await page
    .getByLabel("Password", { exact: true })
    .fill("A fictional test passphrase");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Sign in to your portal" }).click();
  await expect(page).toHaveURL(/\/student\/dashboard$/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/student\/dashboard$/);
  expect(
    await page.evaluate(
      (): number => localStorage.length + sessionStorage.length,
    ),
  ).toBe(0);
});

test("invalid credentials display the server error without retrying or retaining the password", async ({
  page,
}): Promise<void> => {
  let attempts = 0;
  await page.route("**/api/auth/me", async (route): Promise<void> => {
    await route.fulfill({
      status: 401,
      json: { message: "Authentication is required." },
    });
  });
  await page.route("**/api/auth/login", async (route): Promise<void> => {
    attempts += 1;
    await route.fulfill({
      status: 401,
      json: {
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      },
    });
  });
  await page.goto("/login");
  await page.getByLabel("University email address").fill(user.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("An incorrect test password");
  await page.getByRole("button", { name: "Sign in to your portal" }).click();
  await expect(page.locator(".auth-form").getByRole("alert")).toHaveText(
    "Invalid email or password.",
  );
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  expect(attempts).toBe(1);
});

test("active administrator and lecturer sessions leave the login route", async ({ page }): Promise<void> => {
  let role: "ADMIN" | "LECTURER" = "ADMIN";
  await page.route("**/api/auth/me", async (route): Promise<void> => route.fulfill({ json: { payload: { user: {
    id: `active-${role.toLowerCase()}`, email: `${role.toLowerCase()}@example.test`, name: `Active ${role}`, role, status: "ACTIVE",
  } } } }));
  await page.route("**/api/admin/**", async (route): Promise<void> => route.fulfill({ status: 500, json: { message: "Dashboard fixture not required." } }));
  await page.route("**/api/lecturer/**", async (route): Promise<void> => route.fulfill({ status: 500, json: { message: "Dashboard fixture not required." } }));
  await page.goto("/login"); await expect(page).toHaveURL(/\/admin\/dashboard$/);
  role = "LECTURER"; await page.goto("/login"); await expect(page).toHaveURL(/\/lecturer\/dashboard$/);
});

test("login scrolls only the form panel while the image stays fixed", async ({ page }): Promise<void> => {
  await page.route("**/api/auth/me", async (route): Promise<void> => {
    await route.fulfill({ status: 401, json: { message: "Authentication is required." } });
  });
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.goto("/login");
  await expect(page.getByLabel("University email address")).toBeVisible();
  const image = page.locator(".login-visual");
  const panel = page.locator(".login-panel");
  const before = await image.boundingBox();
  await panel.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(async (): Promise<number> => panel.evaluate((element): number => element.scrollTop)).toBeGreaterThan(0);
  expect(await image.boundingBox()).toEqual(before);
  expect(await page.evaluate((): number => window.scrollY)).toBe(0);
  expect(await page.evaluate((): boolean => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  await expect(page.getByRole("button", { name: "Sign in to your portal" })).toBeInViewport();
});
