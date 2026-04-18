import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { useGame } from '@/state/gameStore';
import { GOODS, type GoodId } from '@/game/data/goods';
import { SHIPS } from '@/game/data/ships';
import { priceFor, stockFor } from '@/game/systems/EconomySystem';
import type { Port } from '@/game/data/ports';

function Sparkline({ values, current }: { values: number[]; current: number }): JSX.Element {
  const w = 64;
  const h = 18;
  const min = Math.min(...values, current);
  const max = Math.max(...values, current);
  const range = Math.max(1, max - min);
  const step = w / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 2) - 1}`).join(' ');
  const cy = h - ((current - min) / range) * (h - 2) - 1;
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={pts} fill="none" stroke="rgba(251,245,227,0.55)" strokeWidth="1" />
      <circle cx={w} cy={cy} r="2" fill="#e0b24f" />
    </svg>
  );
}

interface Props {
  port: Port;
  onClose: () => void;
}

function priceVerdict(price: number, base: number): { label: string; tone: string } {
  const ratio = price / base;
  if (ratio < 0.7) return { label: 'merchant.priceGreat', tone: 'text-emerald-300' };
  if (ratio < 0.9) return { label: 'merchant.priceGood', tone: 'text-emerald-200' };
  if (ratio < 1.15) return { label: 'merchant.priceFair', tone: 'text-parchment-200' };
  if (ratio < 1.4) return { label: 'merchant.priceBad', tone: 'text-amber-300' };
  return { label: 'merchant.priceTerrible', tone: 'text-rose-300' };
}

export function TradeDialog({ port, onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const days = useGame((s) => s.career.daysAtSea);
  const cargo = useGame((s) => s.cargo);
  const gold = useGame((s) => s.career.gold);
  const ship = useGame((s) => s.ship);

  const prices = useMemo(() => new Map(GOODS.map((g) => [g.id, priceFor(port, g.id, days)])), [port, days]);
  const stocks = useMemo(() => new Map(GOODS.map((g) => [g.id, stockFor(port, g.id, days)])), [port, days]);
  const history = useMemo(() => {
    const map = new Map<GoodId, number[]>();
    for (const g of GOODS) {
      const arr: number[] = [];
      for (let w = 8; w >= 1; w--) arr.push(priceFor(port, g.id, days - w * 7));
      map.set(g.id, arr);
    }
    return map;
  }, [port, days]);
  const [expanded, setExpanded] = useState<GoodId | null>(null);
  const holdUsed = useMemo(() => GOODS.reduce((sum, g) => sum + cargo[g.id] * g.volume, 0), [cargo]);
  const holdMax = SHIPS[ship.class].hold;

  const buy = (id: GoodId, qty: number) => {
    const good = GOODS.find((g) => g.id === id)!;
    const price = prices.get(id) ?? 0;
    let bought = 0;
    for (let i = 0; i < qty; i++) {
      if (gold - bought * price < price) break;
      if (holdUsed + (bought + 1) * good.volume > holdMax) break;
      const stock = (stocks.get(id) ?? 0) - bought;
      if (stock <= 0) break;
      bought++;
    }
    if (bought === 0) return;
    const totalCost = bought * price;
    if (!useGame.getState().spendGold(totalCost)) return;
    useGame.getState().addCargo(id, bought);
    stocks.set(id, (stocks.get(id) ?? bought) - bought);
  };

  const sell = (id: GoodId, qty: number) => {
    const have = cargo[id];
    const sold = Math.min(have, qty);
    if (sold <= 0) return;
    const price = Math.round((prices.get(id) ?? 0) * 0.9) * sold;
    useGame.getState().removeCargo(id, sold);
    useGame.getState().addGold(price);
  };

  const maxBuy = (id: GoodId) => {
    const good = GOODS.find((g) => g.id === id)!;
    const price = prices.get(id) ?? 0;
    if (price <= 0 || good.volume <= 0) return 0;
    const byGold = Math.floor(gold / price);
    const byHold = Math.floor((holdMax - holdUsed) / good.volume);
    const byStock = stocks.get(id) ?? 0;
    return Math.max(0, Math.min(byGold, byHold, byStock));
  };

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      className="pixel-card w-full max-w-md absolute"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-pixel text-gold text-sm">{t('merchant.title')}</h3>
        <button className="pixel-btn ghost !text-[9px]" onClick={onClose}>
          ✕
        </button>
      </div>
      <p className="text-[10px] italic opacity-70 mb-2">{t('merchant.flavor')}</p>
      <div className="text-[11px] mb-2 flex justify-between">
        <span>💰 {gold}</span>
        <span>📦 {holdUsed}/{holdMax}</span>
      </div>
      <div className="max-h-[55vh] overflow-y-auto pr-1">
        {GOODS.map((g) => {
          const price = prices.get(g.id) ?? 0;
          const stock = stocks.get(g.id) ?? 0;
          const have = cargo[g.id];
          const verdict = priceVerdict(price, g.basePrice);
          const isSpecialty = port.specialty === g.id;
          const isScarcity = port.scarcity === g.id;
          const max = maxBuy(g.id);
          return (
            <div key={g.id} className="py-2 border-b border-parchment-200/10">
              <div
                className="flex items-center justify-between gap-2 cursor-pointer"
                onClick={() => setExpanded((e) => (e === g.id ? null : g.id))}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold">{t(`goods.${g.id}`)}</span>
                    {isSpecialty && <span className="text-[9px] px-1 rounded bg-emerald-700/50">🌻</span>}
                    {isScarcity && <span className="text-[9px] px-1 rounded bg-rose-700/50">🔥</span>}
                  </div>
                  <div className="text-[10px] opacity-60">
                    {t('merchant.stock')}: {stock} · {t('merchant.cargo')}: {have}
                  </div>
                </div>
                <Sparkline values={history.get(g.id) ?? []} current={price} />
                <div className="text-right">
                  <div className={`text-xs font-semibold ${verdict.tone}`}>{price}g</div>
                  <div className={`text-[9px] ${verdict.tone} opacity-80`}>{t(verdict.label)}</div>
                </div>
              </div>
              {expanded === g.id && (
                <div className="text-[10px] opacity-70 mt-1 bg-sea-900/50 rounded p-1.5">
                  Alapár: {g.basePrice}g · Térfogat: {g.volume} · 8 heti ártrend a grafikonon
                </div>
              )}
              <div className="flex gap-1 mt-1.5">
                <button
                  className="pixel-btn !py-1 !px-2 !text-[9px] flex-1"
                  disabled={max < 1}
                  onClick={() => buy(g.id, 1)}
                >
                  +1
                </button>
                <button
                  className="pixel-btn !py-1 !px-2 !text-[9px] flex-1"
                  disabled={max < 5}
                  onClick={() => buy(g.id, 5)}
                >
                  +5
                </button>
                <button
                  className="pixel-btn primary !py-1 !px-2 !text-[9px] flex-1"
                  disabled={max < 1}
                  onClick={() => buy(g.id, max)}
                >
                  {t('merchant.buyMax')} ({max})
                </button>
                <button
                  className="pixel-btn ghost !py-1 !px-2 !text-[9px] flex-1"
                  disabled={have < 1}
                  onClick={() => sell(g.id, 1)}
                >
                  −1
                </button>
                <button
                  className="pixel-btn ghost !py-1 !px-2 !text-[9px] flex-1"
                  disabled={have < 1}
                  onClick={() => sell(g.id, have)}
                >
                  {t('merchant.sellAll')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
