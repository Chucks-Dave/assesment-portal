import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { Brand } from "@/components/landing/header";
import { QueryProvider } from "@/components/auth/query-provider";
import { SessionScreen } from "@/components/auth/session-screen";

export const metadata: Metadata = {
  title: "Portal login",
  robots: { index: false, follow: false },
};

export default function LoginPage(): ReactElement {
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
