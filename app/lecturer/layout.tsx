import type { ReactElement, ReactNode } from "react";
import { QueryProvider } from "@/components/auth/query-provider";
import "./dashboard/lecturer-dashboard.css";

export default function LecturerLayout({ children }: { children: ReactNode }): ReactElement { return <QueryProvider>{children}</QueryProvider>; }
