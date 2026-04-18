import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { useGame } from '@/state/gameStore';
import { mulberry32, hashString } from '@/utils/rng';
import type { Port, NationId } from '@/game/data/ports';
import { PORTS } from '@/game/data/ports';

interface Props {
  port: Port;
  onClose: () => void;
}

export function GovernorDialog({ port, onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const rep = useGame((s) => s.reputation);
  const days = useGame((s) => s.career.daysAtSea);
  const nation = useGame((s) => s.career.nation);
  const [msg, setMsg] = useState<string | null>(null);
  const [danceIdx, setDanceIdx] = useState(0);

  const mission = useMemo(() => {
    const rng = mulberry32(hashString(`${port.id}:gov:${Math.floor(days / 3)}`));
    const target = PORTS[Math.floor(rng() * PORTS.length)]!;
    const reward = 300 + Math.floor(rng() * 700);
    const enemies: NationId[] = ['magyar', 'rac', 'bunyevac', 'olah', 'tot', 'oszman', 'svab'];
    const candidates = enemies.filter((n) => n !== port.nation);
    const enemyNation = candidates[Math.floor(rng() * candidates.length)]!;
    return { target, reward, enemyNation };
  }, [port, days]);

  const accept = () => {
    useGame.getState().addGold(mission.reward);
    useGame.getState().changeReputation(port.nation, +6);
    useGame.getState().changeReputation(mission.enemyNation, -4);
    setMsg(`${t('governor.reward')}: +${mission.reward} ${t('hud.gold')}.`);
  };

  const danceSteps = ['⬅', '➡', '⬆', '⬇'];
  const pattern = useMemo(() => {
    const rng = mulberry32(hashString(`${port.id}:dance:${days}`));
    return Array.from({ length: 5 }, () => danceSteps[Math.floor(rng() * 4)]!);
  }, [port, days]);

  const tapDance = (step: string) => {
    if (step === pattern[danceIdx]) {
      const next = danceIdx + 1;
      if (next >= pattern.length) {
        setDanceIdx(0);
        useGame.getState().addGold(150);
        useGame.getState().changeReputation(port.nation, +10);
        setMsg('Ragyogó tánc! A kormányzó lánya kegyébe fogadott.');
      } else setDanceIdx(next);
    } else {
      setDanceIdx(0);
      setMsg('Rálépsz a lábára. A zene elhalkul.');
    }
  };

  const standing = port.nation === 'crnagorac' ? 0 : rep[port.nation as Exclude<NationId, 'crnagorac'>];
  const friendly = nation === port.nation || standing > 20;

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      className="pixel-card w-full max-w-md absolute"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-pixel text-gold text-sm">{t('governor.title')}</h3>
        <button className="pixel-btn ghost !text-[9px]" onClick={onClose}>
          ✕
        </button>
      </div>
      <p className="text-xs opacity-80 mb-2">
        {t(`nations.${port.nation}`)} · {t('hud.gold')} állás: {standing}
      </p>

      {friendly ? (
        <>
          <button className="pixel-btn w-full mb-2" onClick={accept}>
            {t('governor.mission')} — {t(`nations.${mission.enemyNation}`)} ({mission.reward}g)
          </button>
          <div className="mt-3">
            <div className="text-[11px] opacity-80 mb-1">{t('governor.ballInvite')}</div>
            <div className="text-center text-lg font-pixel text-gold mb-1">
              {pattern.map((s, i) => (
                <span key={i} className={i === danceIdx ? 'text-parchment-50' : 'opacity-40'}>
                  {s}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {danceSteps.map((s) => (
                <button key={s} className="pixel-btn !py-3 !text-lg" onClick={() => tapDance(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs opacity-80">Az őrök nem engednek be. Javítanod kell a viszonyt a {t(`nations.${port.nation}`)} kormánnyal.</p>
      )}

      {msg && <p className="mt-3 text-xs font-serif italic text-parchment-200">{msg}</p>}
    </motion.div>
  );
}
