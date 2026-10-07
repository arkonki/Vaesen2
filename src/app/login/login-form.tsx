"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (!result || result.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--ledger-ink)]">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none transition-colors focus:border-[var(--ledger-accent)]/65"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--ledger-ink)]">Password</label>
        <input
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none transition-colors focus:border-[var(--ledger-accent)]/65"
          placeholder="Password"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-[var(--ledger-danger)]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl border border-[var(--ledger-accent)]/65 bg-[rgba(127,48,40,0.12)] px-4 py-3 font-semibold text-[var(--ledger-accent)] transition-colors hover:bg-[rgba(127,48,40,0.12)] disabled:opacity-60"
      >
        {isLoading ? "Signing in..." : "Enter the Society"}
      </button>
    </form>
  );
}
