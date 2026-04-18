import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { useGame } from '@/state/gameStore';
import { mulberry32, hashString } from '@/utils/rng';
import { SHIPS } from '@/game/data/ships';
import type { Port } from '@/game/data/ports';

interface Props {
  port: Port;
  onClose: () => void;
}

const HU_RUMORS = [
  'Egy sváb kereskedő Nagybecskerekről vászonnal megrakodva indul Szegedre…',
  'Az oszmán flotta Nándorfehérvárnál gyülekezik — lőport visznek Pancsovára.',
  'Pétervárad alatt egy süllyedt rác hajó aranyát keresi mindenki.',
  'Az ispán lánya Temesváron új udvarlót keres. Táncolni kell tudni!',
  'Állítólag egy török gálya rekedt Zimony ködében — zsákmányra érett.',
  'Titelnél crnagorac hajók keresik a magyar betyárokat — barátra vagy ellenségre, nem dönthettek.',
  'A karlócai kolostor pincéjében régi kincs — egy szerzetes elcsevegett róla mézsör fölött.',
  'Rózsa Sándor pap lányát egy oláh gróf rabolta el — a hiteles emberek fülébe suttogták.',
  'Anikó új mondókát tanított Csillagnak — Zentán hallottak róla a halászok.',
  'Az apatini hajóácsok kedvezményt adnak — csak zárt szájnak, nyitott erszénynek.',
  'A bajai halászok néma halat fogtak — a plébános megáldotta, mégse beszél.',
  'Eszéken sváb szolga lopta meg a kormányzó pipáját — keresett ember.',
  'Újvidéken egy nyomtató műhely ásott ki egy régi latin térképet — mutatja a Pannon-tenger alatti elvitt szigeteket.',
];

export function TavernDialog({ port, onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const days = useGame((s) => s.career.daysAtSea);
  const gold = useGame((s) => s.career.gold);
  const ship = useGame((s) => s.ship);
  const addCrew = useGame((s) => s.setCrew);
  const [msg, setMsg] = useState<string | null>(null);

  const offer = useMemo(() => {
    const rng = mulberry32(hashString(`${port.id}:crew:${Math.floor(days / 3)}`));
    const count = Math.floor(rng() * 9);
    const perHead = 8 + Math.floor(rng() * 10);
    return { count, perHead };
  }, [port, days]);

  const rumor = useMemo(() => {
    const rng = mulberry32(hashString(`${port.id}:rumor:${Math.floor(days / 2)}`));
    return HU_RUMORS[Math.floor(rng() * HU_RUMORS.length)]!;
  }, [port, days]);

  const maxHire = Math.min(offer.count, SHIPS[ship.class].crewMax - ship.crew);
  const cost = maxHire * offer.perHead;

  const hire = () => {
    if (maxHire <= 0 || gold < cost) {
      setMsg(t('tavern.noCrew'));
      return;
    }
    if (!useGame.getState().spendGold(cost)) return;
    addCrew(ship.crew + maxHire);
    setMsg(t('tavern.hired', { count: maxHire }));
  };

  const listen = () => {
    useGame.getState().addTreasureFragment();
    setMsg(`${t('tavern.rumor')} "${rumor}"`);
  };

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      className="pixel-card w-full max-w-md absolute"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-pixel text-gold text-sm">{t('tavern.title')}</h3>
        <button className="pixel-btn ghost !text-[9px]" onClick={onClose}>
          ✕
        </button>
      </div>
      <p className="text-xs opacity-75 mb-3">
        {t('tavern.flavor')}
      </p>
      <div className="flex flex-col gap-2">
        <button className="pixel-btn" onClick={hire} disabled={maxHire <= 0}>
          {t('tavern.hire', { cost })}
        </button>
        <button className="pixel-btn" onClick={listen}>
          {t('tavern.rumors')}
        </button>
      </div>
      {msg && <p className="mt-3 text-xs font-serif italic text-parchment-200">{msg}</p>}
    </motion.div>
  );
}
