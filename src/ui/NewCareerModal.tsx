import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useGame } from '@/state/gameStore';
import type { NationId } from '@/game/data/ports';
import type { DifficultyId } from '@/state/gameStore';
import { dailySeed, hashString } from '@/utils/rng';

interface Props {
  onClose: () => void;
  onStart: () => void;
}

const NATIONS: NationId[] = ['england', 'spain', 'france', 'netherlands', 'pirate'];
const ERAS = [1660, 1680, 1700, 1720];
const DIFFS: DifficultyId[] = ['easy', 'normal', 'hard'];

export function NewCareerModal({ onClose, onStart }: Props): JSX.Element {
  const { t } = useTranslation();
  const [name, setName] = useState('Kapitány');
  const [nation, setNation] = useState<NationId>('pirate');
  const [era, setEra] = useState<number>(1680);
  const [difficulty, setDifficulty] = useState<DifficultyId>('normal');
  const [daily, setDaily] = useState(false);

  const start = () => {
    const seed = daily ? dailySeed() : hashString(`${name}:${Date.now()}`);
    useGame.getState().newCareer({ name, nation, era, difficulty, seed });
    onStart();
  };

  return (
    <div className="dialog-backdrop z-50">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="pixel-card w-full max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-pixel text-gold text-sm">{t('title.new')}</h2>
          <button className="pixel-btn ghost !text-[9px]" onClick={onClose}>
            ✕
          </button>
        </div>
        <label className="block text-xs mb-1 opacity-80">{t('career.name')}</label>
        <input
          className="w-full mb-3 px-3 py-2 rounded bg-sea-900 ring-1 ring-parchment-200/30 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 24))}
        />
        <div className="text-xs mb-1 opacity-80">{t('career.nation')}</div>
        <div className="grid grid-cols-3 gap-1 mb-3">
          {NATIONS.map((n) => (
            <button
              key={n}
              className={`pixel-btn !py-1 !text-[9px] ${n === nation ? 'primary' : 'ghost'}`}
              onClick={() => setNation(n)}
            >
              {t(`nations.${n}`)}
            </button>
          ))}
        </div>
        <div className="text-xs mb-1 opacity-80">{t('career.era')}</div>
        <div className="grid grid-cols-4 gap-1 mb-3">
          {ERAS.map((y) => (
            <button key={y} className={`pixel-btn !py-1 !text-[9px] ${y === era ? 'primary' : 'ghost'}`} onClick={() => setEra(y)}>
              {y}
            </button>
          ))}
        </div>
        <div className="text-xs mb-1 opacity-80">{t('career.difficulty')}</div>
        <div className="grid grid-cols-3 gap-1 mb-3">
          {DIFFS.map((d) => (
            <button
              key={d}
              className={`pixel-btn !py-1 !text-[9px] ${d === difficulty ? 'primary' : 'ghost'}`}
              onClick={() => setDifficulty(d)}
            >
              {t(`career.${d}`)}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs mb-3">
          <input type="checkbox" checked={daily} onChange={(e) => setDaily(e.target.checked)} />
          {t('title.daily')}
        </label>
        <button className="pixel-btn primary w-full" onClick={start}>
          ⚓ {t('career.start')}
        </button>
      </motion.div>
    </div>
  );
}
