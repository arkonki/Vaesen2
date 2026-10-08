"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm({ callbackPath = "/" }: { callbackPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: callbackPath,
      });

      if (!result || result.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push(callbackPath);
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-[var(--ledger-ink)]">Email</label>
        <input
          required
          type="email"
          id="login-email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none transition-colors focus:border-[var(--ledger-accent)]/65"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-[var(--ledger-ink)]">Password</label>
        <input
          required
          type="password"
          id="login-password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none transition-colors focus:border-[var(--ledger-accent)]/65"
          placeholder="Password"
        />
      </div>

      {error ? (
        <div role="alert" className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-[var(--ledger-danger)]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="ledger-button ledger-button-primary w-full"
      >
        {isLoading ? "Signing in..." : "Enter the Society"}
      </button>
    </form>
  );
}
