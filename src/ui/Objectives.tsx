import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/state/gameStore';
import { computeQuests } from '@/game/systems/QuestSystem';

export function Objectives(): JSX.Element {
  const state = useGame();
  const [open, setOpen] = useState(false);
  const quests = useMemo(() => computeQuests(state), [state]);
  const active = quests.filter((q) => !q.done);
  const next = active[0];

  return (
    <div className="pointer-events-none absolute left-2 top-[66px] z-20 flex flex-col items-start gap-1">
      {next && !open && (
        <button
          className="pointer-events-auto hud-panel flex items-center gap-2 text-parchment-50 hover:bg-sea-800"
          onClick={() => setOpen(true)}
        >
          <span className="text-gold">🎯</span>
          <span className="text-[10px]">
            {next.title}: {next.progress}/{next.goal}
          </span>
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            className="pointer-events-auto pixel-card w-[260px]"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-pixel text-gold text-[11px]">Célok</h3>
              <button className="pixel-btn ghost !py-0.5 !px-2 !text-[9px]" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            <ul className="space-y-1.5 text-[10px]">
              {quests.map((q) => {
                const pct = Math.min(100, (q.progress / q.goal) * 100);
                return (
                  <li key={q.id} className={q.done ? 'opacity-50 line-through' : ''}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{q.title}</span>
                      <span className="text-gold">+{q.reward}g</span>
                    </div>
                    <div className="opacity-70">{q.desc}</div>
                    <div className="h-1.5 bg-sea-900/80 rounded mt-1 overflow-hidden ring-1 ring-parchment-200/20">
                      <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
