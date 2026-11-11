import type { Metadata } from "next";
import type { ReactElement } from "react";
import { StudentDashboardScreen } from "@/components/dashboard/student-dashboard";

export const metadata: Metadata = {
  title: "Student dashboard",
  description: "Your UEMP academic overview, registrations, and approved academic standing.",
};

export default function StudentDashboardPage(): ReactElement {
  return <StudentDashboardScreen />;
}
