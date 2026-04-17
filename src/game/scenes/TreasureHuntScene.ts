import Phaser from 'phaser';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { vibrate } from '@/utils/haptics';
import { checkQuestCompletion } from '@/game/systems/QuestSystem';

export class TreasureHuntScene extends Phaser.Scene {
  private target = new Phaser.Math.Vector2();
  private hintText!: Phaser.GameObjects.Text;
  private digs = 0;
  private ended = false;

  constructor() {
    super('Treasure');
  }

  create(): void {
    bus.emit('scene:changed', { key: 'treasure' });
    this.cameras.main.fadeIn(350, 4, 20, 26);
    this.cameras.main.setBackgroundColor('#b99137');
    this.target.set(Phaser.Math.Between(60, this.scale.width - 60), Phaser.Math.Between(100, this.scale.height - 120));
    this.add
      .text(this.scale.width / 2, 20, 'KINCSKERESÉS', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        color: '#04141a',
      })
      .setOrigin(0.5, 0);
    this.hintText = this.add
      .text(this.scale.width / 2, 60, 'Érintsd a szigetet az ásáshoz', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#04141a',
      })
      .setOrigin(0.5);

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.dig(p.x, p.y));
  }

  private dig(x: number, y: number): void {
    if (this.ended) return;
    this.digs++;
    const d = Phaser.Math.Distance.Between(x, y, this.target.x, this.target.y);
    const x2 = this.add.image(x, y, 'treasure-x');
    this.tweens.add({ targets: x2, alpha: 0, duration: 1500, onComplete: () => x2.destroy() });
    if (d < 28) {
      this.finish(true);
    } else {
      this.hintText.setText(d < 80 ? 'FORRÓ!' : d < 160 ? 'Melegebb…' : d < 280 ? 'Hideg…' : 'Fagyos…');
      vibrate(d < 80 ? 'success' : 'light');
      if (this.digs >= 8) this.finish(false);
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
      bus.emit('toast', { message: `Kincs! +${gold} arany`, kind: 'good' });
      bus.emit('treasure:end', { gold });
    } else {
      bus.emit('toast', { message: 'A kincset másutt rejtették…', kind: 'bad' });
      bus.emit('treasure:end', { gold: 0 });
    }
    this.time.delayedCall(400, () => this.scene.start('World'));
  }
}
