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
  homePort?: boolean;
  flavorKey?: string;
}

// Karib világ logikai mérete: 1600 × 1100. A földrajz ugyanaz, de Pegya a
// maga képére kereszteli át a kikötőket — minden helynév a Délvidékről való.
export const WORLD_W = 1600;
export const WORLD_H = 1100;

export const PORTS: readonly Port[] = [
  // Angol koronagyarmat — "Bácska szíve"
  { id: 'szabadka', name: 'Szabadka', nation: 'england', x: 580, y: 110, size: 'medium', specialty: 'tobacco', scarcity: 'spice', flavorKey: 'ports.szabadka.flavor' },
  { id: 'ujvidek', name: 'Újvidék', nation: 'england', x: 720, y: 470, size: 'capital', specialty: 'tobacco', scarcity: 'spice', flavorKey: 'ports.ujvidek.flavor' },
  { id: 'topolya', name: 'Topolya', nation: 'england', x: 770, y: 490, size: 'medium', specialty: 'sugar', scarcity: 'gunpowder', flavorKey: 'ports.topolya.flavor' },
  { id: 'nagybecskerek', name: 'Nagybecskerek', nation: 'england', x: 1450, y: 620, size: 'large', specialty: 'sugar', scarcity: 'cloth', flavorKey: 'ports.nagybecskerek.flavor' },

  // Spanyol birodalom — gazdag, gyanakvó, arannyal teli
  { id: 'zombor', name: 'Zombor', nation: 'spain', x: 540, y: 320, size: 'capital', specialty: 'tobacco', scarcity: 'cloth', flavorKey: 'ports.zombor.flavor' },
  { id: 'pancsova', name: 'Pancsova', nation: 'spain', x: 820, y: 430, size: 'large', specialty: 'sugar', scarcity: 'cannons', flavorKey: 'ports.pancsova.flavor' },
  { id: 'versec', name: 'Versec', nation: 'spain', x: 1050, y: 480, size: 'capital', specialty: 'sugar', scarcity: 'food', flavorKey: 'ports.versec.flavor' },
  { id: 'kikinda', name: 'Kikinda', nation: 'spain', x: 1180, y: 450, size: 'large', specialty: 'rum', scarcity: 'cannons', flavorKey: 'ports.kikinda.flavor' },
  { id: 'obecse', name: 'Óbecse', nation: 'spain', x: 900, y: 800, size: 'capital', specialty: 'spice', scarcity: 'food', flavorKey: 'ports.obecse.flavor' },
  { id: 'apatin', name: 'Apatin', nation: 'spain', x: 720, y: 880, size: 'large', specialty: 'spice', scarcity: 'gunpowder', flavorKey: 'ports.apatin.flavor' },
  { id: 'magyarkanizsa', name: 'Magyarkanizsa', nation: 'spain', x: 1050, y: 770, size: 'large', specialty: 'cloth', scarcity: 'food', flavorKey: 'ports.magyarkanizsa.flavor' },
  { id: 'fehertemplom', name: 'Fehértemplom', nation: 'spain', x: 1200, y: 790, size: 'medium', specialty: 'tobacco', scarcity: 'cannons', flavorKey: 'ports.fehertemplom.flavor' },
  { id: 'temerin', name: 'Temerin', nation: 'spain', x: 200, y: 540, size: 'capital', specialty: 'sugar', scarcity: 'cannons', flavorKey: 'ports.temerin.flavor' },
  { id: 'szenttamas', name: 'Szenttamás', nation: 'spain', x: 320, y: 580, size: 'medium', specialty: 'cloth', scarcity: 'gunpowder', flavorKey: 'ports.szenttamas.flavor' },
  { id: 'palics', name: 'Palics', nation: 'spain', x: 480, y: 200, size: 'small', specialty: 'tobacco', scarcity: 'rum', flavorKey: 'ports.palics.flavor' },

  // Francia gyarmatok — divatos, elegáns
  { id: 'ada', name: 'Ada', nation: 'france', x: 940, y: 470, size: 'medium', specialty: 'cloth', scarcity: 'tobacco', flavorKey: 'ports.ada.flavor' },
  { id: 'torokbecse', name: 'Törökbecse', nation: 'france', x: 1390, y: 570, size: 'large', specialty: 'rum', scarcity: 'gunpowder', flavorKey: 'ports.torokbecse.flavor' },
  { id: 'csoka', name: 'Csóka', nation: 'france', x: 1500, y: 900, size: 'small', specialty: 'spice', scarcity: 'food', flavorKey: 'ports.csoka.flavor' },

  // Holland kereskedőposztok
  { id: 'kula', name: 'Kúla', nation: 'netherlands', x: 1180, y: 730, size: 'medium', specialty: 'cloth', scarcity: 'rum', flavorKey: 'ports.kula.flavor' },
  { id: 'martonos', name: 'Martonos', nation: 'netherlands', x: 1310, y: 470, size: 'small', specialty: 'gunpowder', scarcity: 'sugar', flavorKey: 'ports.martonos.flavor' },

  // Kalóz-tanyák — Pegya otthona Zenta
  { id: 'horgos', name: 'Horgos', nation: 'pirate', x: 660, y: 250, size: 'medium', specialty: 'rum', scarcity: 'cloth', flavorKey: 'ports.horgos.flavor' },
  { id: 'zenta', name: 'Zenta', nation: 'pirate', x: 920, y: 410, size: 'medium', specialty: 'rum', scarcity: 'food', homePort: true, flavorKey: 'ports.zenta.flavor' },
];

export const HOME_PORT_ID = 'zenta';

export function findPort(id: string): Port | undefined {
  return PORTS.find((p) => p.id === id);
}

export function homePort(): Port {
  return PORTS.find((p) => p.homePort) ?? PORTS[PORTS.length - 1];
}

export function nationColor(n: NationId): number {
  return { england: 0xc0392b, spain: 0xf2c94c, france: 0x3470d6, netherlands: 0xff8c42, pirate: 0x1c1c1c }[n];
}

export function nationFlagAccent(n: NationId): number {
  return { england: 0xfbf5e3, spain: 0xc0392b, france: 0xfbf5e3, netherlands: 0x1c4587, pirate: 0xfbf5e3 }[n];
}
