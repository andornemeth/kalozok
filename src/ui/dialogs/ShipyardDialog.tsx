import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGame } from '@/state/gameStore';
import { SHIPS, type ShipClass } from '@/game/data/ships';
import type { Port } from '@/game/data/ports';

interface Props {
  port: Port;
  onClose: () => void;
}

function Bar({ value, max, tone }: { value: number; max: number; tone: string }): JSX.Element {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="relative h-2 w-full rounded bg-parchment-100/10 overflow-hidden">
      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ShipyardDialog({ port, onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const ship = useGame((s) => s.ship);
  const gold = useGame((s) => s.career.gold);
  const repair = useGame((s) => s.repairShip);
  const patch = useGame((s) => s.patchShip);
  const spend = useGame((s) => s.spendGold);
  const replace = useGame((s) => s.replaceShip);

  const stats = SHIPS[ship.class];
  const hullLoss = stats.hullMax - ship.hull;
  const sailLoss = stats.sailMax - ship.sail;
  const fullCost = Math.max(0, hullLoss * 8 + sailLoss * 4);
  const patchCost = Math.ceil(fullCost * 0.35);
  const hullPatchG = Math.round(hullLoss * 8);
  const sailPatchG = Math.round(sailLoss * 4);

  const available = (['sloop', 'brig', 'frigate', 'galleon', 'manOwar'] as ShipClass[]).filter((c) => {
    if (c === ship.class) return false;
    if (port.size === 'small') return c === 'sloop';
    if (port.size === 'medium') return c === 'sloop' || c === 'brig';
    if (port.size === 'large') return c !== 'manOwar';
    return true;
  });

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      className="pixel-card w-full max-w-md absolute"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-pixel text-gold text-sm">{t('shipyard.title')}</h3>
        <button className="pixel-btn ghost !text-[9px]" onClick={onClose}>
          ✕
        </button>
      </div>
      <p className="text-[10px] italic opacity-70 mb-3">{t('shipyard.subtitle')}</p>

      <div className="mb-3 space-y-2">
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span>🛶 {t('shipyard.hullStatus', { current: ship.hull, max: stats.hullMax })}</span>
          </div>
          <Bar value={ship.hull} max={stats.hullMax} tone={ship.hull < stats.hullMax * 0.3 ? 'bg-rose-500' : 'bg-emerald-500'} />
        </div>
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span>⛵ {t('shipyard.sailStatus', { current: ship.sail, max: stats.sailMax })}</span>
          </div>
          <Bar value={ship.sail} max={stats.sailMax} tone={ship.sail < stats.sailMax * 0.3 ? 'bg-rose-500' : 'bg-sky-400'} />
        </div>
      </div>

      {fullCost > 0 && (
        <p className="text-[10px] opacity-70 mb-2">
          {t('shipyard.breakdown', { hull: hullPatchG, sail: sailPatchG })}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          className="pixel-btn primary"
          disabled={fullCost === 0 || gold < fullCost}
          onClick={() => {
            if (spend(fullCost)) repair();
          }}
        >
          🔨 {t('shipyard.repair', { cost: fullCost })}
        </button>
        <button
          className="pixel-btn"
          disabled={patchCost === 0 || gold < patchCost}
          onClick={() => {
            if (spend(patchCost)) patch(0.5, 0.5);
          }}
        >
          🩹 {t('shipyard.patchRepair', { cost: patchCost })}
        </button>
      </div>

      {available.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold mb-1 opacity-80">{t('shipyard.newShip')}</div>
          <div className="flex flex-col gap-2">
            {available.map((c) => {
              const s = SHIPS[c];
              return (
                <button
                  key={c}
                  className="pixel-btn ghost text-left flex items-center justify-between"
                  disabled={gold < s.price}
                  onClick={() => {
                    if (spend(s.price)) replace(c);
                  }}
                >
                  <span>{s.displayKey}</span>
                  <span className="text-[10px] opacity-70">
                    🛶{s.hullMax} · 🔫{s.cannons} · 📦{s.hold} · {s.price}g
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
