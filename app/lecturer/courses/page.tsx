import type { Metadata } from "next";
import type { ReactElement } from "react";
import { LecturerDashboardScreen } from "@/components/dashboard/lecturer-dashboard";

export const metadata: Metadata = { title: "Assigned courses", description: "Review active UEMP lecturer course assignments." };

export default function LecturerCoursesPage(): ReactElement { return <LecturerDashboardScreen view="courses" />; }
