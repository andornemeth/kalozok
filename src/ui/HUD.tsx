import { useTranslation } from 'react-i18next';
import { useGame } from '@/state/gameStore';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { bus } from '@/game/EventBus';
import { PORTS } from '@/game/data/ports';
import { SHIPS } from '@/game/data/ships';
import { writeAutosave } from '@/utils/save';
import { FastTravelDialog } from './FastTravelDialog';

interface Props {
  onMenu: () => void;
  onSettings: () => void;
}

export function HUD({ onMenu, onSettings }: Props): JSX.Element {
  const { t } = useTranslation();
  const career = useGame((s) => s.career);
  const ship = useGame((s) => s.ship);
  const food = useGame((s) => s.food);
  const morale = useGame((s) => s.morale);
  const scene = useGame((s) => s.scene);
  const [nearPortId, setNearPortId] = useState<string | null>(null);
  const [fastTravel, setFastTravel] = useState(false);

  useEffect(() => {
    const onNear = (payload: { portId: string } | null) => setNearPortId(payload?.portId ?? null);
    bus.on('world:nearPort', onNear);
    return () => bus.off('world:nearPort', onNear);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void writeAutosave(useGame.getState());
    }, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const hullMax = SHIPS[ship.class].hullMax;
  const hullPct = Math.round((ship.hull / hullMax) * 100);
  const sailMax = SHIPS[ship.class].sailMax;
  const sailPct = Math.round((ship.sail / sailMax) * 100);
  const nearPort = nearPortId ? PORTS.find((p) => p.id === nearPortId) : null;

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-between p-2 safe-top gap-2">
        <div className="hud-panel pointer-events-auto flex items-center gap-3 text-parchment-50">
          <button
            aria-label={t('hud.menu')}
            className="pixel-btn ghost !py-1 !px-2 !text-[9px] pointer-events-auto"
            onClick={onMenu}
          >
            ☰
          </button>
          <span>
            💰 <span className="text-gold">{career.gold.toLocaleString()}</span>
          </span>
          <span>
            ⚓ {ship.crew}/{SHIPS[ship.class].crewMax}
          </span>
          <span>🍖 {food}</span>
          <span>💖 {morale}</span>
        </div>
        <div className="hud-panel pointer-events-auto flex items-center gap-2">
          <span>⛵ {t(`nations.${career.nation}`)}</span>
          <span>· {career.daysAtSea}d</span>
          {scene === 'world' && (
            <button
              className="pixel-btn ghost !py-1 !px-2 !text-[9px]"
              onClick={() => setFastTravel(true)}
              title="Gyorsutazás"
            >
              🧭
            </button>
          )}
          <button className="pixel-btn ghost !py-1 !px-2 !text-[9px]" onClick={onSettings}>
            ⚙
          </button>
        </div>
      </div>
      <AnimatePresence>
        {fastTravel && <FastTravelDialog onClose={() => setFastTravel(false)} />}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-3 safe-bottom gap-2">
        <div className="hud-panel pointer-events-auto flex flex-col gap-1 min-w-[160px]">
          <Bar label="Törzs" pct={hullPct} color="bg-rum" />
          <Bar label="Vitorla" pct={sailPct} color="bg-parchment-200" />
        </div>
        {scene === 'world' && nearPort && (
          <button
            className="pixel-btn primary pointer-events-auto animate-pulse"
            onClick={() => useGame.getState().dockAt(nearPort.id)}
          >
            ⚓ {nearPort.name}
          </button>
        )}
      </div>
    </>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-[9px] opacity-70">{label}</span>
      <div className="flex-1 h-2 bg-sea-900/80 rounded overflow-hidden ring-1 ring-parchment-200/30">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right text-[9px]">{pct}%</span>
    </div>
  );
}
