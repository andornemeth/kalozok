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

export interface Reputation {
  england: number;
  spain: number;
  france: number;
  netherlands: number;
}

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

export type SceneKey = 'title' | 'world' | 'port' | 'naval' | 'duel' | 'land' | 'treasure';

export interface GameState {
  started: boolean;
  scene: SceneKey;
  career: CareerState;
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
  nation: 'pirate',
  era: 1680,
  difficulty: 'normal',
  daysAtSea: 0,
  gold: 500,
  fame: 0,
  rank: 0,
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
      ship: initialShip,
      cargo: emptyCargo(),
      reputation: { england: 0, spain: 0, france: 0, netherlands: 0 },
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
          ship: { ...initialShip },
          cargo: emptyCargo(),
          reputation: { england: 0, spain: 0, france: 0, netherlands: 0 },
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
        set((s) => ({
          currentPortId: portId,
          scene: 'port',
          quests: s.quests.visitedPorts.includes(portId)
            ? s.quests
            : { ...s.quests, visitedPorts: [...s.quests.visitedPorts, portId] },
        })),
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
          if (n === 'pirate') return s;
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

      loadState: (s) => set({ ...s }),
    }),
    {
      name: 'kalozok:game',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
