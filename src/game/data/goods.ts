export type GoodId = 'food' | 'rum' | 'sugar' | 'tobacco' | 'cloth' | 'spice' | 'cannons' | 'gunpowder';

export interface Good {
  id: GoodId;
  basePrice: number;
  volume: number;
}

export const GOODS: readonly Good[] = [
  { id: 'food', basePrice: 10, volume: 1 },
  { id: 'rum', basePrice: 40, volume: 1 },
  { id: 'sugar', basePrice: 35, volume: 1 },
  { id: 'tobacco', basePrice: 70, volume: 1 },
  { id: 'cloth', basePrice: 55, volume: 1 },
  { id: 'spice', basePrice: 120, volume: 1 },
  { id: 'cannons', basePrice: 320, volume: 4 },
  { id: 'gunpowder', basePrice: 90, volume: 2 },
];

export const GOOD_IDS: readonly GoodId[] = GOODS.map((g) => g.id);
