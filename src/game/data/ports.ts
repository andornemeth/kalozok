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

export const PORTS: readonly Port[] = [
  { id: 'port-royal', name: 'Port Royal', nation: 'england', x: 260, y: 330, size: 'capital', specialty: 'tobacco', scarcity: 'spice' },
  { id: 'kingston', name: 'Kingston', nation: 'england', x: 260, y: 345, size: 'medium', specialty: 'sugar', scarcity: 'gunpowder' },
  { id: 'nassau', name: 'Nassau', nation: 'pirate', x: 280, y: 210, size: 'medium', specialty: 'rum', scarcity: 'cloth' },
  { id: 'tortuga', name: 'Tortuga', nation: 'pirate', x: 340, y: 280, size: 'medium', specialty: 'rum', scarcity: 'food' },
  { id: 'havana', name: 'La Habana', nation: 'spain', x: 200, y: 250, size: 'capital', specialty: 'tobacco', scarcity: 'cloth' },
  { id: 'santiago', name: 'Santiago', nation: 'spain', x: 320, y: 300, size: 'medium', specialty: 'sugar', scarcity: 'cannons' },
  { id: 'cartagena', name: 'Cartagena', nation: 'spain', x: 430, y: 440, size: 'large', specialty: 'spice', scarcity: 'food' },
  { id: 'porto-bello', name: 'Portobelo', nation: 'spain', x: 380, y: 500, size: 'large', specialty: 'spice', scarcity: 'gunpowder' },
  { id: 'veracruz', name: 'Veracruz', nation: 'spain', x: 100, y: 380, size: 'capital', specialty: 'sugar', scarcity: 'cannons' },
  { id: 'petit-goave', name: 'Petit-Goâve', nation: 'france', x: 360, y: 310, size: 'medium', specialty: 'cloth', scarcity: 'tobacco' },
  { id: 'fort-royal', name: 'Fort Royal', nation: 'france', x: 620, y: 370, size: 'large', specialty: 'rum', scarcity: 'gunpowder' },
  { id: 'cayenne', name: 'Cayenne', nation: 'france', x: 710, y: 540, size: 'small', specialty: 'spice', scarcity: 'food' },
  { id: 'curacao', name: 'Curaçao', nation: 'netherlands', x: 520, y: 430, size: 'medium', specialty: 'cloth', scarcity: 'rum' },
  { id: 'st-eustatius', name: 'Sint Eustatius', nation: 'netherlands', x: 640, y: 320, size: 'small', specialty: 'gunpowder', scarcity: 'sugar' },
  { id: 'barbados', name: 'Bridgetown', nation: 'england', x: 700, y: 420, size: 'large', specialty: 'sugar', scarcity: 'spice' },
];

export function findPort(id: string): Port | undefined {
  return PORTS.find((p) => p.id === id);
}
