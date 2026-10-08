import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";
import LoginForm from "./login-form";
import Image from "next/image";
import VaesenMark from "@/components/vaesen-mark";
import { safeCallbackPath } from "@/lib/ui-flow";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const session = await getAppSession();
  const callbackPath = safeCallbackPath((await searchParams).callbackUrl);

  if (session) {
    redirect(callbackPath);
  }

  return (
    <main className="ledger-login">
      <Image src="/art/nordic-manor.webp" alt="" fill priority sizes="100vw" className="ledger-login-art" />
      <div className="ledger-login-card">
        <div className="mb-8">
          <p className="ledger-kicker flex items-center gap-2"><VaesenMark className="h-7 w-7 text-[var(--ledger-accent)]" />Vaesen</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-[var(--ledger-ink)]">Society Ledger</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ledger-ink-soft)]">
            Sign in with your admin-issued account to manage hunters, mysteries, and the Society&apos;s affairs.
          </p>
        </div>

        <LoginForm callbackPath={callbackPath} />
      </div>
    </main>
  );
}
