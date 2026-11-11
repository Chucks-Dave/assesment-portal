ALTER TABLE "Course" ADD COLUMN "defaultCreditUnits" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "Course" ADD CONSTRAINT "Course_defaultCreditUnits_valid" CHECK ("defaultCreditUnits" BETWEEN 1 AND 12);
