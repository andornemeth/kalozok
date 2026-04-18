import Phaser from 'phaser';

/**
 * Egyszerű virtual joystick Phaser-hez. Mobil-first:
 * - saját pointer-ID-t tart, így nem ütközik a fire gombbal (multi-touch)
 * - scene input-jából csak a saját aktivációs zónáján belüli pointerdown-ra reagál
 * - a knob egy kör belsejében mozog, dead-zone 15 px
 * - `angle` + `magnitude` olvasható ki; `active` jelzi hogy éppen érintve van-e
 */
export class Joystick {
  private base: Phaser.GameObjects.Graphics;
  private knob: Phaser.GameObjects.Graphics;
  private centerX: number;
  private centerY: number;
  private baseR: number;
  private knobR: number;
  private pointerId: number | null = null;
  private knobX = 0;
  private knobY = 0;

  constructor(scene: Phaser.Scene, cx: number, cy: number, baseR = 80, knobR = 28) {
    this.centerX = cx;
    this.centerY = cy;
    this.baseR = baseR;
    this.knobR = knobR;

    this.base = scene.add.graphics().setScrollFactor(0).setDepth(30);
    this.knob = scene.add.graphics().setScrollFactor(0).setDepth(31);
    this.render();
  }

  private render(): void {
    this.base.clear();
    // Külső ring
    this.base.fillStyle(0x04141a, 0.65);
    this.base.fillCircle(this.centerX, this.centerY, this.baseR + 6);
    this.base.lineStyle(2, 0xfbf5e3, 0.45);
    this.base.strokeCircle(this.centerX, this.centerY, this.baseR);
    // Irányt segítő halvány kereszt
    this.base.lineStyle(1, 0xfbf5e3, 0.2);
    this.base.lineBetween(this.centerX - this.baseR + 8, this.centerY, this.centerX + this.baseR - 8, this.centerY);
    this.base.lineBetween(this.centerX, this.centerY - this.baseR + 8, this.centerX, this.centerY + this.baseR - 8);

    this.knob.clear();
    const kx = this.centerX + this.knobX;
    const ky = this.centerY + this.knobY;
    const active = this.pointerId !== null;
    this.knob.fillStyle(active ? 0xe0b24f : 0xfbf5e3, 0.85);
    this.knob.fillCircle(kx, ky, this.knobR);
    this.knob.lineStyle(2, 0x04141a, 0.8);
    this.knob.strokeCircle(kx, ky, this.knobR);
  }

  /** @returns true, ha a joystick ezt a pointert átvette (ne kezelje a scene máshogy) */
  handlePointerDown(p: Phaser.Input.Pointer): boolean {
    if (this.pointerId !== null) return false;
    const dx = p.x - this.centerX;
    const dy = p.y - this.centerY;
    // Aktivációs zóna: a bázis-kör + extra margin
    if (dx * dx + dy * dy > (this.baseR + 60) * (this.baseR + 60)) return false;
    this.pointerId = p.id;
    this.updateKnob(dx, dy);
    this.render();
    return true;
  }

  handlePointerMove(p: Phaser.Input.Pointer): void {
    if (this.pointerId !== p.id) return;
    const dx = p.x - this.centerX;
    const dy = p.y - this.centerY;
    this.updateKnob(dx, dy);
    this.render();
  }

  handlePointerUp(p: Phaser.Input.Pointer): void {
    if (this.pointerId !== p.id) return;
    this.pointerId = null;
    this.knobX = 0;
    this.knobY = 0;
    this.render();
  }

  private updateKnob(dx: number, dy: number): void {
    const len = Math.hypot(dx, dy);
    if (len <= this.baseR) {
      this.knobX = dx;
      this.knobY = dy;
    } else {
      this.knobX = (dx / len) * this.baseR;
      this.knobY = (dy / len) * this.baseR;
    }
  }

  /** Aktívan nyomja-e a felhasználó a joystickot. */
  get active(): boolean {
    return this.pointerId !== null;
  }

  /** Aktuális szög radiánban (0 = kelet, π/2 = dél). */
  get angle(): number {
    return Math.atan2(this.knobY, this.knobX);
  }

  /** Normalizált nagyság 0..1, dead-zone aware. */
  get magnitude(): number {
    const len = Math.hypot(this.knobX, this.knobY);
    if (len < 15) return 0;
    return Math.min(1, (len - 15) / (this.baseR - 15));
  }

  reposition(cx: number, cy: number): void {
    this.centerX = cx;
    this.centerY = cy;
    this.render();
  }

  destroy(): void {
    this.base.destroy();
    this.knob.destroy();
  }
}
