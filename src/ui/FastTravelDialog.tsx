import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { useGame } from '@/state/gameStore';
import { PORTS, WORLD_W, WORLD_H, type Port } from '@/game/data/ports';
import { SHIPS } from '@/game/data/ships';
import { bus } from '@/game/EventBus';

interface Props {
  onClose: () => void;
}

function nationHex(n: Port['nation']): string {
  return ({
    magyar: '#c0392b',
    rac: '#3470d6',
    bunyevac: '#4f6ba6',
    olah: '#e0b24f',
    tot: '#c6d5ee',
    oszman: '#2d5a2d',
    svab: '#1c1c1c',
    crnagorac: '#7a2e0e',
  } as const)[n];
}

export function FastTravelDialog({ onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const visited = useGame((s) => s.quests?.visitedPorts ?? []);
  const pos = useGame((s) => s.worldPos);
  const ship = useGame((s) => s.ship);
  const food = useGame((s) => s.food);
  const gold = useGame((s) => s.career.gold);

  const speed = SHIPS[ship.class].speed;

  const travelTargets = useMemo(() => {
    const px = pos?.x ?? WORLD_W / 2;
    const py = pos?.y ?? WORLD_H / 2;
    return PORTS
      .filter((p) => visited.includes(p.id) || p.homePort)
      .map((p) => {
        const dist = Math.hypot(p.x - px, p.y - py);
        const days = Math.max(1, Math.round(dist / (120 * speed)));
        const foodCost = Math.max(1, Math.round((days * ship.crew) / 10));
        const goldCost = Math.round(days * 4); // kis rezsi: vitorla, élelmen felüli
        return { port: p, dist, days, foodCost, goldCost };
      })
      .sort((a, b) => a.dist - b.dist);
  }, [visited, pos, speed, ship.crew]);

  const travel = (portId: string, days: number, foodCost: number, goldCost: number) => {
    const state = useGame.getState();
    if (state.food < foodCost) {
      bus.emit('toast', { message: 'Nincs elég élelem az útra!', kind: 'bad' });
      return;
    }
    if (state.career.gold < goldCost) {
      bus.emit('toast', { message: 'Nincs elég arany a vitorlázási illetékre!', kind: 'bad' });
      return;
    }
    state.advanceDays(days);
    state.consumeFood(foodCost);
    state.spendGold(goldCost);
    bus.emit('world:fastTravel', { portId });
    bus.emit('toast', { message: `Átvitorláztál ${PORTS.find((p) => p.id === portId)?.name}-ra (${days} nap).`, kind: 'good' });
    onClose();
  };

  const scale = 0.18;
  const mapW = WORLD_W * scale;
  const mapH = WORLD_H * scale;

  return (
    <div className="dialog-backdrop z-50">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pixel-card w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-pixel text-gold text-sm">🧭 Gyorsutazás</h3>
          <button className="pixel-btn ghost !text-[9px]" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="relative mx-auto mb-3 bg-sea-900 ring-1 ring-parchment-200/20 rounded overflow-hidden" style={{ width: mapW, height: mapH }}>
          {PORTS.map((p) => {
            const isVisited = visited.includes(p.id) || p.homePort;
            return (
              <div
                key={p.id}
                className="absolute rounded-full"
                style={{
                  left: p.x * scale - 3,
                  top: p.y * scale - 3,
                  width: 6, height: 6,
                  backgroundColor: isVisited ? nationHex(p.nation) : 'rgba(120,120,120,0.3)',
                  border: p.homePort ? '2px solid #f2c94c' : 'none',
                }}
                title={p.name}
              />
            );
          })}
          {pos && (
            <div
              className="absolute rounded-full bg-gold animate-pulse"
              style={{ left: pos.x * scale - 4, top: pos.y * scale - 4, width: 8, height: 8 }}
            />
          )}
        </div>

        <p className="text-[10px] opacity-70 mb-2">
          Csak meglátogatott kikötőkbe vitorlázhatsz át közvetlenül. Élelem: {food} · Arany: {gold}
        </p>

        <div className="max-h-[40vh] overflow-y-auto pr-1 space-y-1">
          {travelTargets.length === 0 && (
            <div className="text-[11px] opacity-60 italic text-center py-4">
              Még nem ismersz távoli kikötőt. Vitorlázz, fedezz fel!
            </div>
          )}
          {travelTargets.map(({ port, dist, days, foodCost, goldCost }) => (
            <button
              key={port.id}
              className="w-full pixel-btn ghost flex items-center justify-between !py-2 text-left"
              disabled={food < foodCost || gold < goldCost}
              onClick={() => travel(port.id, days, foodCost, goldCost)}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: nationHex(port.nation) }} />
                <span className="text-xs">{port.homePort ? '🌻 ' : ''}{port.name}</span>
              </div>
              <div className="text-[10px] opacity-70">
                📅 {days}d · 🍖 {foodCost} · 💰 {goldCost}g · {Math.round(dist)}px
              </div>
            </button>
          ))}
        </div>
        <p className="text-[9px] opacity-50 italic mt-2 text-center">{t('tutorial.wind')}</p>
      </motion.div>
    </div>
  );
}
