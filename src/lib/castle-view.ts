import type { UpgradeOption } from "./hq-upgrades";
export type CastleView = {
  id: string;
  partyId: string;
  name: string;
  history: string;
  developmentPoints: number;
  isGM: boolean;
  owned: Array<{
    id: string;
    key: string;
    name: string;
    ordinal: number;
    category: string;
    status: string;
    legacy: boolean;
    personName: string | null;
    personDescription: string | null;
    stats: unknown;
    motivation?: string | null;
    darkSecret?: string | null;
    relationships: string | null;
  }>;
  catalogue: Array<
    UpgradeOption & {
      price: number;
      missing: string[];
      count: number;
      introduced: boolean;
    }
  >;
  discoveries: Array<{
    id: string;
    key: string | null;
    hint: string;
    identified: boolean;
  }>;
  members: Array<{
    id: string;
    name: string;
    physicalBase: number;
    mentalBase: number;
    conditions: string[];
  }>;
  mysteries: Array<{ id: string; title: string; status: string }>;
  reviews: Array<{ mysteryId: string; points: number; answers: boolean[] }>;
  uses: Array<{
    id: string;
    upgradeId: string;
    mysteryId: string;
    characterId: string | null;
    channel: string;
    summary: string;
    effects: unknown;
    expired: boolean;
    sessionId: string | null;
  }>;
  sessions: Array<{ id: string; mysteryId: string; name: string }>;
  threats: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    countdown: string[];
    step: number;
    successes: number | null;
  }>;
  occasions: Array<{
    id: string;
    closedAt: string | null;
    purchases: Array<{
      id: string;
      paidCost: number;
      dice: number;
      rolls: number[];
      successes: number;
      name: string;
    }>;
  }>;
  ledger: Array<{
    id: string;
    points: number;
    description: string;
    createdAt: string;
  }>;
  facts: Array<{ key: string; evidence: string }>;
  questions: string[];
  factOptions: Record<string, string>;
  threatOptions: string[];
  capacity: { common: number; occult: number };
  stash: { common: number; occult: number };
  items: Array<{
    id: string;
    name: string;
    type: string;
    availability: number;
    skill: string | null;
  }>;
};
