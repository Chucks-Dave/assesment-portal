import type { Metadata } from "next";
import type { ReactElement } from "react";
import { StudentCoursesScreen } from "@/components/dashboard/student-dashboard";

export const metadata: Metadata = { title: "Registered courses", description: "Review your current UEMP course registrations." };

export default function StudentRegistrationsPage(): ReactElement {
  return <StudentCoursesScreen view="registered" />;
}
