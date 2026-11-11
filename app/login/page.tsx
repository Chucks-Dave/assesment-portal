import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Brand } from "@/components/landing/header";
import { QueryProvider } from "@/components/auth/query-provider";
import { SessionScreen } from "@/components/auth/session-screen";
import { dashboardPathFor } from "@/shared/auth";
import { sessionCookieOptions } from "@/server/auth/config";
import { requireUser, type AuthUser } from "@/server/auth/service";
import { HttpError } from "@/server/http";

export const metadata: Metadata = {
  title: "Portal login",
  robots: { index: false, follow: false },
};

async function activeUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(sessionCookieOptions().name)?.value;
  try {
    return await requireUser(token);
  } catch (error) {
    if (error instanceof HttpError && [401, 403].includes(error.status)) return null;
    throw error;
  }
}

export default async function LoginPage(): Promise<ReactElement> {
  const user = await activeUser();
  if (user) redirect(dashboardPathFor(user.role));
  return (
    <main className="login-page" id="main-content">
      <div className="login-visual">
        <Image
          src="/images/students.jpg"
          alt="Students sharing ideas and studying together"
          fill
          loading="eager"
          sizes="50vw"
        />
        <div>
          <h2>
            Your journey.
            <br />
            Your possibilities.
          </h2>
          <p>
            A connected home for your studies, your progress, and everything
            that comes next.
          </p>
        </div>
      </div>
      <div className="login-panel">
        <Brand />
        <Link className="login-back" href="/">
          Back to UEMP home
        </Link>
        <QueryProvider>
          <SessionScreen />
        </QueryProvider>
      </div>
    </main>
  );
}
