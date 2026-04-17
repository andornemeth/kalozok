import Phaser from 'phaser';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { vibrate } from '@/utils/haptics';

type Stance = 'high' | 'middle' | 'low';
type Move = 'attack' | 'parry' | 'thrust';

interface Duelist {
  hp: number;
  hpMax: number;
  stance: Stance;
  name: string;
  bar: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  sprite: Phaser.GameObjects.Image;
}

export class DuelScene extends Phaser.Scene {
  private player!: Duelist;
  private enemy!: Duelist;
  private turnText!: Phaser.GameObjects.Text;
  private busy = false;
  private ended = false;

  constructor() {
    super('Duel');
  }

  create(): void {
    bus.emit('scene:changed', { key: 'duel' });
    this.cameras.main.fadeIn(350, 4, 20, 26);
    this.cameras.main.setBackgroundColor('#082427');
    const cx = this.scale.width / 2;
    this.add
      .text(cx, 20, 'PÁRBAJ', { fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#e0b24f' })
      .setOrigin(0.5, 0);

    this.player = this.createDuelist(120, 200, 'player', 'ship-player', 80);
    this.enemy = this.createDuelist(this.scale.width - 120, 200, 'captain', 'ship-enemy', 60 + Math.floor(Math.random() * 40));

    this.turnText = this.add
      .text(cx, 120, 'A te köröd', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#fbf5e3',
      })
      .setOrigin(0.5);

    this.createStanceButtons();
    this.createMoveButtons();

    this.scale.on('resize', () => this.layout());
    this.layout();
  }

  private createDuelist(x: number, y: number, name: string, tex: string, hp: number): Duelist {
    const sprite = this.add.image(x, y, tex).setScale(2);
    const label = this.add
      .text(x, y - 60, name.toUpperCase(), { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fbf5e3' })
      .setOrigin(0.5);
    const bar = this.add.graphics();
    const d: Duelist = { hp, hpMax: hp, stance: 'middle', name, bar, label, sprite };
    this.drawBar(d);
    return d;
  }

  private drawBar(d: Duelist): void {
    d.bar.clear();
    const w = 100;
    const x = d.sprite.x - w / 2;
    const y = d.sprite.y + 40;
    d.bar.fillStyle(0x333333, 0.8);
    d.bar.fillRect(x, y, w, 6);
    d.bar.fillStyle(d === this.player ? 0xe0b24f : 0xb94a3b, 1);
    d.bar.fillRect(x, y, Math.max(0, (d.hp / d.hpMax) * w), 6);
  }

  private createStanceButtons(): void {
    const stances: Stance[] = ['high', 'middle', 'low'];
    stances.forEach((s, i) => {
      const y = 160 + i * 48;
      const bg = this.add.rectangle(60, y, 80, 36, 0x1a7f86, 0.9).setStrokeStyle(2, 0xfbf5e3);
      const txt = this.add
        .text(60, y, s.toUpperCase(), { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fbf5e3' })
        .setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerup', () => {
        this.player.stance = s;
        this.updateStanceHighlight();
      });
      bg.setData('stance', s);
      bg.setData('txt', txt);
    });
    this.updateStanceHighlight();
  }

  private updateStanceHighlight(): void {
    this.children.list.forEach((obj) => {
      if (obj instanceof Phaser.GameObjects.Rectangle && obj.getData('stance')) {
        const s = obj.getData('stance') as Stance;
        obj.setStrokeStyle(s === this.player.stance ? 4 : 2, s === this.player.stance ? 0xe0b24f : 0xfbf5e3);
      }
    });
  }

  private createMoveButtons(): void {
    const moves: { id: Move; label: string; color: number }[] = [
      { id: 'attack', label: 'VÁGÁS', color: 0x7a2e0e },
      { id: 'parry', label: 'HÁRÍTÁS', color: 0x145f65 },
      { id: 'thrust', label: 'SZÚRÁS', color: 0xb99137 },
    ];
    moves.forEach((m, i) => {
      const x = this.scale.width - 80;
      const y = 160 + i * 48;
      const bg = this.add.rectangle(x, y, 100, 36, m.color, 0.95).setStrokeStyle(2, 0xfbf5e3);
      this.add
        .text(x, y, m.label, { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fbf5e3' })
        .setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerup', () => this.playerMove(m.id));
      bg.setData('move', m.id);
    });
  }

  private layout(): void {
    const cx = this.scale.width / 2;
    this.player.sprite.setPosition(120, 220);
    this.player.label.setPosition(120, 160);
    this.enemy.sprite.setPosition(this.scale.width - 120, 220);
    this.enemy.label.setPosition(this.scale.width - 120, 160);
    this.drawBar(this.player);
    this.drawBar(this.enemy);
    this.turnText.setPosition(cx, 110);
  }

  private playerMove(m: Move): void {
    if (this.busy || this.ended) return;
    this.busy = true;
    const enemyChoice: Move = (['attack', 'parry', 'thrust'] as Move[])[Math.floor(Math.random() * 3)]!;
    this.enemy.stance = (['high', 'middle', 'low'] as Stance[])[Math.floor(Math.random() * 3)]!;
    this.resolve(m, enemyChoice);
  }

  private resolve(pl: Move, en: Move): void {
    const plDamage = this.damage(pl, en, this.player.stance, this.enemy.stance);
    const enDamage = this.damage(en, pl, this.enemy.stance, this.player.stance);
    this.enemy.hp = Math.max(0, this.enemy.hp - plDamage);
    this.player.hp = Math.max(0, this.player.hp - enDamage);
    if (plDamage > 0) this.flash(this.enemy.sprite, 0xff8080);
    if (enDamage > 0) this.flash(this.player.sprite, 0xff8080);
    this.drawBar(this.player);
    this.drawBar(this.enemy);
    vibrate(plDamage > enDamage ? 'medium' : enDamage > 0 ? 'warn' : 'light');
    this.time.delayedCall(500, () => {
      this.busy = false;
      if (this.enemy.hp <= 0) this.finish('victory');
      else if (this.player.hp <= 0) this.finish('defeat');
    });
  }

  private damage(attacker: Move, defender: Move, aStance: Stance, dStance: Stance): number {
    if (attacker === 'parry') return 0;
    const stanceMatch = aStance === dStance;
    const base = attacker === 'attack' ? 14 : 11;
    if (defender === 'parry') return stanceMatch ? 0 : 4;
    if (attacker === 'thrust' && defender === 'attack') return base + 4;
    if (attacker === 'attack' && defender === 'thrust') return Math.max(2, base - 6);
    return base + (stanceMatch ? 4 : 0) + Math.floor(Math.random() * 4);
  }

  private flash(s: Phaser.GameObjects.Image, tint: number): void {
    s.setTint(tint);
    this.time.delayedCall(120, () => s.clearTint());
  }

  private finish(outcome: 'victory' | 'defeat'): void {
    if (this.ended) return;
    this.ended = true;
    const g = useGame.getState();
    if (outcome === 'victory') {
      g.addGold(200 + Math.floor(Math.random() * 400));
      g.adjustMorale(+15);
      g.unlockAchievement('duel-victor');
    } else {
      g.addGold(-Math.floor(g.career.gold * 0.25));
      g.damageShip(10, 10, 4);
      g.adjustMorale(-10);
    }
    bus.emit('duel:end', { outcome });
    this.scene.start('World');
  }

  update(): void {
    this.turnText.setText(this.busy ? 'Ellenfél válaszol…' : 'A te köröd — válassz állást és csapást');
  }
}
