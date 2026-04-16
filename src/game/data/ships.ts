export type ShipClass = 'sloop' | 'brig' | 'frigate' | 'galleon' | 'manOwar';

export interface ShipStats {
  class: ShipClass;
  displayKey: string;
  hullMax: number;
  sailMax: number;
  crewMin: number;
  crewMax: number;
  cannons: number;
  speed: number;
  turn: number;
  hold: number;
  price: number;
}

export const SHIPS: Record<ShipClass, ShipStats> = {
  sloop: {
    class: 'sloop',
    displayKey: 'Sloop',
    hullMax: 40,
    sailMax: 30,
    crewMin: 8,
    crewMax: 30,
    cannons: 6,
    speed: 1.35,
    turn: 1.4,
    hold: 30,
    price: 1200,
  },
  brig: {
    class: 'brig',
    displayKey: 'Brig',
    hullMax: 70,
    sailMax: 50,
    crewMin: 20,
    crewMax: 60,
    cannons: 12,
    speed: 1.15,
    turn: 1.1,
    hold: 60,
    price: 4200,
  },
  frigate: {
    class: 'frigate',
    displayKey: 'Frigate',
    hullMax: 110,
    sailMax: 80,
    crewMin: 40,
    crewMax: 120,
    cannons: 24,
    speed: 1.05,
    turn: 0.9,
    hold: 90,
    price: 12000,
  },
  galleon: {
    class: 'galleon',
    displayKey: 'Galleon',
    hullMax: 140,
    sailMax: 100,
    crewMin: 50,
    crewMax: 140,
    cannons: 20,
    speed: 0.85,
    turn: 0.7,
    hold: 160,
    price: 18000,
  },
  manOwar: {
    class: 'manOwar',
    displayKey: "Man o' War",
    hullMax: 220,
    sailMax: 160,
    crewMin: 100,
    crewMax: 280,
    cannons: 40,
    speed: 0.95,
    turn: 0.6,
    hold: 120,
    price: 45000,
  },
};
