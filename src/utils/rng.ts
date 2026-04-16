export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dailySeed(d: Date = new Date()): number {
  const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
  return hashString(`kalozok:${key}`);
}

export function pick<T>(rng: RNG, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

export function randInt(rng: RNG, min: number, maxInclusive: number): number {
  return Math.floor(rng() * (maxInclusive - min + 1)) + min;
}

export function randRange(rng: RNG, min: number, max: number): number {
  return rng() * (max - min) + min;
}
