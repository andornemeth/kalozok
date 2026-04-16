import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { useGame } from '@/state/gameStore';
import { GOODS, type GoodId } from '@/game/data/goods';
import { SHIPS } from '@/game/data/ships';
import { priceFor, stockFor } from '@/game/systems/EconomySystem';
import type { Port } from '@/game/data/ports';

interface Props {
  port: Port;
  onClose: () => void;
}

export function TradeDialog({ port, onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const days = useGame((s) => s.career.daysAtSea);
  const cargo = useGame((s) => s.cargo);
  const gold = useGame((s) => s.career.gold);
  const ship = useGame((s) => s.ship);

  const prices = useMemo(() => new Map(GOODS.map((g) => [g.id, priceFor(port, g.id, days)])), [port, days]);
  const stocks = useMemo(() => new Map(GOODS.map((g) => [g.id, stockFor(port, g.id, days)])), [port, days]);
  const holdUsed = useMemo(() => GOODS.reduce((sum, g) => sum + cargo[g.id] * g.volume, 0), [cargo]);
  const holdMax = SHIPS[ship.class].hold;

  const buy = (id: GoodId) => {
    const price = prices.get(id) ?? 0;
    const good = GOODS.find((g) => g.id === id)!;
    if (gold < price) return;
    if (holdUsed + good.volume > holdMax) return;
    if ((stocks.get(id) ?? 0) <= 0) return;
    if (!useGame.getState().spendGold(price)) return;
    useGame.getState().addCargo(id, 1);
    stocks.set(id, (stocks.get(id) ?? 1) - 1);
  };

  const sell = (id: GoodId) => {
    if (cargo[id] <= 0) return;
    const price = Math.round((prices.get(id) ?? 0) * 0.9);
    useGame.getState().removeCargo(id, 1);
    useGame.getState().addGold(price);
  };

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      className="pixel-card w-full max-w-md absolute"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-pixel text-gold text-sm">{t('merchant.title')}</h3>
        <button className="pixel-btn ghost !text-[9px]" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="text-[11px] mb-2 opacity-80">
        💰 {gold} · 📦 {holdUsed}/{holdMax}
      </div>
      <div className="max-h-[50vh] overflow-y-auto pr-1">
        {GOODS.map((g) => {
          const price = prices.get(g.id) ?? 0;
          const stock = stocks.get(g.id) ?? 0;
          const have = cargo[g.id];
          const highlight = port.specialty === g.id ? 'text-emerald-300' : port.scarcity === g.id ? 'text-rose-300' : '';
          return (
            <div key={g.id} className={`flex items-center justify-between gap-2 py-1.5 border-b border-parchment-200/10 ${highlight}`}>
              <div className="flex-1">
                <div className="text-xs font-semibold">{t(`goods.${g.id}`)}</div>
                <div className="text-[10px] opacity-60">
                  {t('merchant.stock')}: {stock} · {t('merchant.cargo')}: {have}
                </div>
              </div>
              <div className="text-xs w-14 text-right">{price}g</div>
              <button className="pixel-btn !py-1 !px-2 !text-[9px]" disabled={stock <= 0 || gold < price} onClick={() => buy(g.id)}>
                +
              </button>
              <button className="pixel-btn ghost !py-1 !px-2 !text-[9px]" disabled={have <= 0} onClick={() => sell(g.id)}>
                −
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
