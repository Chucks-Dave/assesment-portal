import type { Metadata } from "next";
import type { ReactElement } from "react";
import { AdminDashboardScreen } from "@/components/dashboard/admin-dashboard";

export const metadata: Metadata = { title: "User management", description: "Create and manage UEMP user accounts and academic assignments." };

export default function AdminUsersPage(): ReactElement { return <AdminDashboardScreen view="users" />; }
