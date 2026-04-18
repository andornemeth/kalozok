import Phaser from 'phaser';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { Audio } from '@/audio/AudioManager';
import { ShipGraphic, type ShipTone } from '@/game/entities/ShipGraphic';
import type { ShipSilhouette } from '@/game/data/ships';
import type { NationId } from '@/game/data/ports';

type EnemyKind = 'pirate' | 'navy' | 'merchant';

export class EncounterScene extends Phaser.Scene {
  private enemyKind: EnemyKind = 'pirate';
  private enemyNation: NationId = 'crnagorac';
  private enemySilhouette: ShipSilhouette = 'medium';

  constructor() {
    super('Encounter');
  }

  init(data: { enemyKind?: EnemyKind; enemyNation?: NationId; enemySilhouette?: ShipSilhouette }): void {
    this.enemyKind = data.enemyKind ?? 'pirate';
    this.enemyNation = data.enemyNation ?? 'crnagorac';
    this.enemySilhouette = data.enemySilhouette ?? 'medium';
  }

  create(): void {
    bus.emit('scene:changed', { key: 'encounter' });
    this.input.removeAllListeners();
    this.cameras.main.fadeIn(280, 4, 20, 26);
    this.cameras.main.setBackgroundColor('#082427');
    Audio.click();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // Háttér
    const bg = this.add.graphics();
    bg.fillStyle(0x04141a, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);
    // Nap/ködfátyol fent
    bg.fillStyle(0x0e2630, 1);
    bg.fillRect(0, 0, this.scale.width, cy + 20);
    // Tenger
    bg.fillStyle(0x0e4044, 1);
    bg.fillRect(0, cy + 20, this.scale.width, this.scale.height);
    bg.lineStyle(1, 0x1a7f86, 0.4);
    for (let y = cy + 32; y < this.scale.height; y += 14) {
      bg.lineBetween(0, y, this.scale.width, y);
    }
    // Pár csúcs hullám
    for (let i = 0; i < 24; i++) {
      const x = Math.random() * this.scale.width;
      const y = cy + 40 + Math.random() * (this.scale.height - cy - 80);
      this.add.image(x, y, 'wave-crest').setAlpha(0.6 + Math.random() * 0.3);
    }

    // Ellenfél hajó középen
    const tone: ShipTone = this.enemyKind === 'pirate' ? 'enemy' : this.enemyKind === 'navy' ? 'navy' : 'merchant';
    const enemy = new ShipGraphic(this, cx, cy + 30, { tone, silhouette: this.enemySilhouette, scale: 1.6 });
    enemy.setDepth(5);
    enemy.update(0, 0, 16);
    this.tweens.add({
      targets: enemy.container,
      y: cy + 38,
      yoyo: true, repeat: -1, duration: 1900, ease: 'Sine.inOut',
    });

    const kindLabel =
      this.enemyKind === 'pirate' ? 'BETYÁRHAJÓ' : this.enemyKind === 'navy' ? 'HADIHAJÓ' : 'KERESKEDŐ';
    const nationLabel = ({
      magyar: 'magyar',
      rac: 'rác',
      bunyevac: 'bunyevác',
      olah: 'oláh',
      tot: 'tót',
      oszman: 'oszmán',
      svab: 'sváb',
      crnagorac: 'crnagorac',
    } as const)[this.enemyNation];

    this.add.text(cx, 36, 'HAJÓ LÁTÓTÁVOLSÁGBAN', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#e0b24f',
      stroke: '#04141a', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(cx, 68, kindLabel, {
      fontFamily: '"Press Start 2P"', fontSize: '18px',
      color: this.enemyKind === 'pirate' ? '#ff6a3d' : this.enemyKind === 'navy' ? '#4f8bff' : '#bfe2e4',
      stroke: '#04141a', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(cx, 94, `(${nationLabel})`, {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fbf5e3',
    }).setOrigin(0.5);

    let tip = 'Vívd meg a csatát zsákmányért!';
    if (this.enemyKind === 'navy') tip = 'Hadihajó — veszélyes ellenfél!';
    if (this.enemyKind === 'merchant') tip = 'Védetlen cél — könnyű zsákmány.';
    this.add.text(cx, this.scale.height - 130, tip, {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#d9c99a',
    }).setOrigin(0.5);

    const btnY = this.scale.height - 70;
    this.makeButton(cx - 110, btnY, 180, 56, 0x7a2e0e, 'CSATA', () => this.engage());
    this.makeButton(cx + 110, btnY, 180, 56, 0x145f65, 'MENEKÜLÉS', () => this.flee());
  }

  private makeButton(x: number, y: number, w: number, h: number, color: number, text: string, onTap: () => void): void {
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
    this.cameras.main.fadeOut(280, 4, 20, 26);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Naval', { enemyKind: this.enemyKind, enemyNation: this.enemyNation, enemySilhouette: this.enemySilhouette });
    });
  }

  private flee(): void {
    const g = useGame.getState();
    if (this.enemyKind !== 'merchant') {
      g.damageShip(2, 4, 0);
      bus.emit('toast', { message: 'Megmenekültél — kisebb károkkal.', kind: 'info' });
    } else {
      bus.emit('toast', { message: 'Elhagytad a kereskedőt.', kind: 'info' });
    }
    this.cameras.main.fadeOut(220, 4, 20, 26);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('World'));
  }
}
