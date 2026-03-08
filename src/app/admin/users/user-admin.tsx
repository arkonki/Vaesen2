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
      <form onSubmit={handleCreate} className="grid gap-4 rounded-2xl border border-white/10 bg-neutral-900/70 p-6 lg:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Name</label>
          <input
            value={createForm.name}
            onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            placeholder="Astrid"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Email</label>
          <input
            required
            type="email"
            value={createForm.email}
            onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            placeholder="astrid@example.com"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Role</label>
          <select
            value={createForm.role}
            onChange={(event) => setCreateForm({ ...createForm, role: event.target.value as Role })}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Password</label>
          <input
            required
            type="password"
            value={createForm.password}
            onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            placeholder="Temporary password"
          />
        </div>

        {error ? (
          <div className="lg:col-span-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="lg:col-span-4 flex justify-end">
          <button
            type="submit"
            disabled={busyKey === "create"}
            className="rounded-full border border-amber-300/30 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
          >
            {busyKey === "create" ? "Creating..." : "Create User"}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {users.map((user) => (
          <article key={user.id} className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
            <UserRow
              user={user}
              password={passwords[user.id] ?? ""}
              setPassword={(value) => setPasswords((current) => ({ ...current, [user.id]: value }))}
              busyKey={busyKey}
              setBusyKey={setBusyKey}
            />
          </article>
        ))}
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

  async function handleSaveProfile() {
    setBusyKey(`profile-${user.id}`);
    try {
      await updateUserProfile({
        id: user.id,
        name: name.trim(),
        email: email.trim(),
        role,
      });
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  async function handleResetPassword() {
    if (!password) {
      return;
    }

    setBusyKey(`password-${user.id}`);
    try {
      await resetUserPassword(user.id, password);
      setPassword("");
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{user.name || user.email || "Unnamed User"}</h2>
          <p className="mt-1 text-sm text-neutral-500">Created {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-4 text-xs uppercase tracking-[0.2em] text-neutral-500">
          <span>{user._count.characters} Characters</span>
          <span>{user._count.gmParties} Parties</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.4fr_auto]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          placeholder="Name"
        />
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          placeholder="Email"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
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
          className="rounded-full border border-white/10 px-5 py-3 text-sm text-white transition-colors hover:border-white/20 disabled:opacity-60"
        >
          Save Profile
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          placeholder="Set a new password"
        />
        <button
          type="button"
          disabled={!password || busyKey === `password-${user.id}`}
          onClick={handleResetPassword}
          className="rounded-full border border-red-400/20 px-5 py-3 text-sm text-red-200 transition-colors hover:bg-red-500/10 disabled:opacity-60"
        >
          Reset Password
        </button>
      </div>
    </div>
  );
}
