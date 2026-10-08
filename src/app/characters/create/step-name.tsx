import { useState } from "react";
import type { ArchetypeTemplate } from "@/lib/archetype-template";
import type { WizardStepProps } from "./wizard";

export default function StepName({ data, update, archetype, onNext, onPrev }: WizardStepProps & { archetype?: ArchetypeTemplate }) {
  const [firstName, setFirstName] = useState(() => archetype?.firstNameOptions.find(name => data.name === name || data.name.startsWith(name + " ")) ?? "");
  const [lastName, setLastName] = useState(() => archetype?.lastNameOptions.find(name => data.name === name || data.name.endsWith(" " + name)) ?? "");
  return <div className="space-y-6">
    <h2 className="text-2xl font-bold">Choose a Name</h2>
    <p>Choose from the {archetype?.name} suggestions, combine them, or write a name of your own.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block font-semibold">Suggested First Name<select className="ledger-input mt-2 w-full" value={firstName} disabled={!archetype?.firstNameOptions.length} onChange={event => { setFirstName(event.target.value); update({ name: `${event.target.value} ${lastName}`.trim() }); }}>
        <option value="">Choose a first name</option>{archetype?.firstNameOptions.map(name => <option key={name}>{name}</option>)}
      </select></label>
      <label className="block font-semibold">Suggested Last Name<select className="ledger-input mt-2 w-full" value={lastName} disabled={!archetype?.lastNameOptions.length} onChange={event => { const first = firstName || (lastName && data.name.endsWith(lastName) ? data.name.slice(0, -lastName.length).trim() : data.name.trim()); setLastName(event.target.value); update({ name: `${first} ${event.target.value}`.trim() }); }}>
        <option value="">Choose a last name</option>{archetype?.lastNameOptions.map(name => <option key={name}>{name}</option>)}
      </select></label>
    </div>
    <label className="block font-semibold">Character Name<input autoComplete="off" className="ledger-input mt-2 w-full" value={data.name} maxLength={100} onChange={event => { setFirstName(""); setLastName(""); update({ name: event.target.value }); }} placeholder="Your hunter's full name" /></label>
    <div className="flex flex-wrap justify-between gap-3 border-t border-[var(--ledger-line)] pt-5"><button type="button" className="ledger-button" onClick={onPrev}>Back</button><button type="button" className="ledger-button ledger-button-primary" disabled={!data.name.trim()} onClick={onNext}>Next: Attributes</button></div>
  </div>;
}
