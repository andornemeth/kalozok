import type { NationId } from './ports';
import { hashString, mulberry32 } from '@/utils/rng';

/**
 * Port-specifikus kereskedő és kocsmáros nevek. Minden portra determinisztikusan
 * kapunk egy nevet — az ID alapú hash ugyanazt a nevet adja mindig.
 *
 * A nevek tájszín szerintiek, de mind a délvidéki magyar perspektíva szerint
 * megjelölve (magyar helyesírás, tiszteletadás). Zentán Gyuri bácsi marad
 * fixen — ő Pegya régi ismerőse.
 */

const MERCHANT_POOL: Record<NationId, readonly string[]> = {
  magyar: [
    'Gyuri bácsi',
    'Borbás uram',
    'Kovács Peti',
    'Szabó néni',
    'Virág Jóska',
    'Tóth gazda',
    'Molnár uram',
    'Pálinkás András',
  ],
  bunyevac: [
    'Ivo gazda',
    'Mara néne',
    'Frano mester',
    'Stipan bátya',
    'Antun a sókereskedő',
    'Marko a takács',
  ],
  svab: [
    'Herr Schmidt',
    'Johann a szíjgyártó',
    'Müller asszonyság',
    'Wagner mester',
    'Hans a pék',
    'Frau Klein',
  ],
  olah: [
    'Popa István',
    'Vasile úr',
    'Szárics Miklós',
    'Aurel gazda',
    'Mircea a szűcs',
    'Dragomir kupec',
  ],
  tot: [
    'Ján bácsi',
    'Pavol mester',
    'Mišo a fonó',
    'Ondrej gazda',
    'Anka néne',
    'Matej a szabó',
  ],
  oszman: [
    'Ahmet efendi',
    'Hafiz bég',
    'Kemal aga',
    'Oszmán a paprikás',
    'Yussuf úr',
    'Mehmed a szűcs',
  ],
  rac: [
    'Miloš gazda',
    'Pero kupec',
    'Radovan bátya',
    'Obradović úr',
    'Sztanoje a kupec',
    'Dusán a vásznas',
  ],
  crnagorac: [
    'Öreg Mišo',
    'Pavle a Fekete',
    'Vuk a Szkít',
    'Nikola a rabló',
    'Marko kétpengés',
  ],
};

const INNKEEPER_POOL: Record<NationId, readonly string[]> = {
  magyar: ['Berta néni', 'Juhász Imre', 'Pista bácsi', 'Annus csárdás'],
  bunyevac: ['Draga néne', 'Mara csárdásné', 'Tomo gazda'],
  svab: ['Frau Schmidt', 'Herr Bäcker', 'Johann a söntés'],
  olah: ['Doina néne', 'Gheorghe bá’', 'Popa Miklósné'],
  tot: ['Evka néne', 'Jozef csárdás', 'Ján söntés'],
  oszman: ['Fatma asszony', 'Hasszán szofta', 'Mehmed aga'],
  rac: ['Milica néne', 'Ljubomir söntés', 'Dragiša csárdás'],
  crnagorac: ['Öreg Petar', 'Danica néne', 'Radoman a Fekete'],
};

/** Deterministic merchant name: a port.id-ből hash-eljük. */
export function merchantNameFor(portId: string, nation: NationId): string {
  // Zentán Gyuri bácsi fixen — Pegya régi ismerőse
  if (portId === 'zenta') return 'Gyuri bácsi';
  const pool = MERCHANT_POOL[nation];
  const seed = hashString(`merchant:${portId}`);
  const idx = Math.floor(mulberry32(seed)() * pool.length);
  return pool[idx]!;
}

export function innkeeperNameFor(portId: string, nation: NationId): string {
  if (portId === 'zenta') return 'Annus csárdásné';
  const pool = INNKEEPER_POOL[nation];
  const seed = hashString(`innkeeper:${portId}`);
  const idx = Math.floor(mulberry32(seed)() * pool.length);
  return pool[idx]!;
}
