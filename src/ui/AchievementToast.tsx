import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGame } from '@/state/gameStore';

const NAMES: Record<string, string> = {
  'first-blood': '🏴‍☠️ Első vér — első hajód elsüllyesztve',
  'duel-victor': '⚔️ Párbajhős — legyőzted első ellenfeled kardpárbajban',
  'treasure-hunter': '💎 Kincskereső — megtaláltad első kincsed',
  'city-conqueror': '🏰 Ostromló — bevetted első várost',
};

export function AchievementToast(): JSX.Element {
  const achievements = useGame((s) => s.achievements);
  const [queue, setQueue] = useState<string[]>([]);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const fresh = achievements.filter((a) => !seen.has(a));
    if (fresh.length === 0) return;
    const nextSeen = new Set(seen);
    fresh.forEach((a) => nextSeen.add(a));
    setSeen(nextSeen);
    setQueue((q) => [...q, ...fresh]);
  }, [achievements, seen]);

  useEffect(() => {
    if (queue.length === 0) return;
    const id = window.setTimeout(() => setQueue((q) => q.slice(1)), 3000);
    return () => window.clearTimeout(id);
  }, [queue]);

  return (
    <div className="pointer-events-none absolute top-16 inset-x-0 z-30 flex justify-center">
      <AnimatePresence>
        {queue[0] && (
          <motion.div
            key={queue[0]}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="hud-panel text-gold"
          >
            {NAMES[queue[0]] ?? queue[0]}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
