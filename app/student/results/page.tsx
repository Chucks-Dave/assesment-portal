import type { Metadata } from "next";
import type { ReactElement } from "react";
import { StudentResultsScreen } from "@/components/dashboard/student-results";

export const metadata: Metadata = { title: "Approved results", description: "Review your approved UEMP course results and cumulative GPA." };

export default function StudentResultsPage(): ReactElement {
  return <StudentResultsScreen view="results" />;
}
