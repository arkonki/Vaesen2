export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--ledger-ink)] tracking-tight">Admin Dashboard</h1>
      <p className="text-[var(--ledger-ink-soft)] max-w-2xl">
        Manage core game content and the society&apos;s user accounts from one place. Content updates affect
        character creation, compendium data, and party campaign play immediately.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-lg p-6 hover:border-[var(--ledger-accent)]/65 transition-colors">
          <h3 className="text-lg font-medium text-[var(--ledger-ink)] mb-2">Archetypes & Talents</h3>
          <p className="text-sm text-[var(--ledger-ink-soft)]">
            Define player classes, their starting main attributes, skills, and special abilities.
          </p>
        </div>
        <div className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-lg p-6 hover:border-[var(--ledger-accent)]/65 transition-colors">
          <h3 className="text-lg font-medium text-[var(--ledger-ink)] mb-2">Items & Gear</h3>
          <p className="text-sm text-[var(--ledger-ink-soft)]">
            Manage weapons, armor, and general gear with dynamic stats.
          </p>
        </div>
        <div className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-lg p-6 hover:border-[var(--ledger-accent)]/65 transition-colors">
          <h3 className="text-lg font-medium text-[var(--ledger-ink)] mb-2">Adversaries</h3>
          <p className="text-sm text-[var(--ledger-ink-soft)]">
            Create detailed NPCs and horrifying Vaesen with complex JSON-based powers and conditions.
          </p>
        </div>
        <div className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-lg p-6 hover:border-[var(--ledger-accent)]/65 transition-colors">
          <h3 className="text-lg font-medium text-[var(--ledger-ink)] mb-2">Users & Access</h3>
          <p className="text-sm text-[var(--ledger-ink-soft)]">
            Create user accounts, assign roles, and rotate passwords for players, GMs, and admins.
          </p>
        </div>
      </div>
    </div>
  );
}
