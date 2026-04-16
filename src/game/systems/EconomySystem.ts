import { GOODS, type GoodId } from '@/game/data/goods';
import type { Port } from '@/game/data/ports';
import { hashString, mulberry32 } from '@/utils/rng';

export function priceFor(port: Port, good: GoodId, daysSinceEpoch: number): number {
  const base = GOODS.find((g) => g.id === good)!.basePrice;
  const seed = hashString(`${port.id}:${good}:${Math.floor(daysSinceEpoch / 7)}`);
  const rng = mulberry32(seed);
  const variance = 0.75 + rng() * 0.7;
  let mult = 1;
  if (port.specialty === good) mult *= 0.6;
  if (port.scarcity === good) mult *= 1.8;
  return Math.max(1, Math.round(base * variance * mult));
}

export function stockFor(port: Port, good: GoodId, daysSinceEpoch: number): number {
  const seed = hashString(`${port.id}:stock:${good}:${Math.floor(daysSinceEpoch / 5)}`);
  const rng = mulberry32(seed);
  if (port.scarcity === good) return Math.floor(rng() * 3);
  if (port.specialty === good) return 30 + Math.floor(rng() * 50);
  return 10 + Math.floor(rng() * 25);
}
