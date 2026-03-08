export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
      <p className="text-neutral-400 max-w-2xl">
        Manage core game content and the society's user accounts from one place. Content updates affect
        character creation, compendium data, and party campaign play immediately.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-indigo-500 transition-colors">
          <h3 className="text-lg font-medium text-white mb-2">Archetypes & Talents</h3>
          <p className="text-sm text-neutral-500">
            Define player classes, their starting main attributes, skills, and special abilities.
          </p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-indigo-500 transition-colors">
          <h3 className="text-lg font-medium text-white mb-2">Items & Gear</h3>
          <p className="text-sm text-neutral-500">
            Manage weapons, armor, and general gear with dynamic stats.
          </p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-indigo-500 transition-colors">
          <h3 className="text-lg font-medium text-white mb-2">Adversaries</h3>
          <p className="text-sm text-neutral-500">
            Create detailed NPCs and horrifying Vaesen with complex JSON-based powers and conditions.
          </p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-indigo-500 transition-colors">
          <h3 className="text-lg font-medium text-white mb-2">Users & Access</h3>
          <p className="text-sm text-neutral-500">
            Create user accounts, assign roles, and rotate passwords for players, GMs, and admins.
          </p>
        </div>
      </div>
    </div>
  );
}
