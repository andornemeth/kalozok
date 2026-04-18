import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGame } from '@/state/gameStore';
import { bus } from '@/game/EventBus';

interface Tip {
  title: string;
  body: string;
  emoji: string;
}

const TIPS: Tip[] = [
  {
    emoji: '🕹️',
    title: 'Kormánybot — kard és lépés',
    body: 'A bal alsó joystick vezérli a kardodat. Húzd FEL → MAGAS, KÖZÉPEN → KÖZÉP, LE → ALACSONY állás. Jobbra-balra húzva haladsz előre vagy hátra a fedélzeten.',
  },
  {
    emoji: '⚔️',
    title: 'Támadás',
    body: 'A TÁMADÁS gomb lesújt a kardoddal az aktuális állásban. Az ellenfél állásához illesztve (pl. magas üti magast) nagyobbat sebez és többet tol hátra. Messze esetén nem ér el — gyere közelebb!',
  },
  {
    emoji: '🛡️',
    title: 'Hárítás, kitérés, kiszorítás',
    body: 'HÁRÍTÁS (hold): ha az ellenfél támadásával azonos állásban vagy, tökéletes parry — 0 sebzés + te tolod hátra.\nKITÉR (tap): 300 ms sebezhetetlenség + hátralépés, 800 ms cooldown.\nHa az ellenfelet a hajó oldaláig nyomod (piros szaggatott vonal) — KIDOBTAD, azonnali győzelem!',
  },
];

export function DuelTutorial(): JSX.Element | null {
  const scene = useGame((s) => s.scene);
  const seen = useGame((s) => s.flags.tutorialDuel);
  const setFlag = useGame((s) => s.setFlag);
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (scene === 'duel' && !seen) {
      const id = window.setTimeout(() => setOpen(true), 500);
      return () => window.clearTimeout(id);
    }
    setOpen(false);
    return;
  }, [scene, seen]);

  // Amíg nyitva a tutorial, a párbaj álljon
  useEffect(() => {
    if (!open) return;
    bus.emit('ui:pause', { paused: true });
    return () => { bus.emit('ui:pause', { paused: false }); };
  }, [open]);

  if (!open) return null;
  const tip = TIPS[step]!;
  const last = step === TIPS.length - 1;

  const finish = () => {
    setFlag('tutorialDuel', true);
    setOpen(false);
  };

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      <div className="absolute inset-0 bg-sea-900/75 pointer-events-auto" />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto max-w-sm px-4 pointer-events-auto"
        >
          <div className="pixel-card">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{tip.emoji}</span>
              <div>
                <div className="font-pixel text-[11px] text-gold">{tip.title}</div>
                <div className="text-[9px] opacity-60">
                  Kardpárbaj tipp {step + 1} / {TIPS.length}
                </div>
              </div>
            </div>
            <p className="text-sm font-serif mb-3 leading-relaxed whitespace-pre-line">{tip.body}</p>
            <div className="flex gap-2">
              <button className="pixel-btn ghost !text-[10px] flex-1" onClick={finish}>
                Kihagyás
              </button>
              {step > 0 && (
                <button className="pixel-btn ghost !text-[10px]" onClick={() => setStep((s) => s - 1)}>
                  ← Vissza
                </button>
              )}
              {last ? (
                <button className="pixel-btn primary !text-[10px] flex-1" onClick={finish}>
                  ⚔️ Harcra!
                </button>
              ) : (
                <button className="pixel-btn primary !text-[10px] flex-1" onClick={() => setStep((s) => s + 1)}>
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
