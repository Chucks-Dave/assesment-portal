CREATE TYPE "SemesterTerm" AS ENUM ('FIRST', 'SECOND');
CREATE TYPE "ResultBatchStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REJECTED', 'APPROVED');

CREATE TABLE "Faculty" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Department" ("id" TEXT NOT NULL, "facultyId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, CONSTRAINT "Department_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Program" ("id" TEXT NOT NULL, "departmentId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, CONSTRAINT "Program_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Student" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "programId" TEXT NOT NULL, "matricNumber" TEXT NOT NULL, "level" INTEGER NOT NULL, "phone" TEXT, "address" TEXT, CONSTRAINT "Student_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Lecturer" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "departmentId" TEXT NOT NULL, CONSTRAINT "Lecturer_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AcademicSession" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AcademicSession_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Semester" ("id" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "term" "SemesterTerm" NOT NULL, "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT false, "registrationOpen" BOOLEAN NOT NULL DEFAULT false, CONSTRAINT "Semester_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Course" ("id" TEXT NOT NULL, "departmentId" TEXT NOT NULL, "code" TEXT NOT NULL, "title" TEXT NOT NULL, CONSTRAINT "Course_pkey" PRIMARY KEY ("id"));
CREATE TABLE "CourseOffering" ("id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "semesterId" TEXT NOT NULL, "programId" TEXT NOT NULL, "lecturerId" TEXT, "level" INTEGER NOT NULL, "creditUnits" INTEGER NOT NULL, CONSTRAINT "CourseOffering_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Registration" ("id" TEXT NOT NULL, "studentId" TEXT NOT NULL, "offeringId" TEXT NOT NULL, "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "creditUnitsSnapshot" INTEGER NOT NULL, CONSTRAINT "Registration_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ResultBatch" ("id" TEXT NOT NULL, "offeringId" TEXT NOT NULL, "status" "ResultBatchStatus" NOT NULL DEFAULT 'DRAFT', "submitterId" TEXT NOT NULL, "reviewerId" TEXT, "submittedAt" TIMESTAMP(3), "reviewedAt" TIMESTAMP(3), "feedback" TEXT, CONSTRAINT "ResultBatch_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Result" ("id" TEXT NOT NULL, "registrationId" TEXT NOT NULL, "batchId" TEXT NOT NULL, "caScore" DECIMAL(5,2) NOT NULL, "examScore" DECIMAL(5,2) NOT NULL, "totalScore" DECIMAL(5,2) NOT NULL, "grade" TEXT NOT NULL, "gradePoint" INTEGER NOT NULL, CONSTRAINT "Result_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AuditEvent" ("id" TEXT NOT NULL, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, "changes" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "Faculty_code_key" ON "Faculty"("code");
CREATE UNIQUE INDEX "Department_facultyId_code_key" ON "Department"("facultyId", "code");
CREATE UNIQUE INDEX "Program_departmentId_code_key" ON "Program"("departmentId", "code");
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");
CREATE UNIQUE INDEX "Student_matricNumber_key" ON "Student"("matricNumber");
CREATE INDEX "Student_programId_level_idx" ON "Student"("programId", "level");
CREATE UNIQUE INDEX "Lecturer_userId_key" ON "Lecturer"("userId");
CREATE UNIQUE INDEX "AcademicSession_name_key" ON "AcademicSession"("name");
CREATE INDEX "Semester_isActive_idx" ON "Semester"("isActive");
CREATE UNIQUE INDEX "Semester_sessionId_term_key" ON "Semester"("sessionId", "term");
CREATE UNIQUE INDEX "Course_departmentId_code_key" ON "Course"("departmentId", "code");
CREATE INDEX "CourseOffering_semesterId_programId_level_idx" ON "CourseOffering"("semesterId", "programId", "level");
CREATE UNIQUE INDEX "CourseOffering_courseId_semesterId_programId_level_key" ON "CourseOffering"("courseId", "semesterId", "programId", "level");
CREATE INDEX "Registration_studentId_registeredAt_idx" ON "Registration"("studentId", "registeredAt");
CREATE UNIQUE INDEX "Registration_studentId_offeringId_key" ON "Registration"("studentId", "offeringId");
CREATE INDEX "ResultBatch_offeringId_status_idx" ON "ResultBatch"("offeringId", "status");
CREATE UNIQUE INDEX "Result_registrationId_key" ON "Result"("registrationId");
CREATE INDEX "Result_batchId_idx" ON "Result"("batchId");
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

ALTER TABLE "Department" ADD CONSTRAINT "Department_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Program" ADD CONSTRAINT "Program_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lecturer" ADD CONSTRAINT "Lecturer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lecturer" ADD CONSTRAINT "Lecturer_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResultBatch" ADD CONSTRAINT "ResultBatch_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResultBatch" ADD CONSTRAINT "ResultBatch_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResultBatch" ADD CONSTRAINT "ResultBatch_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Result" ADD CONSTRAINT "Result_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Result" ADD CONSTRAINT "Result_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ResultBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Student" ADD CONSTRAINT "Student_level_valid" CHECK ("level" > 0);
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_units_valid" CHECK ("creditUnits" BETWEEN 1 AND 12);
ALTER TABLE "Result" ADD CONSTRAINT "Result_scores_valid" CHECK ("caScore" BETWEEN 0 AND 30 AND "examScore" BETWEEN 0 AND 70 AND "totalScore" = "caScore" + "examScore" AND "gradePoint" BETWEEN 0 AND 5);
CREATE UNIQUE INDEX "Semester_single_active" ON "Semester" ((true)) WHERE "isActive" = true;

CREATE FUNCTION "enforce_result_offering_match"() RETURNS trigger AS $$
BEGIN
  IF (SELECT "offeringId" FROM "Registration" WHERE "id" = NEW."registrationId") <>
     (SELECT "offeringId" FROM "ResultBatch" WHERE "id" = NEW."batchId") THEN
    RAISE EXCEPTION 'Result registration and batch offerings must match';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Result_offering_match" BEFORE INSERT OR UPDATE ON "Result"
FOR EACH ROW EXECUTE FUNCTION "enforce_result_offering_match"();
