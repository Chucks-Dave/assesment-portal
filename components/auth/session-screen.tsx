"use client";

import Link from "next/link";
import { useEffect, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, SESSION_QUERY_KEY } from "@/features/auth/api";
import { apiErrorMessage } from "@/lib/http-client";
import { dashboardPathFor, type AuthUser } from "@/shared/auth";
import { Icon } from "@/components/ui/icon";
import { LoginForm } from "./login-form";

export function SessionScreen(): ReactElement {
  const router = useRouter();
  const session = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: ({ signal }): Promise<AuthUser | null> => getCurrentUser(signal),
  });
  useEffect((): void => {
    if (session.data) router.replace(dashboardPathFor(session.data.role));
  }, [router, session.data]);
  if (session.isPending)
    return (
      <div className="login-form-wrap" role="status">
        <h1>Welcome back.</h1>
        <p>Checking your account…</p>
      </div>
    );
  if (session.data) return <div className="login-form-wrap" role="status"><h1>Returning to your dashboard…</h1><p>Your session is still active.</p></div>;
  return (
    <div className="login-form-wrap">
      <h1>Welcome back.</h1>
      <p>
        Sign in to continue your academic journey.
        <br />
        One account. Your own space.
      </p>
      {session.isError && (
        <p className="form-error" role="alert">
          {apiErrorMessage(session.error)}
        </p>
      )}
      <LoginForm />
      <p className="login-help">
        Need help accessing your account?{" "}
        <Link href="/#guide-login">Find guidance</Link>
      </p>
      <div className="login-privacy">
        <Icon name="lock" /> Your session stays private on this device.
      </div>
    </div>
  );
}
