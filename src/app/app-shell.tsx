"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { BookOpen, Home, LogOut, ScrollText, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import VaesenMark from "@/components/vaesen-mark";
import DiceRollerModal from "@/components/dice-roller-modal";

type AppShellProps = {
  role?: string;
  userName?: string | null;
  children: React.ReactNode;
};

const navigation = [
  { href: "/", label: "Home", icon: Home, roles: ["PLAYER", "GM", "ADMIN"] },
  { href: "/characters", label: "Characters", icon: ScrollText, roles: ["PLAYER", "GM", "ADMIN"] },
  { href: "/parties", label: "Parties", icon: Users, roles: ["PLAYER", "GM", "ADMIN"] },
  { href: "/compendium", label: "Compendium", icon: BookOpen, roles: ["PLAYER", "GM", "ADMIN"] },
  { href: "/admin", label: "Admin", icon: Shield, roles: ["ADMIN"] },
];

export default function AppShell({ role, userName, children }: AppShellProps) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login";
  const showShell = Boolean(role) && !isAuthPage;

  if (!showShell) {
    return <>{children}</>;
  }

  const links = navigation.filter((item) => role && item.roles.includes(role));

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,248,239,0.55),rgba(205,183,152,0.12))] text-[var(--ledger-ink)]">
      <header className="sticky top-0 z-20 border-b border-[var(--ledger-frame)]/60 bg-[rgba(241,232,216,0.94)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="rounded-full border border-[var(--ledger-frame)]/70 bg-[rgba(127,48,40,0.08)] p-2 text-[var(--ledger-accent)]">
              <VaesenMark className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--ledger-ink-soft)]">Vaesen</p>
              <p className="text-sm font-semibold text-[var(--ledger-ink)]">Society Ledger</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {links.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "border px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] transition-colors",
                    isActive
                      ? "border-[var(--ledger-frame)]/80 bg-[rgba(127,48,40,0.08)] text-[var(--ledger-accent)]"
                      : "border-[var(--ledger-frame)]/55 bg-[rgba(255,252,246,0.72)] text-[var(--ledger-ink)] hover:border-[var(--ledger-frame)]/80 hover:bg-[rgba(255,252,246,0.92)]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <DiceRollerModal initialDiceCount={0} title="Shared Dice Roller" triggerLabel="Dice" triggerVariant="header" />
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[var(--ledger-ink)]">{userName || "Society Member"}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ledger-ink-soft)]">{role}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="border border-[var(--ledger-frame)]/55 bg-[rgba(255,252,246,0.72)] p-2 text-[var(--ledger-ink)] transition-colors hover:border-[var(--ledger-frame)]/80 hover:bg-[rgba(255,252,246,0.92)]"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-[var(--ledger-frame)]/35 bg-[rgba(241,232,216,0.7)] px-4 py-3 md:hidden">
        <nav className="flex flex-wrap gap-2">
          {links.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors",
                  isActive
                    ? "border-[var(--ledger-frame)]/80 bg-[rgba(127,48,40,0.08)] text-[var(--ledger-accent)]"
                    : "border-[var(--ledger-frame)]/55 bg-[rgba(255,252,246,0.72)] text-[var(--ledger-ink)]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <DiceRollerModal initialDiceCount={0} title="Shared Dice Roller" triggerLabel="Dice" triggerVariant="header" />
        </nav>
      </div>

      {children}
    </div>
  );
}
