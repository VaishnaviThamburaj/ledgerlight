import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { SetupStatus } from "@/components/SetupStatus";
import { Logo } from "@/components/ui";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ledgerlight · Invoice capture for distributors",
  description: "Upload supplier invoices, let AI read them, auto-check the math, review flagged fields, and export clean data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo />
              <span className="text-[15px] font-semibold tracking-tight">Ledgerlight</span>
            </Link>
            <nav className="hidden text-sm text-slate-600 sm:block">
              <Link href="/" className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900">
                Inbox
              </Link>
            </nav>
            <div className="ml-auto">
              <Suspense fallback={null}>
                <SetupStatus />
              </Suspense>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
