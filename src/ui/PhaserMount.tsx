import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { createGame } from '@/game/PhaserGame';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';

export function PhaserMount(): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!ref.current || gameRef.current) return;
    gameRef.current = createGame(ref.current);
    const onScene = ({ key }: { key: string }) => {
      const mapping: Record<string, 'world' | 'port' | 'naval' | 'duel' | 'land' | 'treasure' | 'title'> = {
        world: 'world',
        port: 'port',
        naval: 'naval',
        duel: 'duel',
        land: 'land',
        treasure: 'treasure',
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
      bus.off('scene:changed', onScene);
      bus.off('scene:start', onStart);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div id="game-root" ref={ref} className="absolute inset-0" />;
}
