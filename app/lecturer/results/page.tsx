import type { Metadata } from "next";
import type { ReactElement } from "react";
import { LecturerDashboardScreen } from "@/components/dashboard/lecturer-dashboard";

export const metadata: Metadata = { title: "Result entry", description: "Prepare and submit UEMP student results for approval." };

export default function LecturerResultsPage(): ReactElement { return <LecturerDashboardScreen view="results" />; }
