import Phaser from 'phaser';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { vibrate } from '@/utils/haptics';
import { Audio } from '@/audio/AudioManager';
import { Particles } from '@/game/systems/Particles';
import { checkQuestCompletion } from '@/game/systems/QuestSystem';

const MAX_DIGS = 10;

export class TreasureHuntScene extends Phaser.Scene {
  private target = new Phaser.Math.Vector2();
  private hintText!: Phaser.GameObjects.Text;
  private digsLabel!: Phaser.GameObjects.Text;
  private compassNeedle!: Phaser.GameObjects.Graphics;
  private digs = 0;
  private ended = false;
  private lastTapX = 0;
  private lastTapY = 0;

  constructor() {
    super('Treasure');
  }

  create(): void {
    bus.emit('scene:changed', { key: 'treasure' });
    this.input.removeAllListeners();
    this.cameras.main.fadeIn(380, 4, 20, 26);
    this.cameras.main.setBackgroundColor('#a87a3a');
    this.digs = 0;
    this.ended = false;
    this.drawIsland();
    this.target.set(
      Phaser.Math.Between(80, this.scale.width - 80),
      Phaser.Math.Between(140, this.scale.height - 160),
    );
    this.lastTapX = this.scale.width / 2;
    this.lastTapY = this.scale.height / 2;

    this.add
      .text(this.scale.width / 2, 18, 'KINCSKERESÉS', {
        fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#04141a',
        stroke: '#fbf5e3', strokeThickness: 3,
      })
      .setOrigin(0.5, 0).setDepth(20);
    this.hintText = this.add
      .text(this.scale.width / 2, 56, 'Érintsd a szigetet az ásáshoz', {
        fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#04141a',
        stroke: '#fbf5e3', strokeThickness: 2,
      })
      .setOrigin(0.5).setDepth(20);
    this.digsLabel = this.add
      .text(this.scale.width / 2, 78, '', {
        fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#04141a',
      })
      .setOrigin(0.5).setDepth(20);
    this.refreshDigs();

    // Iránytű alul-jobbra
    const cx = this.scale.width - 56;
    const cy = this.scale.height - 80;
    this.add.image(cx, cy, 'compass-rose').setDepth(20);
    this.compassNeedle = this.add.graphics().setDepth(21);
    this.compassNeedle.setPosition(cx, cy);

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.y < 100) return;
      this.dig(p.x, p.y);
    });
    this.updateCompass();
  }

  private drawIsland(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const g = this.add.graphics();
    // Tenger körben
    g.fillStyle(0x0e4044, 1);
    g.fillRect(0, 0, w, h);
    // Sziget pakli
    g.fillStyle(0xe8d28a, 1);
    g.fillEllipse(w / 2, h / 2, w * 0.85, h * 0.78);
    g.fillStyle(0x6b8f3d, 1);
    g.fillEllipse(w / 2, h / 2, w * 0.7, h * 0.65);
    g.fillStyle(0x3a6d3a, 1);
    g.fillEllipse(w / 2, h / 2, w * 0.55, h * 0.5);
    // Pálma-pontok
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const r = 0.55 + Math.random() * 0.2;
      const px = w / 2 + Math.cos(a) * w * 0.35 * r;
      const py = h / 2 + Math.sin(a) * h * 0.32 * r;
      this.add.image(px, py, Math.random() < 0.5 ? 'palm-large' : 'palm').setDepth(2);
    }
    // Hegy középre
    this.add.image(w / 2, h / 2 - 30, 'hill-1').setDepth(3).setScale(2);
  }

  private refreshDigs(): void {
    this.digsLabel.setText(`Ásatás: ${this.digs}/${MAX_DIGS}`);
  }

  private updateCompass(): void {
    this.compassNeedle.clear();
    // A szög nem pontos — a forrás a "tipp" távolságon múlik
    const dx = this.target.x - this.lastTapX;
    const dy = this.target.y - this.lastTapY;
    const angle = Math.atan2(dy, dx);
    // Bizonytalanság: minél messzebb a kincstől annál nagyobb hiba
    const dist = Math.hypot(dx, dy);
    const noise = Phaser.Math.Clamp(dist / 200, 0, 0.6) * (Math.random() - 0.5);
    const a = angle + noise;
    this.compassNeedle.lineStyle(3, 0xe0b24f, 1);
    this.compassNeedle.lineBetween(0, 0, Math.cos(a) * 22, Math.sin(a) * 22);
    this.compassNeedle.fillStyle(0xfbf5e3, 1);
    this.compassNeedle.fillCircle(0, 0, 2);
  }

  private dig(x: number, y: number): void {
    if (this.ended) return;
    this.digs++;
    this.lastTapX = x;
    this.lastTapY = y;
    const d = Phaser.Math.Distance.Between(x, y, this.target.x, this.target.y);
    const mark = this.add.image(x, y, 'shovel-mark').setDepth(4);
    this.tweens.add({ targets: mark, alpha: 0.4, duration: 1500 });
    Particles.smoke(this, x, y, { count: 4, scale: 0.6, rise: 8 });
    Audio.click();
    this.refreshDigs();
    if (d < 30) {
      this.finish(true);
    } else {
      const label = d < 70 ? 'FORRÓ!' : d < 140 ? 'Melegebb…' : d < 240 ? 'Hideg…' : 'Fagyos…';
      this.hintText.setText(label);
      vibrate(d < 70 ? 'success' : 'light');
      this.updateCompass();
      if (this.digs >= MAX_DIGS) this.finish(false);
    }
  }

  private finish(found: boolean): void {
    if (this.ended) return;
    this.ended = true;
    const g = useGame.getState();
    if (found) {
      const gold = 1500 + Math.floor(Math.random() * 3000);
      g.addGold(gold);
      g.clearTreasureFragments();
      g.unlockAchievement('treasure-hunter');
      g.recordTreasureFound();
      checkQuestCompletion(useGame.getState(), (_id, title, reward) =>
        bus.emit('toast', { message: `Cél teljesült: ${title} (+${reward}g)`, kind: 'good' }),
      );
      // Kincsláda animáció
      const chest = this.add.image(this.target.x, this.target.y, 'treasure-chest').setDepth(10).setScale(0);
      this.tweens.add({ targets: chest, scale: 1.4, duration: 400, ease: 'Back.out' });
      Particles.sparks(this, this.target.x, this.target.y, 14, 11);
      Audio.success();
      bus.emit('toast', { message: `Kincs! +${gold} arany`, kind: 'good' });
      bus.emit('treasure:end', { gold });
    } else {
      Audio.failure();
      bus.emit('toast', { message: 'A kincset másutt rejtették…', kind: 'bad' });
      bus.emit('treasure:end', { gold: 0 });
    }
    this.time.delayedCall(found ? 1500 : 600, () => this.scene.start('World'));
  }
}
