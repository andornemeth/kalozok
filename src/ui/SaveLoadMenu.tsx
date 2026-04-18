import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useGame } from '@/state/gameStore';
import { SAVE_SLOTS, deleteSlot, readSlot, writeSlot, type SaveEnvelope, exportJSON, importJSON } from '@/utils/save';
import { SHIPS } from '@/game/data/ships';
import { findPort } from '@/game/data/ports';

interface Props {
  onClose: () => void;
  onNewGame?: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function SaveCard({ env, slot, onSave, onLoad, onDelete }: {
  env: SaveEnvelope | undefined;
  slot: number;
  onSave: () => void;
  onLoad: () => void;
  onDelete: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  if (!env) {
    return (
      <div className="rounded ring-1 ring-parchment-200/15 p-3 bg-sea-900/40">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-pixel text-[10px] text-parchment-200/70">{t('save.slot', { n: slot })}</div>
            <div className="text-[11px] opacity-50 mt-1">{t('save.empty')}</div>
          </div>
          <button className="pixel-btn primary !text-[9px]" onClick={onSave}>
            💾 {t('save.save')}
          </button>
        </div>
      </div>
    );
  }
  const s = env.state;
  const shipStats = SHIPS[s.ship.class];
  const port = s.currentPortId ? findPort(s.currentPortId) : null;
  const bond = s.family?.bond ?? 0;
  return (
    <div className="rounded ring-1 ring-parchment-200/25 p-3 bg-sea-900/70">
      <div className="flex items-center justify-between mb-2">
        <div className="font-pixel text-[10px] text-gold">{t('save.slot', { n: slot })}</div>
        <div className="text-[9px] opacity-50">{formatDate(env.savedAt)}</div>
      </div>
      <div className="text-sm font-semibold mb-1">{s.career.name || '—'}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] mb-2 opacity-80">
        <div>💰 {s.career.gold.toLocaleString('hu')} arany</div>
        <div>⚓ {shipStats.displayKey}</div>
        <div>📅 {s.career.daysAtSea} nap</div>
        <div>⚔ {s.quests?.shipsDefeated ?? 0} győzelem</div>
        <div>🌻 {bond}/100</div>
        <div>📍 {port?.name ?? 'tengeren'}</div>
      </div>
      <div className="flex gap-1">
        <button className="pixel-btn !text-[9px] flex-1" onClick={onSave}>
          💾 {t('save.save')}
        </button>
        <button className="pixel-btn primary !text-[9px] flex-1" onClick={onLoad}>
          📂 {t('save.load')}
        </button>
        <button className="pixel-btn ghost !text-[9px]" onClick={onDelete} title={t('save.delete')}>
          ✕
        </button>
      </div>
    </div>
  );
}

export function SaveLoadMenu({ onClose, onNewGame }: Props): JSX.Element {
  const { t } = useTranslation();
  const [envs, setEnvs] = useState<Record<number, SaveEnvelope | undefined>>({});
  const [confirmNew, setConfirmNew] = useState(false);
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
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {SAVE_SLOTS.map((slot) => (
            <SaveCard
              key={slot}
              slot={slot}
              env={envs[slot]}
              onSave={() => save(slot)}
              onLoad={() => load(slot)}
              onDelete={() => del(slot)}
            />
          ))}
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

        {onNewGame && (
          <div className="mt-3 pt-3 border-t border-parchment-200/15">
            {confirmNew ? (
              <div className="rounded bg-rose-900/30 ring-1 ring-rose-400/40 p-3">
                <p className="text-[11px] font-serif mb-2">
                  Biztos új játékot kezdesz? A jelenlegi karrier elvész, ha nem mentetted
                  el egy helyre.
                </p>
                <div className="flex gap-2">
                  <button
                    className="pixel-btn ghost !text-[9px] flex-1"
                    onClick={() => setConfirmNew(false)}
                  >
                    Mégse
                  </button>
                  <button
                    className="pixel-btn danger !text-[9px] flex-1"
                    onClick={() => {
                      setConfirmNew(false);
                      onNewGame();
                    }}
                  >
                    🆕 Indulás
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="pixel-btn ghost w-full !text-[10px]"
                onClick={() => setConfirmNew(true)}
              >
                🆕 Új játék indítása
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
