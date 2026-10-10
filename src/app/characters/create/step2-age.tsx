import type { WizardStepProps, WizardState } from "./wizard";
import { AGE_ALLOWANCES } from "@/lib/character-rules";
import CreationChoice from "@/components/creation-choice";
import ReferenceHelp from "@/components/reference-help";

export default function Step2Age({ data, update }: WizardStepProps) {
  const ages = [
    { group: "YOUNG", label: "Young", range: "17-25", description: "Brimming with vitality, but lacking experience." },
    { group: "MIDDLE_AGED", label: "Middle-aged", range: "26-50", description: "Balanced body and mind. Have seen the world." },
    { group: "OLD", label: "Old", range: "51+", description: "A wealth of hard-earned knowledge." },
  ] as const;
  function choose(group: WizardState["ageGroup"]) {
    if (!group || group === data.ageGroup) return;
    update({ ageGroup: group, attributeAllowance: AGE_ALLOWANCES[group].attributes, skillAllowance: AGE_ALLOWANCES[group].skills });
  }
  return <div className="space-y-5">
    <div className="flex items-center gap-2"><h2 className="creation-section-title">Years of experience</h2><ReferenceHelp label="Age">Younger hunters have more attribute points; older hunters have more skill points. Resources above the archetype minimum also cost skill points.</ReferenceHelp></div>
    {ages.map(age => <CreationChoice key={age.group} title={age.label} selected={data.ageGroup === age.group} onChoose={() => choose(age.group)} summary={`${age.range} years / ${AGE_ALLOWANCES[age.group].attributes} attribute points / ${AGE_ALLOWANCES[age.group].skills} skill points`}>
      <p>{age.description}</p><p className="mt-3">Distribute {AGE_ALLOWANCES[age.group].attributes} points across four attributes, including their starting values of 2. Spend {AGE_ALLOWANCES[age.group].skills} points on skills and Resources above your archetype&apos;s minimum.</p>
    </CreationChoice>)}
  </div>;
}
