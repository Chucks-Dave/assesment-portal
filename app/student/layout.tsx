import type { ReactElement, ReactNode } from "react";
import { QueryProvider } from "@/components/auth/query-provider";
import "./dashboard/dashboard.css";

export default function StudentLayout({ children }: { children: ReactNode }): ReactElement {
  return <QueryProvider>{children}</QueryProvider>;
}
