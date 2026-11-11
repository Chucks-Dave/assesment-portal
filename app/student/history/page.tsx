import type { Metadata } from "next";
import type { ReactElement } from "react";
import { StudentResultsScreen } from "@/components/dashboard/student-results";

export const metadata: Metadata = { title: "Academic history", description: "Review your approved UEMP results grouped by semester." };

export default function StudentHistoryPage(): ReactElement {
  return <StudentResultsScreen view="history" />;
}
