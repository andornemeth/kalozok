import mitt from 'mitt';

export type GameEvents = {
  'scene:changed': { key: string };
  'scene:start': { key: 'World' | 'Naval' | 'Duel' | 'Land' | 'Treasure'; data?: unknown };
  'world:nearPort': { portId: string } | null;
  'world:sightEnemy': { enemyId: string; fled?: boolean };
  'naval:end': { outcome: 'victory' | 'defeat' | 'fled'; boardedShip?: string };
  'duel:end': { outcome: 'victory' | 'defeat' };
  'land:end': { outcome: 'victory' | 'defeat' };
  'treasure:end': { gold: number };
  'toast': { message: string; kind?: 'info' | 'good' | 'bad' };
  'ui:request': { kind: 'pause' | 'settings' | 'menu' };
};

export const bus = mitt<GameEvents>();
