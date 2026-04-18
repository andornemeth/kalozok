import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';

export function PhaserMount(): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref.current || gameRef.current) return;
    let cancelled = false;
    (async () => {
      const mod = await import('@/game/PhaserGame');
      if (cancelled || !ref.current) return;
      gameRef.current = mod.createGame(ref.current);
      setLoading(false);
    })();
    const onScene = ({ key }: { key: string }) => {
      const mapping: Record<string, 'world' | 'port' | 'naval' | 'duel' | 'land' | 'treasure' | 'title' | 'encounter'> = {
        world: 'world',
        port: 'port',
        naval: 'naval',
        duel: 'duel',
        land: 'land',
        treasure: 'treasure',
        encounter: 'encounter',
      };
      const s = mapping[key];
      if (s) useGame.getState().setScene(s);
    };
    bus.on('scene:changed', onScene);
    const onStart = ({ key, data }: { key: string; data?: unknown }) => {
      const g = gameRef.current;
      if (!g) return;
      g.scene.getScenes(true).forEach((s) => s.scene.stop());
      g.scene.start(key, data as object | undefined);
    };
    bus.on('scene:start', onStart);
    const onResize = () => gameRef.current?.scale.refresh();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      cancelled = true;
      bus.off('scene:changed', onScene);
      bus.off('scene:start', onStart);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <>
      <div id="game-root" ref={ref} className="absolute inset-0" />
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-sea-900 text-parchment-100 pointer-events-none">
          <div className="text-4xl mb-3 animate-pulse">⚓</div>
          <div className="font-pixel text-[10px] text-gold">vitorlát bontunk…</div>
        </div>
      )}
    </>
  );
}
