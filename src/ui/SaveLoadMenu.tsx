import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useGame } from '@/state/gameStore';
import { SAVE_SLOTS, deleteSlot, readSlot, writeSlot, type SaveEnvelope, exportJSON, importJSON } from '@/utils/save';

interface Props {
  onClose: () => void;
}

export function SaveLoadMenu({ onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const [envs, setEnvs] = useState<Record<number, SaveEnvelope | undefined>>({});
  const game = useGame();

  const refresh = async () => {
    const next: Record<number, SaveEnvelope | undefined> = {};
    for (const s of SAVE_SLOTS) next[s] = await readSlot(s);
    setEnvs(next);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const save = async (slot: (typeof SAVE_SLOTS)[number]) => {
    await writeSlot(slot, useGame.getState());
    await refresh();
  };

  const load = async (slot: (typeof SAVE_SLOTS)[number]) => {
    const env = await readSlot(slot);
    if (!env) return;
    useGame.getState().loadState(env.state);
    onClose();
  };

  const del = async (slot: (typeof SAVE_SLOTS)[number]) => {
    await deleteSlot(slot);
    await refresh();
  };

  const exportNow = () => {
    const data = exportJSON({ version: 1, savedAt: Date.now(), state: game });
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalozok-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromFile = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const env = importJSON(r.result as string);
        useGame.getState().loadState(env.state);
        onClose();
      } catch {
        /* noop */
      }
    };
    r.readAsText(file);
  };

  return (
    <div className="dialog-backdrop z-50">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="pixel-card w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-pixel text-gold text-sm">{t('save.title')}</h2>
          <button className="pixel-btn ghost !text-[9px]" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="space-y-2">
          {SAVE_SLOTS.map((slot) => {
            const env = envs[slot];
            return (
              <div key={slot} className="flex items-center justify-between gap-2 border-b border-parchment-200/10 pb-2">
                <div className="text-xs flex-1">
                  <div className="font-semibold">{t('save.slot', { n: slot })}</div>
                  <div className="opacity-60 text-[10px]">
                    {env ? `${env.state.career.name || '—'} · ${env.state.career.daysAtSea}d · ${env.state.career.gold}g` : t('save.empty')}
                  </div>
                </div>
                <button className="pixel-btn !py-1 !text-[9px]" onClick={() => save(slot)}>
                  {t('save.save')}
                </button>
                <button className="pixel-btn ghost !py-1 !text-[9px]" disabled={!env} onClick={() => load(slot)}>
                  {t('save.load')}
                </button>
                <button className="pixel-btn ghost !py-1 !text-[9px]" disabled={!env} onClick={() => del(slot)}>
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-3">
          <button className="pixel-btn ghost flex-1 !text-[9px]" onClick={exportNow}>
            ⬇ {t('save.export')}
          </button>
          <label className="pixel-btn ghost flex-1 !text-[9px] cursor-pointer">
            ⬆ {t('save.import')}
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importFromFile(e.target.files[0])}
            />
          </label>
        </div>
      </motion.div>
    </div>
  );
}
