import type { Metadata } from "next";
import type { ReactElement } from "react";
import { StudentCoursesScreen } from "@/components/dashboard/student-dashboard";

export const metadata: Metadata = { title: "Course registration", description: "Choose your eligible UEMP semester courses." };

export default function StudentCoursesPage(): ReactElement {
  return <StudentCoursesScreen view="available" />;
}
