import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GOOD_IDS, type GoodId } from '@/game/data/goods';
import { SHIPS, type ShipClass } from '@/game/data/ships';
import type { NationId } from '@/game/data/ports';

export type DifficultyId = 'easy' | 'normal' | 'hard';

export type Cargo = Record<GoodId, number>;

export interface PlayerShip {
  class: ShipClass;
  hull: number;
  sail: number;
  crew: number;
  cannons: number;
}

export interface CareerState {
  name: string;
  nation: NationId;
  era: number;
  difficulty: DifficultyId;
  daysAtSea: number;
  gold: number;
  fame: number;
  rank: number;
}

export interface FamilyState {
  anikoMorale: number;
  csillagAge: number;
  borokaAge: number;
  bond: number;
  visits: number;
  lastVisitDay: number;
  goldGiven: number;
  storyShown: boolean;
}

export interface Reputation {
  magyar: number;
  rac: number;
  bunyevac: number;
  olah: number;
  tot: number;
  oszman: number;
  svab: number;
}

export const EMPTY_REPUTATION: Reputation = {
  magyar: 0,
  rac: 0,
  bunyevac: 0,
  olah: 0,
  tot: 0,
  oszman: 0,
  svab: 0,
};

export interface Flags {
  tutorialMove: boolean;
  tutorialPort: boolean;
  tutorialCombat: boolean;
}

export interface QuestProgress {
  visitedPorts: string[];
  shipsDefeated: number;
  goldAccumulated: number;
  sieged: boolean;
  treasureFound: boolean;
  completedQuests: string[];
}

export type SceneKey = 'title' | 'world' | 'port' | 'naval' | 'duel' | 'land' | 'treasure' | 'encounter';

export interface GameState {
  started: boolean;
  scene: SceneKey;
  career: CareerState;
  family: FamilyState;
  ship: PlayerShip;
  cargo: Cargo;
  reputation: Reputation;
  morale: number;
  food: number;
  treasureFragments: number;
  currentPortId: string | null;
  seed: number;
  flags: Flags;
  achievements: string[];
  quests: QuestProgress;
  worldPos: { x: number; y: number; heading: number } | null;
  setScene: (s: SceneKey) => void;
  newCareer: (input: { name: string; nation: NationId; era: number; difficulty: DifficultyId; seed: number }) => void;
  dockAt: (portId: string) => void;
  leavePort: () => void;
  addGold: (n: number) => void;
  spendGold: (n: number) => boolean;
  changeReputation: (n: NationId, delta: number) => void;
  damageShip: (hull: number, sail: number, crewLost: number) => void;
  repairShip: () => void;
  patchShip: (hullPct: number, sailPct: number) => void;
  setCrew: (n: number) => void;
  addCargo: (g: GoodId, n: number) => void;
  removeCargo: (g: GoodId, n: number) => void;
  consumeFood: (n: number) => void;
  addFood: (n: number) => void;
  adjustMorale: (d: number) => void;
  addTreasureFragment: () => void;
  clearTreasureFragments: () => void;
  unlockAchievement: (id: string) => void;
  replaceShip: (cls: ShipClass) => void;
  setFlag: (k: keyof Flags, v: boolean) => void;
  advanceDays: (d: number) => void;
  recordPortVisit: (portId: string) => void;
  recordShipDefeated: () => void;
  recordSiege: () => void;
  recordTreasureFound: () => void;
  completeQuest: (id: string) => void;
  setWorldPos: (p: { x: number; y: number; heading: number } | null) => void;
  visitFamily: (action: 'rest' | 'giveGold' | 'play', amount?: number) => void;
  markStoryShown: () => void;
  loadState: (s: GameState) => void;
}

function emptyCargo(): Cargo {
  const c = {} as Cargo;
  for (const id of GOOD_IDS) c[id] = 0;
  return c;
}

const initialFlags: Flags = {
  tutorialMove: false,
  tutorialPort: false,
  tutorialCombat: false,
};

const initialQuests: QuestProgress = {
  visitedPorts: [],
  shipsDefeated: 0,
  goldAccumulated: 0,
  sieged: false,
  treasureFound: false,
  completedQuests: [],
};

const initialCareer: CareerState = {
  name: '',
  nation: 'magyar',
  era: 1680,
  difficulty: 'normal',
  daysAtSea: 0,
  gold: 500,
  fame: 0,
  rank: 0,
};

const initialFamily: FamilyState = {
  anikoMorale: 70,
  csillagAge: 6,
  borokaAge: 4,
  bond: 60,
  visits: 0,
  lastVisitDay: -999,
  goldGiven: 0,
  storyShown: false,
};

const initialShip: PlayerShip = {
  class: 'sloop',
  hull: SHIPS.sloop.hullMax,
  sail: SHIPS.sloop.sailMax,
  crew: 14,
  cannons: SHIPS.sloop.cannons,
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      started: false,
      scene: 'title',
      career: initialCareer,
      family: initialFamily,
      ship: initialShip,
      cargo: emptyCargo(),
      reputation: { ...EMPTY_REPUTATION },
      morale: 70,
      food: 40,
      treasureFragments: 0,
      currentPortId: null,
      seed: 1,
      flags: initialFlags,
      achievements: [],
      quests: initialQuests,
      worldPos: null,

      setScene: (s) => set({ scene: s }),

      newCareer: ({ name, nation, era, difficulty, seed }) =>
        set({
          started: true,
          scene: 'world',
          seed,
          career: {
            ...initialCareer,
            name,
            nation,
            era,
            difficulty,
            gold: difficulty === 'easy' ? 1200 : difficulty === 'hard' ? 250 : 500,
          },
          family: { ...initialFamily },
          ship: { ...initialShip },
          cargo: emptyCargo(),
          reputation: { ...EMPTY_REPUTATION },
          morale: 70,
          food: 40,
          treasureFragments: 0,
          currentPortId: null,
          flags: initialFlags,
          achievements: [],
          quests: initialQuests,
          worldPos: null,
        }),

      dockAt: (portId) =>
        set((s) => {
          const q = s.quests ?? initialQuests;
          return {
            currentPortId: portId,
            scene: 'port' as const,
            quests: q.visitedPorts.includes(portId)
              ? q
              : { ...q, visitedPorts: [...q.visitedPorts, portId] },
          };
        }),
      leavePort: () => set({ currentPortId: null, scene: 'world' }),

      addGold: (n) =>
        set((s) => ({
          career: { ...s.career, gold: s.career.gold + n },
          quests: { ...s.quests, goldAccumulated: s.quests.goldAccumulated + Math.max(0, n) },
        })),
      spendGold: (n) => {
        const { career } = get();
        if (career.gold < n) return false;
        set({ career: { ...career, gold: career.gold - n } });
        return true;
      },

      changeReputation: (n, delta) =>
        set((s) => {
          if (n === 'crnagorac') return s;
          const current = s.reputation[n];
          const next = Math.max(-100, Math.min(100, current + delta));
          return { reputation: { ...s.reputation, [n]: next } };
        }),

      damageShip: (hull, sail, crewLost) =>
        set((s) => ({
          ship: {
            ...s.ship,
            hull: Math.max(0, s.ship.hull - hull),
            sail: Math.max(0, s.ship.sail - sail),
            crew: Math.max(0, s.ship.crew - crewLost),
          },
        })),

      repairShip: () =>
        set((s) => {
          const stats = SHIPS[s.ship.class];
          return { ship: { ...s.ship, hull: stats.hullMax, sail: stats.sailMax } };
        }),

      patchShip: (hullPct, sailPct) =>
        set((s) => {
          const stats = SHIPS[s.ship.class];
          const hull = Math.min(stats.hullMax, s.ship.hull + Math.round(stats.hullMax * hullPct));
          const sail = Math.min(stats.sailMax, s.ship.sail + Math.round(stats.sailMax * sailPct));
          return { ship: { ...s.ship, hull, sail } };
        }),

      setCrew: (n) =>
        set((s) => {
          const stats = SHIPS[s.ship.class];
          return { ship: { ...s.ship, crew: Math.max(0, Math.min(stats.crewMax, n)) } };
        }),

      addCargo: (g, n) =>
        set((s) => ({ cargo: { ...s.cargo, [g]: Math.max(0, s.cargo[g] + n) } })),

      removeCargo: (g, n) =>
        set((s) => ({ cargo: { ...s.cargo, [g]: Math.max(0, s.cargo[g] - n) } })),

      consumeFood: (n) => set((s) => ({ food: Math.max(0, s.food - n) })),
      addFood: (n) => set((s) => ({ food: s.food + n })),

      adjustMorale: (d) => set((s) => ({ morale: Math.max(0, Math.min(100, s.morale + d)) })),

      addTreasureFragment: () =>
        set((s) => ({ treasureFragments: Math.min(4, s.treasureFragments + 1) })),
      clearTreasureFragments: () => set({ treasureFragments: 0 }),

      unlockAchievement: (id) =>
        set((s) => (s.achievements.includes(id) ? s : { achievements: [...s.achievements, id] })),

      replaceShip: (cls) => {
        const stats = SHIPS[cls];
        set((s) => ({
          ship: {
            class: cls,
            hull: stats.hullMax,
            sail: stats.sailMax,
            crew: Math.min(stats.crewMax, Math.max(stats.crewMin, s.ship.crew)),
            cannons: stats.cannons,
          },
        }));
      },

      setFlag: (k, v) => set((s) => ({ flags: { ...s.flags, [k]: v } })),

      advanceDays: (d) =>
        set((s) => ({
          career: { ...s.career, daysAtSea: s.career.daysAtSea + d },
          food: Math.max(0, s.food - Math.ceil(d * (s.ship.crew / 10))),
          morale: Math.max(0, s.morale - (s.food <= 0 ? 4 * d : 0)),
        })),

      recordPortVisit: (portId) =>
        set((s) => ({
          quests: s.quests.visitedPorts.includes(portId)
            ? s.quests
            : { ...s.quests, visitedPorts: [...s.quests.visitedPorts, portId] },
        })),

      recordShipDefeated: () =>
        set((s) => ({ quests: { ...s.quests, shipsDefeated: s.quests.shipsDefeated + 1 } })),

      recordSiege: () => set((s) => ({ quests: { ...s.quests, sieged: true } })),
      recordTreasureFound: () => set((s) => ({ quests: { ...s.quests, treasureFound: true } })),
      completeQuest: (id) =>
        set((s) =>
          s.quests.completedQuests.includes(id)
            ? s
            : { quests: { ...s.quests, completedQuests: [...s.quests.completedQuests, id] } },
        ),

      setWorldPos: (p) => set({ worldPos: p }),

      visitFamily: (action, amount = 0) =>
        set((s) => {
          const fam = s.family ?? initialFamily;
          const days = s.career.daysAtSea;
          const baseBond = Math.min(100, fam.bond + 2);
          if (action === 'rest') {
            return {
              family: { ...fam, visits: fam.visits + 1, lastVisitDay: days, bond: baseBond },
              morale: Math.min(100, s.morale + 20),
              food: s.food + 15,
            };
          }
          if (action === 'giveGold') {
            return {
              family: {
                ...fam,
                visits: fam.visits + 1,
                lastVisitDay: days,
                goldGiven: fam.goldGiven + amount,
                bond: Math.min(100, fam.bond + 5),
                anikoMorale: Math.min(100, fam.anikoMorale + 6),
              },
              career: { ...s.career, gold: s.career.gold - amount, fame: s.career.fame + Math.floor(amount / 40) },
            };
          }
          // play with girls
          return {
            family: { ...fam, visits: fam.visits + 1, lastVisitDay: days, bond: Math.min(100, fam.bond + 8) },
            career: { ...s.career, fame: s.career.fame + 3 },
            morale: Math.min(100, s.morale + 10),
          };
        }),

      markStoryShown: () => set((s) => ({ family: { ...(s.family ?? initialFamily), storyShown: true } })),

      loadState: (s) => set({ ...s }),
    }),
    {
      name: 'kalozok:game',
      storage: createJSONStorage(() => localStorage),
      version: 5,
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Record<string, unknown>;
        if (!s.quests) s.quests = initialQuests;
        if (s.worldPos === undefined) s.worldPos = null;
        if (!s.achievements) s.achievements = [];
        if (!s.flags) s.flags = initialFlags;
        if (version < 3) {
          s.worldPos = null;
        }
        if (version < 4) {
          s.currentPortId = null;
          const q = (s.quests as QuestProgress | undefined) ?? initialQuests;
          s.quests = { ...q, visitedPorts: [] };
          s.family = { ...initialFamily };
          s.worldPos = null;
        }
        // v5: Pannon-tenger váltás — új nemzetlista, új port-ID-k, új
        // reputation kulcsok. Minden térkép-függő állapotot nullázunk.
        if (version < 5) {
          s.currentPortId = null;
          const q = (s.quests as QuestProgress | undefined) ?? initialQuests;
          s.quests = { ...q, visitedPorts: [] };
          s.worldPos = null;
          s.reputation = { ...EMPTY_REPUTATION };
          const c = (s.career as Partial<CareerState> | undefined) ?? {};
          s.career = { ...initialCareer, ...c, nation: 'magyar' };
        }
        if (!s.family) s.family = { ...initialFamily };
        return s as unknown as GameState;
      },
    },
  ),
);
