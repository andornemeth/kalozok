import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useGame } from '@/state/gameStore';
import { bus } from '@/game/EventBus';

interface Props {
  onClose: () => void;
}

export function TanyaDialog({ onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const family = useGame((s) => s.family);
  const gold = useGame((s) => s.career.gold);
  const [showLetter, setShowLetter] = useState(false);

  const rest = () => {
    useGame.getState().visitFamily('rest');
    bus.emit('toast', { message: t('tanya.rested', { morale: 20, food: 15 }), kind: 'good' });
  };

  const giveGold = (amount: number) => {
    if (gold < amount) {
      bus.emit('toast', { message: t('tanya.notEnoughGold'), kind: 'bad' });
      return;
    }
    useGame.getState().visitFamily('giveGold', amount);
    bus.emit('toast', { message: t('tanya.gaveGold'), kind: 'good' });
  };

  const play = () => {
    useGame.getState().visitFamily('play');
    bus.emit('toast', { message: t('tanya.playedWithGirls', { fame: 3 }), kind: 'good' });
  };

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      className="pixel-card w-full max-w-md absolute"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-pixel text-gold text-sm">{t('tanya.title')}</h3>
        <button className="pixel-btn ghost !text-[9px]" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="flex justify-center gap-3 mb-3 text-3xl">
        <div className="flex flex-col items-center">
          <div>👩‍🦰</div>
          <div className="text-[9px] opacity-70 mt-1">{t('tanya.anikoName')}</div>
        </div>
        <div className="flex flex-col items-center">
          <div>👧</div>
          <div className="text-[9px] opacity-70 mt-1">{t('tanya.csillagName')} ({family.csillagAge})</div>
        </div>
        <div className="flex flex-col items-center">
          <div>👶</div>
          <div className="text-[9px] opacity-70 mt-1">{t('tanya.borokaName')} ({family.borokaAge})</div>
        </div>
      </div>

      <p className="text-xs font-serif italic mb-3 text-parchment-200">
        {t('tanya.greeting')}
      </p>

      <div className="text-[10px] opacity-70 mb-3 flex justify-between">
        <span>🌻 {t('tanya.familyStatus', { total: family.bond })}</span>
        <span>👁 {family.visits}×</span>
      </div>

      <div className="flex flex-col gap-2">
        <button className="pixel-btn" onClick={rest}>
          💤 {t('tanya.rest')}
        </button>
        <button className="pixel-btn" onClick={play}>
          🎭 {t('tanya.playWithGirls')}
        </button>
        <div className="grid grid-cols-3 gap-1">
          <button className="pixel-btn !text-[10px]" disabled={gold < 100} onClick={() => giveGold(100)}>
            💰 {t('tanya.giveGold', { amount: 100 })}
          </button>
          <button className="pixel-btn !text-[10px]" disabled={gold < 500} onClick={() => giveGold(500)}>
            💰 500
          </button>
          <button className="pixel-btn !text-[10px]" disabled={gold < 2000} onClick={() => giveGold(2000)}>
            💰 2000
          </button>
        </div>
        <button className="pixel-btn ghost" onClick={() => setShowLetter((v) => !v)}>
          📜 {t('tanya.readLetter')}
        </button>
        <AnimatePresence>
          {showLetter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-1 p-3 rounded bg-parchment-100/10 ring-1 ring-parchment-200/20 text-xs font-serif italic">
                {t('tanya.letterIntro')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
