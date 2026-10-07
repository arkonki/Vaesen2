import type { Metadata } from "next";
import { getAppSession } from "@/lib/auth";
import AppShell from "./app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vaesen Society Ledger",
  description: "Run Vaesen characters, parties, mysteries, and lore from one place.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAppSession();

  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell role={session?.user.role} userName={session?.user.name}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
