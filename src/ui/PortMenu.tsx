import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/state/gameStore';
import { findPort } from '@/game/data/ports';
import { TradeDialog } from './dialogs/TradeDialog';
import { TavernDialog } from './dialogs/TavernDialog';
import { ShipyardDialog } from './dialogs/ShipyardDialog';
import { GovernorDialog } from './dialogs/GovernorDialog';
import { bus } from '@/game/EventBus';
import { useEffect } from 'react';
import { checkQuestCompletion } from '@/game/systems/QuestSystem';

type Sub = 'tavern' | 'merchant' | 'shipyard' | 'governor' | null;

export function PortMenu(): JSX.Element | null {
  const { t } = useTranslation();
  const portId = useGame((s) => s.currentPortId);
  const leavePort = useGame((s) => s.leavePort);
  const playerNation = useGame((s) => s.career.nation);
  const fragments = useGame((s) => s.treasureFragments);
  const [sub, setSub] = useState<Sub>(null);

  if (!portId) return null;
  const port = findPort(portId);
  if (!port) return null;

  useEffect(() => {
    checkQuestCompletion(useGame.getState(), (_id, title, reward) =>
      bus.emit('toast', { message: `Cél teljesült: ${title} (+${reward}g)`, kind: 'good' }),
    );
  }, [portId]);

  const hostile = port.nation !== 'pirate' && port.nation !== playerNation;
  const canHunt = fragments >= 4;

  const startLand = () => {
    if (port.nation !== 'pirate') {
      useGame.getState().changeReputation(port.nation, -20);
    }
    useGame.getState().leavePort();
    bus.emit('scene:start', { key: 'Land' });
  };

  const startTreasure = () => {
    useGame.getState().leavePort();
    bus.emit('scene:start', { key: 'Treasure' });
  };

  return (
    <div className="dialog-backdrop">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="pixel-card w-full max-w-md"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-pixel text-gold text-lg">{port.name}</h2>
            <p className="text-xs opacity-70">{t(`nations.${port.nation}`)}</p>
          </div>
          <button className="pixel-btn ghost !text-[9px]" onClick={leavePort}>
            {t('port.leave')}
          </button>
        </div>

        <p className="mt-2 text-sm font-serif italic">{t('port.welcome', { port: port.name })}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="pixel-btn" onClick={() => setSub('tavern')}>
            🍺 {t('port.tavern')}
          </button>
          <button className="pixel-btn" onClick={() => setSub('merchant')}>
            ⚖ {t('port.merchant')}
          </button>
          <button className="pixel-btn" onClick={() => setSub('shipyard')}>
            🛠 {t('port.shipyard')}
          </button>
          <button className="pixel-btn" onClick={() => setSub('governor')}>
            🎩 {t('port.governor')}
          </button>
          {hostile && (
            <button className="pixel-btn danger col-span-2" onClick={startLand}>
              🏰 Ostrom — {port.name}
            </button>
          )}
          {canHunt && (
            <button className="pixel-btn primary col-span-2" onClick={startTreasure}>
              💎 Kincskeresés ({fragments}/4)
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {sub === 'merchant' && <TradeDialog port={port} onClose={() => setSub(null)} />}
        {sub === 'tavern' && <TavernDialog port={port} onClose={() => setSub(null)} />}
        {sub === 'shipyard' && <ShipyardDialog port={port} onClose={() => setSub(null)} />}
        {sub === 'governor' && <GovernorDialog port={port} onClose={() => setSub(null)} />}
      </AnimatePresence>
    </div>
  );
}
