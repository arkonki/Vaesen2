"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { BookOpen, Home, LogOut, ScrollText, Shield, Users, UserRound } from "lucide-react";
import VaesenMark from "@/components/vaesen-mark";
import DiceRollerModal, { DiceRollerProvider } from "@/components/dice-roller-modal";

const navigation = [
  { href: "/", label: "Home", icon: Home },
  { href: "/characters", label: "Characters", icon: ScrollText },
  { href: "/parties", label: "Parties", icon: Users },
  { href: "/compendium", label: "Compendium", icon: BookOpen },
  { href: "/admin", label: "Admin", icon: Shield },
];

export default function AppShell({ role, userName, children }: { role?: string; userName?: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  if (!role || pathname === "/login") return <>{children}</>;

  async function logout() {
    // Drafts are private to the signed-in account and this browser tab.
    try {
      for (const key of Object.keys(sessionStorage)) if (key.startsWith("vaesen-character-draft:") || key.startsWith("vaesen-journal-draft:")) sessionStorage.removeItem(key);
    } catch { /* Storage may be disabled in private browsing. */ }
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <DiceRollerProvider>
      <div className="society-app">
        <a href="#society-main" className="ledger-skip-link">Skip to content</a>
        <header className="society-header">
          <div className="society-header-top">
            <Link href="/" className="society-brand" aria-label="Vaesen Society Ledger home">
              <VaesenMark className="h-8 w-8 text-[var(--ledger-accent)]" />
              <span><strong>VAESEN</strong><small>Society Ledger</small></span>
            </Link>
            <div className="flex items-center gap-2">
              <DiceRollerModal initialDiceCount={0} title="Dice Roller" triggerLabel="Dice" triggerVariant="header" />
              <details className="society-account">
                <summary aria-label="Account menu"><span className="hidden sm:inline">{userName || "Society Member"}</span><span className="society-account-label sm:hidden">Account</span><UserRound aria-hidden="true" className="society-account-icon h-4 w-4" /></summary>
                <div className="society-account-menu">
                  <p className="font-bold">{userName || "Society Member"}</p>
                  <p className="ledger-helper-copy">{role === "GM" ? "Game Master" : role === "ADMIN" ? "Administrator" : "Player"}</p>
                  <button type="button" className="ledger-button mt-3 w-full" onClick={logout}><LogOut className="h-4 w-4" />Log out</button>
                </div>
              </details>
            </div>
          </div>
          <nav className="society-nav" aria-label="Main navigation">
            {navigation.filter(item => item.href !== "/admin" || role === "ADMIN").map(item => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}><item.icon className="h-4 w-4" />{item.label}</Link>;
            })}
          </nav>
        </header>
        <div className="society-content"><div id="society-main" tabIndex={-1}>{children}</div></div>
      </div>
    </DiceRollerProvider>
  );
}
