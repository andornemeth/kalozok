import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGame } from '@/state/gameStore';

interface Tip {
  title: string;
  body: string;
  emoji: string;
}

const TIPS: Tip[] = [
  {
    emoji: '🕹️',
    title: 'Kormánybot',
    body: 'Bal alsó sarokban a virtuális kormánybot. Nyomd le az ujjad és húzd abba az irányba amerre a hajódnak mennie kell. A hajó a saját fordulási sebességén fordul oda — nagyobb hajó lassabban. Elengeded, marad azon az irányon.',
  },
  {
    emoji: '🧭',
    title: 'Irány-segítő nyilak',
    body: 'A saját hajód előtt egy sárga nyíl mutatja az aktuális haladási irányt. Ha a kormánybottal máshová húzol, egy szaggatott szürke nyíl jelzi a célirányt — addig fordul, amíg egybe nem esnek.',
  },
  {
    emoji: '🔥',
    title: 'Tüzelés és lő-ív',
    body: 'A hajód két oldalán áttetsző fehér cikkek mutatják az ágyúk lő-ívét. Ha az ellenfél beleér + lőtávon belül van + a reload kész → a TŰZ gomb zöld („TŰZ BAL/JOBB"). Piros: fordulj vagy közeledj. Sárga: tölt.',
  },
  {
    emoji: '💥',
    title: 'Lőszerek és akciók',
    body: 'AMMO gomb tap: GOLYÓ (törzs, hosszú táv) → LÁNC (vitorla, közepes) → KARTÁCS (legénység, rövid).\nBow/stern tengelybe lőni RAKELÉS = 1.8× sebzés.\nKözel: BORDA → kardpárbaj. MENEKÜL: kiszállás, kicsi sebzéssel.',
  },
];

export function NavalTutorial(): JSX.Element | null {
  const scene = useGame((s) => s.scene);
  const seen = useGame((s) => s.flags.tutorialCombat);
  const setFlag = useGame((s) => s.setFlag);
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (scene === 'naval' && !seen) {
      const id = window.setTimeout(() => setOpen(true), 700);
      return () => window.clearTimeout(id);
    }
    setOpen(false);
    return;
  }, [scene, seen]);

  if (!open) return null;
  const tip = TIPS[step]!;
  const last = step === TIPS.length - 1;

  const finish = () => {
    setFlag('tutorialCombat', true);
    setOpen(false);
  };

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      <div className="absolute inset-0 bg-sea-900/70 pointer-events-auto" />
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
                  Csata tipp {step + 1} / {TIPS.length}
                </div>
              </div>
            </div>
            <p className="text-sm font-serif mb-3 leading-relaxed whitespace-pre-line">{tip.body}</p>
            <div className="flex gap-2">
              <button className="pixel-btn ghost !text-[10px] flex-1" onClick={finish}>
                Kihagyás
              </button>
              {step > 0 && (
                <button
                  className="pixel-btn ghost !text-[10px]"
                  onClick={() => setStep((s) => s - 1)}
                >
                  ← Vissza
                </button>
              )}
              {last ? (
                <button className="pixel-btn primary !text-[10px] flex-1" onClick={finish}>
                  ⚓ Harcra!
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
