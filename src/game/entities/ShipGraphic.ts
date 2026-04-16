import Phaser from 'phaser';

export type HullKey = 'hull-player' | 'hull-enemy' | 'hull-navy' | 'hull-merchant';
export type SailTheme = 'canvas' | 'enemy' | 'navy';
export type FlagKey = 'flag-pirate' | 'flag-england' | 'flag-spain' | 'flag-france' | 'flag-netherlands';

export interface ShipGraphicOptions {
  hull: HullKey;
  sailTheme?: SailTheme;
  flag: FlagKey;
  scale?: number;
}

/**
 * Egy hajó = container (hull + 3 vitorla + zászló + árnyék).
 * A háromárbocos elrendezés (fore / main / mizzen) külön vitorlákkal rendelkezik,
 * melyek helyi forgása a szélhez viszonyított irány függvénye (luffing szembeszélben).
 */
export class ShipGraphic {
  readonly container: Phaser.GameObjects.Container;
  private fore: Phaser.GameObjects.Image;
  private main: Phaser.GameObjects.Image;
  private mizzen: Phaser.GameObjects.Image;
  private flag: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ShipGraphicOptions) {
    const scale = opts.scale ?? 1;
    this.container = scene.add.container(x, y);

    const shadow = scene.add.image(2, 4, 'ship-shadow').setAlpha(0.55);

    const hull = scene.add.image(0, 0, opts.hull);

    const theme = opts.sailTheme ?? 'canvas';
    const prefix = theme === 'canvas' ? 'sail' : theme === 'enemy' ? 'sail-enemy' : 'sail-navy';

    // A vitorlák a hajó hossztengelyén (orr jobbra alapértelmezetten).
    this.mizzen = scene.add.image(-18, 0, `${prefix}-mizzen`).setOrigin(0.5, 0.5);
    this.main = scene.add.image(0, 0, `${prefix}-main`).setOrigin(0.5, 0.5);
    this.fore = scene.add.image(18, 0, `${prefix}-fore`).setOrigin(0.5, 0.5);

    this.flag = scene.add.image(-24, -6, opts.flag);
    this.flag.setOrigin(0, 0.5);

    // Rétegrend: árnyék alul, hull, majd vitorlák, legfelül zászló
    this.container.add([shadow, hull, this.mizzen, this.main, this.fore, this.flag]);
    this.container.setScale(scale);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  /** Hajótest forog `heading` irányába, vitorlák a szélhez igazodnak. */
  update(heading: number, windDir: number): void {
    this.container.setRotation(heading);
    const rel = Phaser.Math.Angle.Wrap(windDir - heading);
    const abs = Math.abs(rel);
    const luff = abs > (Math.PI * 3) / 4;
    const sign = rel === 0 ? 1 : Math.sign(rel);
    // Helyi vitorlaszög: hátszélnél π/2 (keresztben), szembeszélnél 0 (hosszan)
    const sailLocal = (Math.PI - abs) * 0.5 * sign;
    const alpha = luff ? 0.55 : 1;
    const stretch = luff ? 0.5 : 1;
    [this.fore, this.main, this.mizzen].forEach((s) => {
      s.setRotation(sailLocal);
      s.setAlpha(alpha);
      s.setScale(stretch, 1);
    });
    // Zászló lobogása abszolút szélirányban
    this.flag.setRotation(-heading + windDir);
  }

  setDepth(d: number): void {
    this.container.setDepth(d);
  }

  setTint(tint: number): void {
    this.container.iterate((c: Phaser.GameObjects.GameObject) => {
      if (c instanceof Phaser.GameObjects.Image) c.setTint(tint);
    });
  }

  clearTint(): void {
    this.container.iterate((c: Phaser.GameObjects.GameObject) => {
      if (c instanceof Phaser.GameObjects.Image) c.clearTint();
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
