import Phaser from 'phaser';
import type { ShipSilhouette } from '@/game/data/ships';

export type ShipTone = 'player' | 'enemy' | 'navy' | 'merchant';

export interface ShipGraphicOptions {
  tone: ShipTone;
  silhouette: ShipSilhouette;
  scale?: number;
}

/**
 * Oldalnézeti hajó — egyetlen részletes sprite. A hajó NEM forog (Pirates!-stílus),
 * csak horizontálisan tükröződik menetirány szerint. Gyengéd bobbing animáció.
 */
export class ShipGraphic {
  readonly container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Image;
  private facing: 'L' | 'R' = 'R';
  private bobT: number;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ShipGraphicOptions) {
    const scale = opts.scale ?? 1;
    const key = `ship-${opts.tone}-${opts.silhouette}`;
    this.container = scene.add.container(x, y);
    this.body = scene.add.image(0, 0, key).setOrigin(0.5, 0.7);
    this.container.add([this.body]);
    this.container.setScale(scale);
    this.bobT = Math.random() * 1000;
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

  /**
   * @param heading radiánban, hajó haladási iránya
   * @param _windDir abszolút szélirány (jövőbeli sail-animációra)
   * @param dt frame delta ms-ben a bólogatáshoz
   */
  update(heading: number, _windDir: number, dt = 16): void {
    this.bobT += dt;
    const bob = Math.sin(this.bobT * 0.003) * 1.5;
    this.body.setY(bob);
    this.body.setRotation(Math.sin(this.bobT * 0.002) * 0.03);
    const cosH = Math.cos(heading);
    const wantFacing = cosH >= 0 ? 'R' : 'L';
    if (wantFacing !== this.facing) {
      this.facing = wantFacing;
      this.body.setFlipX(wantFacing === 'L');
    }
  }

  setDepth(d: number): void {
    this.container.setDepth(d);
  }

  setTint(tint: number): void {
    this.body.setTint(tint);
  }

  clearTint(): void {
    this.body.clearTint();
  }

  setAlpha(a: number): void {
    this.body.setAlpha(a);
  }

  destroy(): void {
    this.container.destroy();
  }
}
