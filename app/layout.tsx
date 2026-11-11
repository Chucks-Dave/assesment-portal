import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import type { ReactElement } from "react";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "UEMP — Your academic home", template: "%s | UEMP" },
  description:
    "A connected home for your university journey. Explore course registration, approved results, and academic services with UEMP.",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">): ReactElement {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
