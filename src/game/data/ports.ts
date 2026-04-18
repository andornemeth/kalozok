import type { GoodId } from './goods';

export type NationId =
  | 'magyar'
  | 'rac'
  | 'bunyevac'
  | 'olah'
  | 'tot'
  | 'oszman'
  | 'svab'
  | 'crnagorac';

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

// A Pannon-tenger alternatív földrajz: az elárasztott Pannon-medencében
// a hátságok és kisebb hegyek a szigetek. A térkép a Bánság, Bácska,
// Szerémség és Szlavónia vidéke.
export const WORLD_W = 1600;
export const WORLD_H = 1100;

export const PORTS: readonly Port[] = [
  // === Magyarok — Bácska északi része és Tisza-part ===
  { id: 'szeged', name: 'Szeged', nation: 'magyar', x: 650, y: 90, size: 'capital', specialty: 'tobacco', scarcity: 'spice', flavorKey: 'ports.szeged.flavor' },
  { id: 'szabadka', name: 'Szabadka', nation: 'magyar', x: 540, y: 170, size: 'capital', specialty: 'cloth', scarcity: 'gunpowder', flavorKey: 'ports.szabadka.flavor' },
  { id: 'magyarkanizsa', name: 'Magyarkanizsa', nation: 'magyar', x: 720, y: 180, size: 'medium', specialty: 'sugar', scarcity: 'cannons', flavorKey: 'ports.magyarkanizsa.flavor' },
  { id: 'zenta', name: 'Zenta', nation: 'magyar', x: 700, y: 260, size: 'medium', specialty: 'rum', scarcity: 'food', homePort: true, flavorKey: 'ports.zenta.flavor' },
  { id: 'topolya', name: 'Topolya', nation: 'magyar', x: 560, y: 260, size: 'medium', specialty: 'tobacco', scarcity: 'rum', flavorKey: 'ports.topolya.flavor' },
  { id: 'obecse', name: 'Óbecse', nation: 'magyar', x: 720, y: 380, size: 'large', specialty: 'food', scarcity: 'cloth', flavorKey: 'ports.obecse.flavor' },

  // === Bunyevácok — nyugati Bácska, katolikus délszlávok ===
  { id: 'baja', name: 'Baja', nation: 'bunyevac', x: 260, y: 130, size: 'medium', specialty: 'food', scarcity: 'spice', flavorKey: 'ports.baja.flavor' },
  { id: 'zombor', name: 'Zombor', nation: 'bunyevac', x: 340, y: 260, size: 'capital', specialty: 'cloth', scarcity: 'gunpowder', flavorKey: 'ports.zombor.flavor' },

  // === Svábok — német telepesek a Bácskában és Bánságban ===
  { id: 'apatin', name: 'Apatin', nation: 'svab', x: 230, y: 360, size: 'large', specialty: 'food', scarcity: 'cannons', flavorKey: 'ports.apatin.flavor' },
  { id: 'hodsag', name: 'Hódság', nation: 'svab', x: 340, y: 400, size: 'medium', specialty: 'cloth', scarcity: 'spice', flavorKey: 'ports.hodsag.flavor' },
  { id: 'verbasz', name: 'Verbász', nation: 'svab', x: 580, y: 420, size: 'medium', specialty: 'rum', scarcity: 'food', flavorKey: 'ports.verbasz.flavor' },
  { id: 'nagybecskerek', name: 'Nagybecskerek', nation: 'svab', x: 1040, y: 380, size: 'large', specialty: 'cannons', scarcity: 'rum', flavorKey: 'ports.nagybecskerek.flavor' },
  { id: 'kikinda', name: 'Kikinda', nation: 'svab', x: 950, y: 230, size: 'medium', specialty: 'food', scarcity: 'tobacco', flavorKey: 'ports.kikinda.flavor' },
  { id: 'eszek', name: 'Eszék', nation: 'svab', x: 130, y: 540, size: 'capital', specialty: 'cannons', scarcity: 'rum', flavorKey: 'ports.eszek.flavor' },

  // === Tótok — szlovák falvak középső Bácskában ===
  { id: 'kishegyes', name: 'Kishegyes', nation: 'tot', x: 620, y: 320, size: 'small', specialty: 'gunpowder', scarcity: 'sugar', flavorKey: 'ports.kishegyes.flavor' },
  { id: 'petroc', name: 'Petrőc', nation: 'tot', x: 550, y: 480, size: 'small', specialty: 'cloth', scarcity: 'cannons', flavorKey: 'ports.petroc.flavor' },

  // === Rácok — Szerémség, orthodox szerbek ===
  { id: 'vukovar', name: 'Vukovár', nation: 'rac', x: 330, y: 610, size: 'medium', specialty: 'tobacco', scarcity: 'cannons', flavorKey: 'ports.vukovar.flavor' },
  { id: 'ujvidek', name: 'Újvidék', nation: 'rac', x: 740, y: 540, size: 'capital', specialty: 'cloth', scarcity: 'food', flavorKey: 'ports.ujvidek.flavor' },
  { id: 'petervarad', name: 'Pétervárad', nation: 'rac', x: 790, y: 580, size: 'large', specialty: 'cannons', scarcity: 'spice', flavorKey: 'ports.petervarad.flavor' },
  { id: 'karloca', name: 'Karlóca', nation: 'rac', x: 810, y: 640, size: 'medium', specialty: 'rum', scarcity: 'tobacco', flavorKey: 'ports.karloca.flavor' },

  // === Crnagoracok — szabad hegyi rablók, kalóz-tanya ===
  { id: 'titel', name: 'Titel', nation: 'crnagorac', x: 920, y: 480, size: 'medium', specialty: 'rum', scarcity: 'cloth', flavorKey: 'ports.titel.flavor' },

  // === Oláhok — Bánság keleti hegyei ===
  { id: 'temesvar', name: 'Temesvár', nation: 'olah', x: 1340, y: 300, size: 'capital', specialty: 'tobacco', scarcity: 'cloth', flavorKey: 'ports.temesvar.flavor' },
  { id: 'lugos', name: 'Lugos', nation: 'olah', x: 1470, y: 400, size: 'medium', specialty: 'sugar', scarcity: 'gunpowder', flavorKey: 'ports.lugos.flavor' },
  { id: 'versec', name: 'Versec', nation: 'olah', x: 1170, y: 570, size: 'medium', specialty: 'spice', scarcity: 'food', flavorKey: 'ports.versec.flavor' },
  { id: 'fehertemplom', name: 'Fehértemplom', nation: 'olah', x: 1110, y: 780, size: 'small', specialty: 'gunpowder', scarcity: 'sugar', flavorKey: 'ports.fehertemplom.flavor' },

  // === Oszmánok — délvidéki török helyőrségek ===
  { id: 'szalankemen', name: 'Szalánkemén', nation: 'oszman', x: 870, y: 700, size: 'small', specialty: 'spice', scarcity: 'rum', flavorKey: 'ports.szalankemen.flavor' },
  { id: 'pancsova', name: 'Pancsova', nation: 'oszman', x: 920, y: 830, size: 'medium', specialty: 'spice', scarcity: 'food', flavorKey: 'ports.pancsova.flavor' },
  { id: 'zimony', name: 'Zimony', nation: 'oszman', x: 820, y: 910, size: 'large', specialty: 'cloth', scarcity: 'tobacco', flavorKey: 'ports.zimony.flavor' },
  { id: 'nandorfehervar', name: 'Nándorfehérvár', nation: 'oszman', x: 860, y: 990, size: 'capital', specialty: 'cannons', scarcity: 'food', flavorKey: 'ports.nandorfehervar.flavor' },
];

export const HOME_PORT_ID = 'zenta';

export function findPort(id: string): Port | undefined {
  return PORTS.find((p) => p.id === id);
}

export function homePort(): Port {
  return PORTS.find((p) => p.homePort) ?? PORTS[PORTS.length - 1];
}

export function nationColor(n: NationId): number {
  return ({
    magyar: 0xc0392b,       // piros
    rac: 0x3470d6,          // kék
    bunyevac: 0x4f6ba6,     // világoskék
    olah: 0xe0b24f,         // sárga
    tot: 0xc6d5ee,          // fehér-kék
    oszman: 0x2d5a2d,       // oszmán zöld
    svab: 0x1c1c1c,         // fekete
    crnagorac: 0x7a2e0e,    // sötétvörös
  } as const)[n];
}

export function nationFlagAccent(n: NationId): number {
  return ({
    magyar: 0x88e07b,       // zöld
    rac: 0xc0392b,          // piros
    bunyevac: 0xfbf5e3,     // fehér
    olah: 0x3470d6,         // kék
    tot: 0x3470d6,          // kék
    oszman: 0xfbf5e3,       // fehér félhold
    svab: 0xe0b24f,         // arany
    crnagorac: 0xfbf5e3,    // fehér koponya
  } as const)[n];
}
