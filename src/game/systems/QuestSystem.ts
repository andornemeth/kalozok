import type { GameState } from '@/state/gameStore';

export interface Quest {
  id: string;
  title: string;
  desc: string;
  progress: number;
  goal: number;
  done: boolean;
  reward: number;
}

/** Az aktív célok listáját számolja az adott állapot alapján. */
export function computeQuests(state: GameState): Quest[] {
  const q = state.quests ?? { visitedPorts: [], shipsDefeated: 0, goldAccumulated: 0, sieged: false, treasureFound: false, completedQuests: [] };
  return [
    {
      id: 'visit-3-ports',
      title: 'Tájékozódás',
      desc: 'Látogass meg 3 különböző kikötőt',
      progress: Math.min(3, q.visitedPorts.length),
      goal: 3,
      done: q.completedQuests.includes('visit-3-ports'),
      reward: 200,
    },
    {
      id: 'defeat-3-ships',
      title: 'Vér a tengeren',
      desc: 'Győzz le 3 ellenséges hajót',
      progress: Math.min(3, q.shipsDefeated),
      goal: 3,
      done: q.completedQuests.includes('defeat-3-ships'),
      reward: 500,
    },
    {
      id: 'hoard-5000',
      title: 'Dukát-gyűjtő',
      desc: 'Halmozz fel 5000 aranyat összesen',
      progress: Math.min(5000, q.goldAccumulated),
      goal: 5000,
      done: q.completedQuests.includes('hoard-5000'),
      reward: 800,
    },
    {
      id: 'siege-one-city',
      title: 'Ostromló',
      desc: 'Végy be egy várost',
      progress: q.sieged ? 1 : 0,
      goal: 1,
      done: q.completedQuests.includes('siege-one-city'),
      reward: 1000,
    },
    {
      id: 'find-treasure',
      title: 'Kincskereső',
      desc: 'Találd meg az első kincset',
      progress: q.treasureFound ? 1 : 0,
      goal: 1,
      done: q.completedQuests.includes('find-treasure'),
      reward: 600,
    },
  ];
}

/** Lezárja a teljesült célokat, és jutalmat ad érte. */
export function checkQuestCompletion(
  state: GameState,
  onReward: (id: string, title: string, reward: number) => void,
): void {
  const quests = computeQuests(state);
  for (const qu of quests) {
    if (!qu.done && qu.progress >= qu.goal) {
      state.completeQuest(qu.id);
      state.addGold(qu.reward);
      onReward(qu.id, qu.title, qu.reward);
    }
  }
}
