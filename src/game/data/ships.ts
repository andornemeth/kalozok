export type ShipClass = 'sloop' | 'brig' | 'frigate' | 'galleon' | 'manOwar';
export type ShipSilhouette = 'small' | 'medium' | 'large';

export interface ShipStats {
  class: ShipClass;
  displayKey: string;
  silhouette: ShipSilhouette;
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
    silhouette: 'small',
    hullMax: 40,
    sailMax: 30,
    crewMin: 8,
    crewMax: 30,
    cannons: 6,
    speed: 1.4,
    turn: 1.5,
    hold: 30,
    price: 1200,
  },
  brig: {
    class: 'brig',
    displayKey: 'Brig',
    silhouette: 'medium',
    hullMax: 70,
    sailMax: 50,
    crewMin: 20,
    crewMax: 60,
    cannons: 12,
    speed: 1.18,
    turn: 1.15,
    hold: 60,
    price: 4200,
  },
  frigate: {
    class: 'frigate',
    displayKey: 'Frigate',
    silhouette: 'medium',
    hullMax: 110,
    sailMax: 80,
    crewMin: 40,
    crewMax: 120,
    cannons: 24,
    speed: 1.08,
    turn: 0.95,
    hold: 90,
    price: 12000,
  },
  galleon: {
    class: 'galleon',
    displayKey: 'Galleon',
    silhouette: 'large',
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
    silhouette: 'large',
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
