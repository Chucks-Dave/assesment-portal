import type { ReactNode } from "react";
import { QueryProvider } from "@/components/auth/query-provider";
import "./dashboard/admin-dashboard.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
