import { WizardState } from "./wizard";

export default function Step2Age({ data, update, onNext, onPrev }: any) {

  const setAge = (group: WizardState['ageGroup'], attrPts: number, skillPts: number) => {
    update({ 
      ageGroup: group,
      attributeAllowance: attrPts,
      skillAllowance: skillPts
    });
  };

  const ages = [
    { group: "YOUNG", label: "Young", range: "17-25", attrs: 15, skills: 10, desc: "Brimming with vitality, but lacking experience." },
    { group: "MIDDLE_AGED", label: "Middle-aged", range: "26-50", attrs: 14, skills: 12, desc: "Balanced body and mind. Have seen the world." },
    { group: "OLD", label: "Old", range: "51+", attrs: 13, skills: 14, desc: "Frail bodies, but a wealth of hard-earned knowledge." },
  ];

  const isValid = data.ageGroup !== "";

  return (
    <div className="space-y-8 animate-in fade-in flex flex-col h-full">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">How old are you?</h2>
        <p className="text-neutral-400">Your age determines the number of Attribute and Skill points available.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ages.map((a) => {
          const selected = data.ageGroup === a.group;
          return (
            <button
              key={a.group}
              onClick={() => setAge(a.group as any, a.attrs, a.skills)}
              className={`text-left p-6 rounded-lg border transition-all flex flex-col h-full ${
                selected 
                 ? 'bg-indigo-900 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                 : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <h3 className={`font-bold text-xl mb-1 ${selected ? 'text-white' : 'text-neutral-200'}`}>{a.label}</h3>
              <p className="text-sm text-indigo-400 mb-4">{a.range} years</p>
              
              <div className="space-y-2 mt-auto text-sm">
                <div className="flex justify-between items-center bg-neutral-900 p-2 rounded border border-neutral-800">
                  <span className="text-neutral-400">Attributes</span>
                  <span className="font-bold text-white">{a.attrs}</span>
                </div>
                <div className="flex justify-between items-center bg-neutral-900 p-2 rounded border border-neutral-800">
                  <span className="text-neutral-400">Skills</span>
                  <span className="font-bold text-white">{a.skills}</span>
                </div>
              </div>
              <p className="text-xs text-neutral-500 mt-4 leading-relaxed">{a.desc}</p>
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex justify-between flex-grow items-end border-t border-neutral-800 pt-6">
        <button onClick={onPrev} className="text-neutral-400 hover:text-white px-4 py-2 transition-colors">
          Back
        </button>
        <button 
          disabled={!isValid}
          onClick={onNext}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-md font-bold transition-all"
        >
          Next Step: Attributes
        </button>  
      </div>
    </div>
  )
}
