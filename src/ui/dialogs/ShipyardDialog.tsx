import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGame } from '@/state/gameStore';
import { SHIPS, type ShipClass } from '@/game/data/ships';
import type { Port } from '@/game/data/ports';

interface Props {
  port: Port;
  onClose: () => void;
}

export function ShipyardDialog({ port, onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const ship = useGame((s) => s.ship);
  const gold = useGame((s) => s.career.gold);
  const repair = useGame((s) => s.repairShip);
  const spend = useGame((s) => s.spendGold);
  const replace = useGame((s) => s.replaceShip);

  const stats = SHIPS[ship.class];
  const hullLoss = stats.hullMax - ship.hull;
  const sailLoss = stats.sailMax - ship.sail;
  const repairCost = Math.max(0, hullLoss * 8 + sailLoss * 4);

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
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-pixel text-gold text-sm">{t('shipyard.title')}</h3>
        <button className="pixel-btn ghost !text-[9px]" onClick={onClose}>
          ✕
        </button>
      </div>
      <p className="text-xs opacity-80 mb-2">
        {stats.displayKey} · ⛵{ship.sail}/{stats.sailMax} · 🛶{ship.hull}/{stats.hullMax}
      </p>
      <button
        className="pixel-btn w-full mb-2"
        disabled={hullLoss === 0 && sailLoss === 0}
        onClick={() => {
          if (spend(repairCost)) repair();
        }}
      >
        {t('shipyard.repair', { cost: repairCost })}
      </button>
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
