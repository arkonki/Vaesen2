const sourceBook = 'Vaesen: Nordic Horror Roleplaying';
const item = (key, name, type, sourcePage, effect, requirements, skills = []) => ({
  bookKey: `core-starting-${key}`, name, type, sourceBook, sourcePage, description: effect, bonus: 0, availability: 0,
  protection: null, agilityPenalty: null, doses: null, toxicity: null, damage: null, range: null, skill: null,
  usages: [{ label: 'Starting equipment effect', kind: 'NARRATIVE', skills, bonus: 0, effect, requirements: `${requirements} No independent Availability is specified in this reference; the GM sets any later purchase terms.`, damage: null, rangeMin: null, rangeMax: null }],
});
const startingItems = [
  item('walking-stick', 'Walking stick', 'GEAR', 34, 'A walking stick is included in the Vagabond\'s starting gear.', 'No bonus or weapon statistics are assigned by the archetype entry.'),
  item('stags-horn', "Powdered stag's horn", 'MAGIC', 123, 'You may use Observation to resist a vaesen\'s temptations.', 'Risk: feel unloved and take one mental Condition each hour until someone succeeds with Inspiration. This replaces the applicable resistance skill; it is not a flat bonus.', ['observation']),
  item('holy-water', 'Holy water', 'GEAR', 123, 'Temporarily repel undead by opposing their Magic with Inspiration.', 'Requires sanctified water; the GM adjudicates the effect.', ['inspiration']),
  item('old-bible', 'Old Bible', 'GEAR', 123, 'Add Inspiration to the attribute test when making a Fear test.', 'Holy scripture. Apply this effect to Fear, not every Inspiration roll.', ['inspiration']),
];
module.exports = { startingItems };
