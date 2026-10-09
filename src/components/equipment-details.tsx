import { profilesFor, skillName, typeName, type EquipmentItem } from "@/lib/equipment";

export default function EquipmentDetails({ item }: { item: EquipmentItem }) {
  return <div className="space-y-2 text-sm break-words">
    <p>{typeName(item.type)} / {item.availability ? `Availability ${item.availability} successes` : "Not purchased independently"}</p>
    {item.description && !profilesFor(item).some(profile => profile.effect === item.description) && <p className="whitespace-pre-wrap">{item.description}</p>}
    {item.protection !== null && <p className="font-bold">Protection {item.protection}d6{item.agilityPenalty !== null ? ` / Agility -${item.agilityPenalty} dice while worn` : ''}</p>}
    {item.type === 'ARMOR' && item.protection === null && <p className="ledger-status">Legacy armor: Protection and Agility need review in Admin.</p>}
    {item.doses !== null && <p>{item.doses} doses per purchase{item.toxicity !== null ? ` / Toxicity ${item.toxicity}` : ''}</p>}
    {item.type === 'SERVICE' && <p className="font-bold">Party-wide service, not inventory equipment.</p>}
    {profilesFor(item).map(profile => <div key={profile.id} className="border-t border-[var(--ledger-line)] pt-2 space-y-1">
      <p className="font-bold">{profile.label}{profile.kind !== 'NARRATIVE' ? ` / ${profile.bonus >= 0 ? '+' : ''}${profile.bonus} dice` : ' / Narrative effect'}</p>
      {profile.skills.length > 0 && <p>{profile.skills.map(skillName).join(' / ')}</p>}
      {profile.kind === 'ATTACK' && <p>Damage {profile.damage ?? '?'} Conditions / Zones {profile.rangeMin === null ? item.range || 'Needs review' : `${profile.rangeMin}${profile.rangeMax === profile.rangeMin ? '' : `-${profile.rangeMax}`}`}</p>}
      <p className="whitespace-pre-wrap">{profile.effect}</p>{profile.requirements && <p className="italic whitespace-pre-wrap">{profile.requirements}</p>}
    </div>)}
    {item.sourceBook && <p className="text-[var(--ledger-ink-soft)]">{item.sourceBook}{item.sourcePage ? `, p. ${item.sourcePage}` : ''}</p>}
  </div>;
}
