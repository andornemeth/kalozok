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
    emoji: '🧭',
    title: 'Kormányzás',
    body: 'Bal alsó sarokban a ◀ ▶ gombokkal forgatod a hajót. Tartsd lenyomva, és addig fordul, amíg el nem engeded. A hajód saját sebességén forog — nagyobb hajó lassabban.',
  },
  {
    emoji: '⛵',
    title: 'Vitorla üzemmód',
    body: 'A VITORLA gomb átvált teli ↔ csata vitorlára. Csata-vitorlával lassabb vagy (55% sebesség), de jóval fordulékonyabb (1.7× turn rate). Közelharcban használd.',
  },
  {
    emoji: '🔥',
    title: 'Tüzelés',
    body: 'A TŰZ gomb színe mutatja az állapotot:\n🟢 TŰZ BAL/JOBB — lőhetsz\n🟡 TÖLT… — reload fut\n🔴 FORDULJ — nem vagy broadside\n🔴 TÚL MESSZE — lőtávon kívül\nOldalra kell fordulni hogy az ágyúk az ellenfélre nézzenek!',
  },
  {
    emoji: '💥',
    title: 'Lőszer típusok',
    body: 'GOLYÓ — törzset sebzi, hosszú lőtáv.\nLÁNC — vitorlát tépi, közepes táv.\nKARTÁCS — legénységet írtja, rövid táv.\nHa a hátuk/orruk tengelyébe lősz (RAKELÉS), 1.8× sebzés!',
  },
  {
    emoji: '⚔️',
    title: 'Bordázás vagy menekülés',
    body: 'BORDA gomb: ha közel (< 90px) vagy és az ellenfél gyenge, átszálltok kardpárbajra.\nMENEKÜL: kiszállás a csatából. Ha az ellenfél oldalára fordulsz közben, súlyosan sérülhetsz.',
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
