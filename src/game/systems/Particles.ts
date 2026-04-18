import Phaser from 'phaser';

export const Particles = {
  smoke(scene: Phaser.Scene, x: number, y: number, opts?: { count?: number; depth?: number; scale?: number; spread?: number; rise?: number }): void {
    const count = opts?.count ?? 6;
    const depth = opts?.depth ?? 12;
    const baseScale = opts?.scale ?? 1;
    const spread = opts?.spread ?? 18;
    const rise = opts?.rise ?? 30;
    for (let i = 0; i < count; i++) {
      const dx = (Math.random() - 0.5) * spread;
      const dy = (Math.random() - 0.5) * spread * 0.6;
      const p = scene.add.image(x + dx, y + dy, 'smoke-puff').setDepth(depth).setAlpha(0.85).setScale(0.4 * baseScale);
      scene.tweens.add({
        targets: p,
        scale: 1.6 * baseScale,
        alpha: 0,
        x: p.x + (Math.random() - 0.5) * 14,
        y: p.y - rise - Math.random() * 12,
        duration: 700 + Math.random() * 600,
        onComplete: () => p.destroy(),
      });
    }
  },

  flash(scene: Phaser.Scene, x: number, y: number, depth = 14): void {
    const f = scene.add.image(x, y, 'muzzle-flash').setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
    f.setScale(1.4);
    scene.tweens.add({
      targets: f,
      scale: 0.4,
      alpha: 0,
      duration: 220,
      onComplete: () => f.destroy(),
    });
  },

  sparks(scene: Phaser.Scene, x: number, y: number, count = 6, depth = 13): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 18;
      const p = scene.add.image(x, y, 'spark').setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist + 6,
        alpha: 0,
        duration: 280 + Math.random() * 200,
        onComplete: () => p.destroy(),
      });
    }
  },

  fire(scene: Phaser.Scene, x: number, y: number, depth = 11): void {
    for (let i = 0; i < 4; i++) {
      const p = scene.add.image(x + (Math.random() - 0.5) * 6, y, 'fire-particle').setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({
        targets: p,
        y: p.y - 14 - Math.random() * 10,
        alpha: 0,
        scale: 0.4,
        duration: 600 + Math.random() * 300,
        onComplete: () => p.destroy(),
      });
    }
  },

  splash(scene: Phaser.Scene, x: number, y: number, depth = 10): void {
    const s = scene.add.image(x, y, 'splash').setDepth(depth).setScale(0.7);
    scene.tweens.add({
      targets: s,
      scale: 1.4,
      alpha: 0,
      duration: 500,
      onComplete: () => s.destroy(),
    });
  },

  explosion(scene: Phaser.Scene, x: number, y: number, depth = 14): void {
    const e = scene.add.image(x, y, 'explosion').setDepth(depth).setBlendMode(Phaser.BlendModes.ADD).setScale(0.8);
    scene.tweens.add({
      targets: e,
      scale: 2.2,
      alpha: 0,
      duration: 420,
      onComplete: () => e.destroy(),
    });
    Particles.smoke(scene, x, y, { count: 8, depth: depth - 1, scale: 1.2 });
    Particles.sparks(scene, x, y, 10, depth);
  },
};
