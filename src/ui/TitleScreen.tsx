import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { hasAnySave } from '@/utils/save';

interface Props {
  onNew: () => void;
  onSettings: () => void;
  onSaves: () => void;
}

export function TitleScreen({ onNew, onSettings, onSaves }: Props): JSX.Element {
  const { t } = useTranslation();
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    void hasAnySave().then(setCanContinue);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full px-6 safe-top safe-bottom">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sea-700 via-sea-800 to-sea-900" />
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,rgba(224,178,79,0.25),transparent_60%)]" />
        {Array.from({ length: 36 }).map((_, i) => (
          <span
            key={i}
            className="absolute bg-parchment-100/60 rounded-full"
            style={{
              width: 2,
              height: 2,
              top: `${(i * 17) % 100}%`,
              left: `${(i * 29) % 100}%`,
              opacity: ((i * 13) % 10) / 20 + 0.2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h1 className="font-pixel text-gold text-2xl sm:text-4xl tracking-wider drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
          {t('app.title')}
        </h1>
        <p className="mt-2 font-serif italic text-parchment-100 text-base sm:text-xl">
          <span className="text-red-400">Pegya</span>, a Pannon tenger betyára
        </p>
        <p className="mt-3 font-serif italic text-parchment-200/80 text-sm">{t('app.subtitle')}</p>
        <p className="mt-4 text-xs sm:text-sm text-parchment-100/70 max-w-xs mx-auto">{t('app.tagline')}</p>
        <div className="mt-4 flex justify-center gap-2 text-xs opacity-70">
          <span>🌻</span>
          <span>🌶</span>
          <span>⚓</span>
          <span>🌶</span>
          <span>🌻</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <button className="pixel-btn primary" onClick={onNew}>
          ⚓ {t('title.new')}
        </button>
        <button className="pixel-btn" disabled={!canContinue} onClick={onSaves}>
          📜 {t('title.continue')}
        </button>
        <button className="pixel-btn ghost" onClick={onSettings}>
          ⚙ {t('title.settings')}
        </button>
      </motion.div>

      <p className="mt-12 text-[10px] text-parchment-100/40 font-pixel">v0.1 · PWA</p>
    </div>
  );
}
