import Phaser from 'phaser';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { Audio } from '@/audio/AudioManager';
import { ShipGraphic, type ShipKind } from '@/game/entities/ShipGraphic';
import type { NationId } from '@/game/data/ports';

type EnemyKind = 'pirate' | 'navy' | 'merchant';

export class EncounterScene extends Phaser.Scene {
  private enemyKind: EnemyKind = 'pirate';
  private enemyNation: NationId = 'pirate';

  constructor() {
    super('Encounter');
  }

  init(data: { enemyKind?: EnemyKind; enemyNation?: NationId }): void {
    this.enemyKind = data.enemyKind ?? 'pirate';
    this.enemyNation = data.enemyNation ?? 'pirate';
  }

  create(): void {
    bus.emit('scene:changed', { key: 'encounter' });
    this.cameras.main.fadeIn(250, 4, 20, 26);
    this.cameras.main.setBackgroundColor('#082427');

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    Audio.click();

    // Hangulatos háttér — víz csíkok
    const bg = this.add.graphics();
    bg.fillStyle(0x04141a, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);
    bg.fillStyle(0x0e4044, 1);
    bg.fillRect(0, cy + 30, this.scale.width, cy);
    bg.lineStyle(1, 0x1a7f86, 0.4);
    for (let y = cy + 40; y < this.scale.height; y += 14) {
      bg.lineBetween(0, y, this.scale.width, y);
    }

    // Ellenfél hajó középen
    const shipKind: ShipKind =
      this.enemyKind === 'pirate' ? 'ship-enemy' : this.enemyKind === 'navy' ? 'ship-navy' : 'ship-merchant';
    const enemy = new ShipGraphic(this, cx, cy - 10, { kind: shipKind, scale: 1.4 });
    enemy.setDepth(5);
    enemy.update(0, 0, 16);
    this.tweens.add({
      targets: enemy.container,
      y: cy - 4,
      yoyo: true,
      repeat: -1,
      duration: 1800,
      ease: 'Sine.inOut',
    });

    const kindLabel =
      this.enemyKind === 'pirate' ? 'KALÓZHAJÓ' : this.enemyKind === 'navy' ? 'HADIHAJÓ' : 'KERESKEDŐ';
    const nationLabel =
      this.enemyNation === 'pirate'
        ? 'szabadkalóz'
        : this.enemyNation === 'england'
          ? 'angol'
          : this.enemyNation === 'spain'
            ? 'spanyol'
            : this.enemyNation === 'france'
              ? 'francia'
              : 'holland';

    this.add
      .text(cx, 40, 'HAJÓ LÁTÓTÁVOLSÁGBAN', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#e0b24f',
        stroke: '#04141a',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 72, kindLabel, {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        color: this.enemyKind === 'pirate' ? '#ff6a3d' : this.enemyKind === 'navy' ? '#4f8bff' : '#bfe2e4',
        stroke: '#04141a',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 94, `(${nationLabel})`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '9px',
        color: '#fbf5e3',
      })
      .setOrigin(0.5);

    // Döntési gombok alul
    const btnY = this.scale.height - 70;
    this.makeButton(cx - 100, btnY, 160, 56, 0x7a2e0e, 'CSATA', () => this.engage());
    this.makeButton(cx + 100, btnY, 160, 56, 0x145f65, 'MENEKÜLÉS', () => this.flee());

    // Tipp
    const tipY = btnY - 44;
    let tip = 'Vívd meg a csatát zsákmányért!';
    if (this.enemyKind === 'navy') tip = 'Hadihajó — veszélyes ellenfél!';
    if (this.enemyKind === 'merchant') tip = 'Védetlen cél — könnyű zsákmány.';
    this.add
      .text(cx, tipY, tip, {
        fontFamily: '"Press Start 2P"',
        fontSize: '9px',
        color: '#d9c99a',
      })
      .setOrigin(0.5);
  }

  private makeButton(
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    text: string,
    onTap: () => void,
  ): void {
    const c = this.add.container(x, y).setDepth(20);
    const bg = this.add.rectangle(0, 0, w, h, color, 0.95).setStrokeStyle(3, 0xfbf5e3);
    const label = this.add
      .text(0, 0, text, { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#fbf5e3' })
      .setOrigin(0.5);
    c.add([bg, label]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => bg.setFillStyle(color, 0.7));
    c.on('pointerout', () => bg.setFillStyle(color, 0.95));
    c.on('pointerup', () => {
      Audio.click();
      onTap();
    });
  }

  private engage(): void {
    this.cameras.main.fadeOut(300, 4, 20, 26);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Naval', { enemyKind: this.enemyKind, enemyNation: this.enemyNation });
    });
  }

  private flee(): void {
    // Kis büntetés menekülésért
    const g = useGame.getState();
    if (this.enemyKind !== 'merchant') {
      g.damageShip(2, 4, 0);
      bus.emit('toast', { message: 'Megmenekültél — kisebb károkkal.', kind: 'info' });
    } else {
      bus.emit('toast', { message: 'Elhagytad a kereskedőt.', kind: 'info' });
    }
    this.cameras.main.fadeOut(250, 4, 20, 26);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('World'));
  }
}
