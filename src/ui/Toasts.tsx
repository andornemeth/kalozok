import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { bus } from '@/game/EventBus';
import { Audio } from '@/audio/AudioManager';

interface ToastMsg {
  id: number;
  message: string;
  kind: 'info' | 'good' | 'bad';
}

let seq = 0;

export function Toasts(): JSX.Element {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    const onToast = (t: { message: string; kind?: 'info' | 'good' | 'bad' }) => {
      const id = ++seq;
      setToasts((xs) => [...xs, { id, message: t.message, kind: t.kind ?? 'info' }]);
      if (t.kind === 'good') Audio.success();
      else if (t.kind === 'bad') Audio.failure();
      else Audio.uiOpen();
      setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), 2600);
    };
    bus.on('toast', onToast);
    return () => bus.off('toast', onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[120px] z-40 flex flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ y: -16, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0 }}
            className={`hud-panel font-pixel text-[10px] ${
              t.kind === 'good' ? 'text-emerald-300' : t.kind === 'bad' ? 'text-rose-300' : 'text-parchment-50'
            }`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
