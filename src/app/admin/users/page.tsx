import prisma from "@/lib/prisma";
import UserAdmin from "./user-admin";

export default async function AdminUsersPage() {
  const rawUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          characters: true,
          gmParties: true,
        },
      },
    },
  });

  const users = rawUsers.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Users</h1>
        <p className="mt-2 max-w-2xl text-neutral-400">
          Create accounts, assign roles, and rotate passwords for the whole table.
        </p>
      </div>

      <UserAdmin users={users} />
    </div>
  );
}
