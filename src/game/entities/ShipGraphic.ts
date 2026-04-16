import Phaser from 'phaser';

export type HullKey = 'hull-player' | 'hull-enemy' | 'hull-navy' | 'hull-merchant';
export type SailKey = 'sail-white' | 'sail-tan' | 'sail-red' | 'sail-blue';
export type FlagKey = 'flag-pirate' | 'flag-england' | 'flag-spain' | 'flag-france' | 'flag-netherlands';

export interface ShipGraphicOptions {
  hull: HullKey;
  sail: SailKey;
  flag: FlagKey;
  scale?: number;
}

/**
 * A ship is a container of hull + sail + flag so that the sail can react
 * to the wind independently of the hull's heading.
 */
export class ShipGraphic {
  readonly container: Phaser.GameObjects.Container;
  private sail: Phaser.GameObjects.Image;
  private flag: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ShipGraphicOptions) {
    const scale = opts.scale ?? 1;
    this.container = scene.add.container(x, y);

    const hull = scene.add.image(0, 0, opts.hull);
    this.sail = scene.add.image(8, -6, opts.sail);
    this.sail.setOrigin(0.5, 0.85);
    this.flag = scene.add.image(-14, -14, opts.flag);
    this.flag.setOrigin(0, 0.5);

    this.container.add([this.sail, hull, this.flag]);
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

  /** Orient the hull to face `heading` (radians) and swing the sail to catch the wind. */
  update(heading: number, windDir: number): void {
    this.container.setRotation(heading);
    const rel = Phaser.Math.Angle.Wrap(windDir - heading);
    const luff = Math.abs(rel) > (Math.PI * 3) / 4;
    const sign = rel === 0 ? 1 : Math.sign(rel);
    const sailLocal = ((Math.PI - Math.abs(rel)) * 0.5) * sign;
    this.sail.setRotation(sailLocal);
    this.sail.setAlpha(luff ? 0.55 : 1);
    this.sail.setScale(luff ? 0.85 : 1, 1);
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
