const sourceBook = 'Vaesen: Nordic Horror Roleplaying';
const combatExtras = [
  'Add 1 damage per extra success spent; this option can be repeated.',
  'Exchange initiative cards with your opponent.',
  'Inflict mental Conditions instead of physical Conditions.',
  'Move the opponent to another zone or a chosen position within the current zone.',
  'Disarm the opponent or make them drop an item. Retrieving an item takes a fast action.',
];
const skill = (key, name, attribute, sourcePages, description, extraSuccesses = [], guidance = []) => ({ key, name, attribute, sourceBook, sourcePages, description, extraSuccesses, guidance });
const skills = [
  skill('agility', 'Agility', 'physique', [44], 'Run, chase, escape, jump, climb, and move with flexibility. In combat, use Agility to evade an attack or escape.', [
    'When a group performs the same action, transfer successes to help the others succeed.',
    'Exchange initiative cards with the enemy.',
    'Give the enemy one mental Condition; choose this effect at most once per turn.',
    'Move one zone away from the enemy, or place the enemy in a chosen part of a zone.',
    'Do something else while evading, such as performing a ritual or lighting a fire.',
  ]),
  skill('closeCombat', 'Close Combat', 'physique', [44], 'Fight with melee weapons. Extra successes can improve the attack or create a tactical opportunity.', combatExtras),
  skill('force', 'Force', 'physique', [44], 'Lift heavy objects, withstand pain and hardship, and endure travel, hunger, or thirst without taking a Condition. Force may also help with physical repairs. Use it for unarmed fighting, wrestling, and grappling.', [
    'Share extra successes with investigators enduring the same hardship.', ...combatExtras,
    'Grapple the opponent. Escaping requires a successful opposed roll.',
  ]),
  skill('medicine', 'Medicine', 'precision', [44,45], 'Apply anatomical and medical knowledge to illness, injury, and treatment. Successful urgent treatment can save a physically critically injured investigator and remove Broken. During a full day of safe treatment, success heals three physical Conditions distributed among your patients; Broken can also be healed.', [
    'Urgent treatment: each extra success heals one additional physical Condition.',
    'Daily treatment: each extra success heals another three physical Conditions, distributed among the patients.',
  ], [
    'Daily patients need bed rest, safety, food, drink, and medical equipment. Make one Medicine test per day of treatment.',
    'After failed urgent treatment, obtain new supplies, a better location, or another medically trained helper before trying again.',
    'Failed daily treatment normally wastes the day; the GM may let an enemy act.',
  ]),
  skill('rangedCombat', 'Ranged Combat', 'precision', [45], 'Attack with ranged weapons or explosives. Respect the weapon profile, range, and applicable combat rules.', combatExtras),
  skill('stealth', 'Stealth', 'precision', [45], 'Sneak, hide, pick locks, and perform sleight of hand or card tricks.', ['Extra successes improve how well the action succeeds.'], ['Someone detecting a sneaking character opposes Stealth with Vigilance.']),
  skill('investigation', 'Investigation', 'logic', [45], 'Examine a scene, room, or body and work out what happened. A successful test gives useful clues.', [
    'The GM may provide additional clues, explain their context, or otherwise improve the result.',
  ], [
    'Do not gate finding concealed doors, traps, or clues behind this skill. Describing a search in the correct place should reveal anything that can actually be seen. A test may provide a GM-approved bonus.',
    'Information from a successful test should be accurate and useful, not deliberately vague.',
  ]),
  skill('learning', 'Learning', 'logic', [45], 'Use education, logic, and knowledge to understand what you encounter. Translate languages, follow customs, and understand mechanisms, rituals, or magical items. With GM approval, Learning can provide basic knowledge about a vaesen.', [
    'Extra successes may reveal further information.',
  ], ['Some questions require books or another information source; others cannot be answered with a test. The GM decides what knowledge is available.']),
  skill('vigilance', 'Vigilance', 'logic', [46], 'Notice someone sneaking, follow tracks, and interpret a situation you are watching. Identify likely developments, leaders, threats, or useful approaches.', [
    'Each extra success gives +1 to a later skill test where the observed information is useful.',
  ], [
    'Oppose a sneaking character\'s Stealth with Vigilance. Vigilance also detects someone secretly slipping an object into your pocket.',
    'Failure may mean misreading the situation, revealing your surveillance, or appearing hostile.',
  ]),
  skill('inspiration', 'Inspiration', 'empathy', [46], 'Address and influence crowds, guide and encourage friends, and create or interpret art. Successful urgent support can help a mentally critically injured investigator avoid lasting Broken and removes Broken. A day devoted to safe support heals three mental Conditions distributed among your friends; Broken can also be healed.', [
    'Urgent support: each extra success heals one additional mental Condition.',
    'Daily support: each extra success heals another three mental Conditions, distributed among participants.',
  ], [
    'Daily support requires safety, food, drink, willing close contact or dialogue, and a whole day spent together without other activities.',
    'After a failed urgent attempt, change how you reach the person, seek help, or move somewhere else before trying again.',
    'Failed daily support normally wastes the day; the GM may let an enemy act.',
  ]),
  skill('manipulation', 'Manipulation', 'empathy', [46,47], 'Persuade through negotiation, charm, deception, bribery, or other social methods. Describe your goal and approach before rolling. This skill also covers trading and buying goods or services during a mystery.', [
    'Each extra success may inflict one mental Condition on the opponent.',
  ], [
    'An investigator can resist passive influence with Observation. When both sides try to influence each other, agree to both goals before an opposed Manipulation roll.',
    'The losing side may set a stipulation for cooperation, such as a promise of secrecy or answering a question.',
    'Success is not mind control: the goal must be reasonable and later events can change someone\'s decision.',
    'Failure may cause distrust, dislike, a Condition, or stronger commitment to the original position.',
  ]),
  skill('observation', 'Observation', 'empathy', [47], 'Understand a person\'s feelings, thoughts, and plans through conversation or time in their presence. Success lets you ask specific questions and receive the GM\'s answers or impressions, including signs of deception or harmful intent.', [
    'Each extra success gives +1 to a test where the insight is useful.',
  ], [
    'On failure, you reveal yourself and must disclose your own character\'s thoughts, feelings, and intentions to the other party.',
    'Use Observation to resist influence in a social situation where your character is passive.',
    'Successful information tests should yield accurate, useful answers.',
  ]),
];
module.exports = { skills };
