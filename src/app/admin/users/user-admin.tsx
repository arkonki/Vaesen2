"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { createUser, resetUserPassword, updateUserProfile } from "@/app/admin/actions";

type UserRecord = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  createdAt: string;
  _count: {
    characters: number;
    gmParties: number;
  };
};

const ROLE_OPTIONS: Role[] = ["PLAYER", "GM", "ADMIN"];

export default function UserAdmin({ users }: { users: UserRecord[] }) {
  const router = useRouter();
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "PLAYER" as Role,
    password: "",
  });
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const visibleUsers = users.filter((user) =>
    `${user.name ?? ""} ${user.email ?? ""} ${user.role}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusyKey("create");

    try {
      await createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        role: createForm.role,
        password: createForm.password,
      });
      setCreateForm({ name: "", email: "", role: "PLAYER", password: "" });
      router.refresh();
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Failed to create user.";
      setError(message);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-8">
      <details className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface-strong)] p-5">
        <summary className="cursor-pointer font-display text-xl">Create a User</summary>
      <form onSubmit={handleCreate} className="mt-5 grid gap-4 lg:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--ledger-ink)]" htmlFor="field-users-user-admin-tsx-0">Name</label>
          <input id="field-users-user-admin-tsx-0"
            value={createForm.name}
            onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
            className="w-full rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
            placeholder="Astrid"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--ledger-ink)]" htmlFor="field-users-user-admin-tsx-1">Email</label>
          <input id="field-users-user-admin-tsx-1"
            required
            type="email"
            value={createForm.email}
            onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
            className="w-full rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
            placeholder="astrid@example.com"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--ledger-ink)]" htmlFor="field-users-user-admin-tsx-2">Role</label>
          <select id="field-users-user-admin-tsx-2"
            value={createForm.role}
            onChange={(event) => setCreateForm({ ...createForm, role: event.target.value as Role })}
            className="w-full rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--ledger-ink)]" htmlFor="field-users-user-admin-tsx-3">Password</label>
          <input id="field-users-user-admin-tsx-3"
            required
            type="password"
            minLength={12}
            maxLength={72}
            value={createForm.password}
            onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
            className="w-full rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
            placeholder="Temporary password"
          />
        </div>

        {error ? (
          <div role="alert" className="lg:col-span-4 rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-[var(--ledger-danger)]">
            {error}
          </div>
        ) : null}

        <div className="lg:col-span-4 flex justify-end">
          <button
            type="submit"
            disabled={busyKey === "create"}
            className="rounded-full border border-[var(--ledger-accent)]/65 bg-[rgba(127,48,40,0.12)] px-5 py-3 text-sm font-semibold text-[var(--ledger-accent)] transition-colors hover:bg-[rgba(127,48,40,0.12)] disabled:opacity-60"
          >
            {busyKey === "create" ? "Creating..." : "Create User"}
          </button>
        </div>
      </form>
      </details>

      <div className="ledger-search-toolbar">
        <label htmlFor="user-search" className="block text-sm font-semibold">Find a User</label>
        <input id="user-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, or role" className="ledger-input mt-2 w-full" />
        <p className="mt-2 text-sm text-[var(--ledger-ink-soft)]">{visibleUsers.length} of {users.length} users</p>
      </div>

      <div className="space-y-4">
        {visibleUsers.map((user) => (
          <article key={user.id} className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-6">
            <UserRow
              user={user}
              password={passwords[user.id] ?? ""}
              setPassword={(value) => setPasswords((current) => ({ ...current, [user.id]: value }))}
              busyKey={busyKey}
              setBusyKey={setBusyKey}
            />
          </article>
        ))}
        {!visibleUsers.length && <p className="ledger-card p-6">No users match your search.</p>}
      </div>
    </div>
  );
}

function UserRow({
  user,
  password,
  setPassword,
  busyKey,
  setBusyKey,
}: {
  user: UserRecord;
  password: string;
  setPassword: (value: string) => void;
  busyKey: string | null;
  setBusyKey: (value: string | null) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [role, setRole] = useState<Role>(user.role);
  const [error, setError] = useState("");

  async function handleSaveProfile() {
    setError("");
    setBusyKey(`profile-${user.id}`);
    try {
      await updateUserProfile({
        id: user.id,
        name: name.trim(),
        email: email.trim(),
        role,
      });
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Profile update failed");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleResetPassword() {
    if (!password) {
      return;
    }

    setError("");
    setBusyKey(`password-${user.id}`);
    try {
      await resetUserPassword(user.id, password);
      setPassword("");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Password reset failed");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-[var(--ledger-danger)]">{error}</p>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--ledger-ink)]">{user.name || user.email || "Unnamed User"}</h2>
          <p className="mt-1 text-sm text-[var(--ledger-ink-soft)]">Created {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-4 text-xs uppercase tracking-[0.2em] text-[var(--ledger-ink-soft)]">
          <span>{user._count.characters} Characters</span>
          <span>{user._count.gmParties} Parties</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.4fr_auto]">
        <input
          aria-label={`Name for ${user.email ?? "this user"}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
          placeholder="Name"
        />
        <input
          aria-label={`Email for ${user.name ?? "this user"}`}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
          placeholder="Email"
        />
        <select
          aria-label={`Role for ${user.email ?? "this user"}`}
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
          className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busyKey === `profile-${user.id}`}
          onClick={handleSaveProfile}
          className="rounded-full border border-[var(--ledger-line)]/55 px-5 py-3 text-sm text-[var(--ledger-ink)] transition-colors hover:border-[var(--ledger-line)]/55 disabled:opacity-60"
        >
          Save Profile
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <input
          aria-label={`New password for ${user.email ?? "this user"}`}
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={72}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
          placeholder="Set a new password"
        />
        <button
          type="button"
          disabled={!password || busyKey === `password-${user.id}`}
          onClick={handleResetPassword}
          className="rounded-full border border-red-400/20 px-5 py-3 text-sm text-[var(--ledger-danger)] transition-colors hover:bg-red-500/10 disabled:opacity-60"
        >
          Reset Password
        </button>
      </div>
    </div>
  );
}
