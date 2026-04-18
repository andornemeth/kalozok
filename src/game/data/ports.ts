import type { GoodId } from './goods';

export type NationId = 'england' | 'spain' | 'france' | 'netherlands' | 'pirate';

export interface Port {
  id: string;
  name: string;
  nation: NationId;
  x: number;
  y: number;
  size: 'small' | 'medium' | 'large' | 'capital';
  specialty: GoodId;
  scarcity: GoodId;
}

// Karib világ logikai mérete: 1600 × 1100. Pozíciók kb. valós földrajz alapján.
export const WORLD_W = 1600;
export const WORLD_H = 1100;

export const PORTS: readonly Port[] = [
  // English colonies
  { id: 'charleston', name: 'Charles Towne', nation: 'england', x: 580, y: 110, size: 'medium', specialty: 'tobacco', scarcity: 'spice' },
  { id: 'port-royal', name: 'Port Royal', nation: 'england', x: 720, y: 470, size: 'capital', specialty: 'tobacco', scarcity: 'spice' },
  { id: 'kingston', name: 'Kingston', nation: 'england', x: 770, y: 490, size: 'medium', specialty: 'sugar', scarcity: 'gunpowder' },
  { id: 'barbados', name: 'Bridgetown', nation: 'england', x: 1450, y: 620, size: 'large', specialty: 'sugar', scarcity: 'cloth' },

  // Spain — capitales y plazas
  { id: 'havana', name: 'La Habana', nation: 'spain', x: 540, y: 320, size: 'capital', specialty: 'tobacco', scarcity: 'cloth' },
  { id: 'santiago', name: 'Santiago de Cuba', nation: 'spain', x: 820, y: 430, size: 'large', specialty: 'sugar', scarcity: 'cannons' },
  { id: 'santo-domingo', name: 'Santo Domingo', nation: 'spain', x: 1050, y: 480, size: 'capital', specialty: 'sugar', scarcity: 'food' },
  { id: 'san-juan', name: 'San Juan', nation: 'spain', x: 1180, y: 450, size: 'large', specialty: 'rum', scarcity: 'cannons' },
  { id: 'cartagena', name: 'Cartagena', nation: 'spain', x: 900, y: 800, size: 'capital', specialty: 'spice', scarcity: 'food' },
  { id: 'porto-bello', name: 'Portobelo', nation: 'spain', x: 720, y: 880, size: 'large', specialty: 'spice', scarcity: 'gunpowder' },
  { id: 'maracaibo', name: 'Maracaibo', nation: 'spain', x: 1050, y: 770, size: 'large', specialty: 'cloth', scarcity: 'food' },
  { id: 'caracas', name: 'Caracas', nation: 'spain', x: 1200, y: 790, size: 'medium', specialty: 'tobacco', scarcity: 'cannons' },
  { id: 'veracruz', name: 'Veracruz', nation: 'spain', x: 200, y: 540, size: 'capital', specialty: 'sugar', scarcity: 'cannons' },
  { id: 'campeche', name: 'Campeche', nation: 'spain', x: 320, y: 580, size: 'medium', specialty: 'cloth', scarcity: 'gunpowder' },
  { id: 'st-augustine', name: 'San Agustín', nation: 'spain', x: 480, y: 200, size: 'small', specialty: 'tobacco', scarcity: 'rum' },

  // France
  { id: 'petit-goave', name: 'Petit-Goâve', nation: 'france', x: 940, y: 470, size: 'medium', specialty: 'cloth', scarcity: 'tobacco' },
  { id: 'fort-royal', name: 'Fort-de-France', nation: 'france', x: 1390, y: 570, size: 'large', specialty: 'rum', scarcity: 'gunpowder' },
  { id: 'cayenne', name: 'Cayenne', nation: 'france', x: 1500, y: 900, size: 'small', specialty: 'spice', scarcity: 'food' },

  // Netherlands
  { id: 'curacao', name: 'Willemstad', nation: 'netherlands', x: 1180, y: 730, size: 'medium', specialty: 'cloth', scarcity: 'rum' },
  { id: 'st-eustatius', name: 'Sint Eustatius', nation: 'netherlands', x: 1310, y: 470, size: 'small', specialty: 'gunpowder', scarcity: 'sugar' },

  // Pirate havens
  { id: 'nassau', name: 'Nassau', nation: 'pirate', x: 660, y: 250, size: 'medium', specialty: 'rum', scarcity: 'cloth' },
  { id: 'tortuga', name: 'Tortuga', nation: 'pirate', x: 920, y: 410, size: 'medium', specialty: 'rum', scarcity: 'food' },
];

export function findPort(id: string): Port | undefined {
  return PORTS.find((p) => p.id === id);
}

export function nationColor(n: NationId): number {
  return { england: 0xc0392b, spain: 0xf2c94c, france: 0x3470d6, netherlands: 0xff8c42, pirate: 0x1c1c1c }[n];
}

export function nationFlagAccent(n: NationId): number {
  return { england: 0xfbf5e3, spain: 0xc0392b, france: 0xfbf5e3, netherlands: 0x1c4587, pirate: 0xfbf5e3 }[n];
}
