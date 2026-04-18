import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useGame } from '@/state/gameStore';

interface Props {
  onClose: () => void;
}

export function BackstoryModal({ onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const pages = [
    { key: 'backstory.paragraph1', motif: '🏡' },
    { key: 'backstory.paragraph2', motif: '⛵' },
    { key: 'backstory.paragraph3', motif: '🏴‍☠️' },
    { key: 'backstory.paragraph4', motif: '🌻' },
  ];
  const last = page === pages.length - 1;
  const current = pages[page]!;

  const finish = () => {
    useGame.getState().markStoryShown();
    onClose();
  };

  return (
    <div className="dialog-backdrop z-50">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pixel-card w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-pixel text-gold text-sm">{t('backstory.title')}</h2>
          <span className="text-[10px] opacity-60">{page + 1} / {pages.length}</span>
        </div>
        <div className="text-center text-4xl mb-3">{current.motif}</div>
        <AnimatePresence mode="wait">
          <motion.p
            key={page}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
            className="text-sm font-serif leading-relaxed mb-4 text-parchment-100"
          >
            {t(current.key)}
          </motion.p>
        </AnimatePresence>
        <div className="flex justify-between gap-2">
          <button
            className="pixel-btn ghost !text-[10px]"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            {t('game.back')}
          </button>
          {last ? (
            <button className="pixel-btn primary flex-1" onClick={finish}>
              ⚓ {t('backstory.begin')}
            </button>
          ) : (
            <button className="pixel-btn flex-1" onClick={() => setPage((p) => p + 1)}>
              {t('game.next')} →
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
