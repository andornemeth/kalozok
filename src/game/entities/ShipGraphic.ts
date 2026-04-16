import Phaser from 'phaser';

export type ShipKind = 'ship-player' | 'ship-enemy' | 'ship-navy' | 'ship-merchant';

export interface ShipGraphicOptions {
  kind: ShipKind;
  scale?: number;
}

/**
 * Oldalnézeti hajó — egyetlen részletes sprite. A hajó NEM forog (C64 Pirates!-stílus),
 * csak horizontálisan tükröződik menetirány szerint. Gyengéd bobbing (bólogatás) anim
 * érzékelteti, hogy a vízen van.
 */
export class ShipGraphic {
  readonly container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Image;
  private facing: 'L' | 'R' = 'R';
  private bobT: number;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ShipGraphicOptions) {
    const scale = opts.scale ?? 1;
    this.container = scene.add.container(x, y);
    this.body = scene.add.image(0, 0, opts.kind).setOrigin(0.5, 0.7);
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
   * @param _windDir abszolút szélirány (sail-animációra használható a jövőben)
   * @param dt frame delta ms-ben a bólogatáshoz
   */
  update(heading: number, _windDir: number, dt = 16): void {
    this.bobT += dt;
    // Bólogatás: kis y-eltolás és rotáció
    const bob = Math.sin(this.bobT * 0.003) * 1.5;
    this.body.setY(bob);
    this.body.setRotation(Math.sin(this.bobT * 0.002) * 0.03);
    // Irányváltás — ha haladási irány jobbra (cos>0) -> facing R, balra -> L
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

  destroy(): void {
    this.container.destroy();
  }
}
