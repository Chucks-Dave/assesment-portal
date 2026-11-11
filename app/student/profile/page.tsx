import type { Metadata } from "next";
import type { ReactElement } from "react";
import { StudentProfileScreen } from "@/components/dashboard/student-profile";

export const metadata: Metadata = { title: "Student profile", description: "Review your UEMP academic identity and update your contact details." };

export default function StudentProfilePage(): ReactElement {
  return <StudentProfileScreen />;
}
