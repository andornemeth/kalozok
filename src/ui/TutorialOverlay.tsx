import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useGame } from '@/state/gameStore';

interface Tip {
  key: string;
  emoji: string;
}

const TIPS: Tip[] = [
  { key: 'tutorial.move', emoji: '🗺️' },
  { key: 'tutorial.wind', emoji: '🌬️' },
  { key: 'tutorial.port', emoji: '⚓' },
  { key: 'tutorial.home', emoji: '🌻' },
  { key: 'tutorial.combat', emoji: '⚔️' },
];

export function TutorialOverlay(): JSX.Element | null {
  const { t } = useTranslation();
  const flags = useGame((s) => s.flags);
  const scene = useGame((s) => s.scene);
  const setFlag = useGame((s) => s.setFlag);
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (scene === 'world' && !flags.tutorialMove) {
      const id = window.setTimeout(() => setOpen(true), 600);
      return () => window.clearTimeout(id);
    }
    return;
  }, [scene, flags.tutorialMove]);

  if (!open || flags.tutorialMove) return null;

  const tip = TIPS[step]!;
  const last = step === TIPS.length - 1;

  const finish = () => {
    setFlag('tutorialMove', true);
    setFlag('tutorialPort', true);
    setOpen(false);
  };

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      <div className="absolute inset-0 bg-sea-900/60 pointer-events-auto" />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="absolute inset-x-0 bottom-20 mx-auto max-w-sm px-4 pointer-events-auto"
        >
          <div className="pixel-card">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{tip.emoji}</span>
              <div className="font-pixel text-[10px] text-gold">
                {step + 1}/{TIPS.length}
              </div>
              <div className="ml-auto text-[9px] opacity-50">Pegya naplójából</div>
            </div>
            <p className="text-sm font-serif mb-3 leading-relaxed">{t(tip.key)}</p>
            <div className="flex gap-2">
              <button className="pixel-btn ghost !text-[10px] flex-1" onClick={finish}>
                Kihagyás
              </button>
              {last ? (
                <button className="pixel-btn primary !text-[10px] flex-1" onClick={finish}>
                  ⚓ Indulás!
                </button>
              ) : (
                <button
                  className="pixel-btn primary !text-[10px] flex-1"
                  onClick={() => setStep((s) => s + 1)}
                >
                  Tovább →
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
