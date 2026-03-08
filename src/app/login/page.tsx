import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-neutral-950/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">Vaesen</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Society Ledger</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">
            Sign in with your admin-issued account to manage hunters, mysteries, and the Society&apos;s affairs.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
