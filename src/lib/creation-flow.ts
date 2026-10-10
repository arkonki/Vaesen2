import { initialState, firstIncompleteStep, type WizardState } from "./character-draft";
import type { ArchetypeTemplate } from "./archetype-template";

export const CREATION_STEPS = ["Archetype", "Age", "Name", "Attributes", "Skills", "Background", "Equipment", "Review"];
export const CREATION_HINTS = [
  "Explore the archetypes, then choose the starting point for your hunter.",
  "Age determines the points available for attributes and skills.",
  "Use your archetype's suggested names or write your own.",
  "Allocate all attribute points. Only your main attribute can reach 5.",
  "Allocate all skill points. Increasing Resources uses the same allowance.",
  "Choose one talent and define your motivation, trauma, and dark secret.",
  "Take the included equipment and resolve each alternative choice.",
  "Check your hunter's sheet. You can return to earlier steps before creating it.",
];

export function changesCreationFoundation(data: WizardState, fields: Partial<WizardState>) {
  return !!((fields.archetypeId && fields.archetypeId !== data.archetypeId) || (fields.ageGroup && fields.ageGroup !== data.ageGroup));
}
export function hasDependentChoices(data: WizardState) {
  return Object.keys(data.attributes).some(key => data.attributes[key as keyof typeof data.attributes] !== initialState.attributes[key as keyof typeof data.attributes]) ||
    Object.values(data.skills).some(value => value !== 0) || !!data.talentId || data.equipment.length > 0 || data.resources !== data.minResources;
}
export function updateCreationState(data: WizardState, fields: Partial<WizardState>): WizardState {
  const reset = changesCreationFoundation(data, fields);
  return { ...data, ...(reset ? { attributes: { ...initialState.attributes }, skills: { ...initialState.skills }, talentId: "", equipment: [], equipmentChoices: {}, resources: fields.minResources ?? data.minResources } : {}), ...fields };
}
export function canContinueCreation(step: number, data: WizardState, archetype?: ArchetypeTemplate) {
  return firstIncompleteStep(data, archetype) > step;
}
