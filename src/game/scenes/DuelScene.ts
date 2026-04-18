import Phaser from 'phaser';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { vibrate } from '@/utils/haptics';
import { Audio } from '@/audio/AudioManager';
import { Particles } from '@/game/systems/Particles';

type Stance = 'high' | 'middle' | 'low';
type Move = 'slash' | 'thrust' | 'parry' | 'dodge';

interface Duelist {
  hp: number;
  hpMax: number;
  stance: Stance;
  facing: 1 | -1;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  baseX: number;
  baseY: number;
  hpBar: Phaser.GameObjects.Graphics;
  stanceLabel: Phaser.GameObjects.Text;
  intentLabel?: Phaser.GameObjects.Text;
  intent?: { stance: Stance; move: Move };
}

export class DuelScene extends Phaser.Scene {
  private player!: Duelist;
  private enemy!: Duelist;
  private turnLabel!: Phaser.GameObjects.Text;
  private busy = false;
  private ended = false;
  private stanceBtns: Phaser.GameObjects.Container[] = [];
  private moveBtns: Phaser.GameObjects.Container[] = [];
  private bgFar!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Duel');
  }

  create(): void {
    bus.emit('scene:changed', { key: 'duel' });
    this.input.removeAllListeners();
    this.cameras.main.fadeIn(380, 4, 20, 26);
    this.cameras.main.setBackgroundColor('#0e2630');
    this.busy = false;
    this.ended = false;

    this.drawBackground();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 + 40;
    this.player = this.makeDuelist(cx - 110, cy, 'duelist-player', 80, +1);
    this.enemy = this.makeDuelist(cx + 110, cy, 'duelist-enemy', 60 + Math.floor(Math.random() * 40), -1);

    this.add
      .text(cx, 18, 'PÁRBAJ', {
        fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#e0b24f',
        stroke: '#04141a', strokeThickness: 4,
      })
      .setOrigin(0.5, 0);
    this.turnLabel = this.add
      .text(cx, 50, 'A te köröd', {
        fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#fbf5e3',
        stroke: '#04141a', strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.createStanceButtons();
    this.createMoveButtons();
    this.scale.on('resize', () => this.layout());
    this.layout();
    this.refreshIntent();
    this.updateStanceHighlight();
  }

  private drawBackground(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.bgFar = this.add.graphics();
    // Égbolt
    this.bgFar.fillStyle(0x14213a, 1);
    this.bgFar.fillRect(0, 0, w, h);
    // Hajó-fedélzet háttér
    this.bgFar.fillStyle(0x6b3e1f, 1);
    this.bgFar.fillRect(0, h * 0.55, w, h * 0.45);
    this.bgFar.fillStyle(0x4a2e1a, 1);
    for (let x = 0; x < w; x += 18) {
      this.bgFar.fillRect(x, h * 0.55, 1, h * 0.45);
    }
    // Korlát
    this.bgFar.fillStyle(0x2a1a0a, 1);
    this.bgFar.fillRect(0, h * 0.55 - 8, w, 4);
    for (let x = 8; x < w; x += 22) {
      this.bgFar.fillRect(x, h * 0.55 - 22, 3, 18);
    }
    // Holdfény
    this.bgFar.fillStyle(0xfbf5e3, 0.18);
    this.bgFar.fillCircle(w * 0.78, h * 0.18, 26);
    // Felhők
    this.bgFar.fillStyle(0x4a4238, 0.5);
    this.bgFar.fillCircle(w * 0.2, h * 0.15, 28);
    this.bgFar.fillCircle(w * 0.28, h * 0.18, 22);
  }

  private makeDuelist(x: number, y: number, tex: string, hp: number, facing: 1 | -1): Duelist {
    const shadow = this.add.ellipse(x, y + 28, 50, 14, 0x04141a, 0.6).setDepth(2);
    const sprite = this.add.image(x, y, tex).setOrigin(0.5, 1).setScale(2).setDepth(5);
    if (facing === -1) sprite.setFlipX(true);
    const hpBar = this.add.graphics().setDepth(8);
    const stanceLabel = this.add
      .text(x, y - 130, 'KÖZÉP', {
        fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#fbf5e3',
        stroke: '#04141a', strokeThickness: 3,
      })
      .setOrigin(0.5).setDepth(8);
    const d: Duelist = {
      hp, hpMax: hp, stance: 'middle', facing, sprite, shadow,
      baseX: x, baseY: y, hpBar, stanceLabel,
    };
    this.drawHpBar(d);
    return d;
  }

  private drawHpBar(d: Duelist): void {
    d.hpBar.clear();
    const w = 90;
    const x = d.baseX - w / 2;
    const y = d.baseY - 138;
    d.hpBar.fillStyle(0x04141a, 0.85);
    d.hpBar.fillRoundedRect(x - 2, y - 2, w + 4, 8, 2);
    d.hpBar.fillStyle(d === this.player ? 0xe0b24f : 0xc0392b, 1);
    d.hpBar.fillRect(x, y, Math.max(0, (d.hp / d.hpMax) * w), 4);
  }

  private stanceLabelText(s: Stance): string {
    return s === 'high' ? 'MAGAS' : s === 'middle' ? 'KÖZÉP' : 'ALACS.';
  }

  private createStanceButtons(): void {
    const stances: Stance[] = ['high', 'middle', 'low'];
    this.stanceBtns = stances.map((s) =>
      this.button(0, 0, 80, 36, 0x145f65, this.stanceLabelText(s), () => {
        this.player.stance = s;
        this.player.stanceLabel.setText(this.stanceLabelText(s));
        this.updateStanceHighlight();
        Audio.click();
      }).setData('stance', s),
    );
  }

  private createMoveButtons(): void {
    const moves: { id: Move; label: string; color: number }[] = [
      { id: 'slash', label: 'VÁGÁS', color: 0x7a2e0e },
      { id: 'thrust', label: 'SZÚRÁS', color: 0xb99137 },
      { id: 'parry', label: 'HÁRÍTÁS', color: 0x145f65 },
      { id: 'dodge', label: 'KITÉR', color: 0x4a4238 },
    ];
    this.moveBtns = moves.map((m) =>
      this.button(0, 0, 88, 38, m.color, m.label, () => this.playerMove(m.id)).setData('move', m.id),
    );
  }

  private button(x: number, y: number, w: number, h: number, color: number, label: string, onTap: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(10);
    const bg = this.add.rectangle(0, 0, w, h, color, 0.95).setStrokeStyle(2, 0xfbf5e3);
    const txt = this.add.text(0, 0, label, { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fbf5e3' }).setOrigin(0.5);
    c.add([bg, txt]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerup', onTap);
    c.on('pointerdown', () => bg.setFillStyle(color, 0.7));
    c.on('pointerout', () => bg.setFillStyle(color, 0.95));
    return c;
  }

  private updateStanceHighlight(): void {
    for (const b of this.stanceBtns) {
      const bg = b.list[0] as Phaser.GameObjects.Rectangle;
      const s = b.getData('stance') as Stance;
      bg.setStrokeStyle(s === this.player.stance ? 4 : 2, s === this.player.stance ? 0xe0b24f : 0xfbf5e3);
    }
  }

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cy = h / 2 + 40;
    this.player.baseX = w / 2 - 110;
    this.player.baseY = cy;
    this.enemy.baseX = w / 2 + 110;
    this.enemy.baseY = cy;
    this.player.sprite.setPosition(this.player.baseX, this.player.baseY);
    this.enemy.sprite.setPosition(this.enemy.baseX, this.enemy.baseY);
    this.player.shadow.setPosition(this.player.baseX, this.player.baseY + 28);
    this.enemy.shadow.setPosition(this.enemy.baseX, this.enemy.baseY + 28);
    this.player.stanceLabel.setPosition(this.player.baseX, this.player.baseY - 130);
    this.enemy.stanceLabel.setPosition(this.enemy.baseX, this.enemy.baseY - 130);
    this.drawHpBar(this.player);
    this.drawHpBar(this.enemy);

    // Stance gombok bal alul
    this.stanceBtns.forEach((b, i) => b.setPosition(60, h - 160 + i * 44));
    // Move gombok jobb alul
    this.moveBtns.forEach((b, i) => b.setPosition(w - 60, h - 160 + i * 44));

    this.turnLabel.setPosition(w / 2, 50);
  }

  private playerMove(m: Move): void {
    if (this.busy || this.ended) return;
    this.busy = true;
    Audio.swordClang();
    // Ellenfél AI-ja kiválasztja a stance + move-ot
    const enemyMove = this.aiPickMove();
    this.enemy.stance = enemyMove.stance;
    this.enemy.stanceLabel.setText(this.stanceLabelText(this.enemy.stance));
    this.enemy.intent = enemyMove;
    this.refreshIntent();
    this.resolve(m, enemyMove.move);
  }

  private aiPickMove(): { stance: Stance; move: Move } {
    const stances: Stance[] = ['high', 'middle', 'low'];
    const moves: Move[] = ['slash', 'thrust', 'parry', 'dodge'];
    const advantage = this.enemy.hp / this.enemy.hpMax;
    let m: Move;
    if (advantage < 0.4 && Math.random() < 0.45) m = 'parry';
    else if (Math.random() < 0.35) m = 'thrust';
    else if (Math.random() < 0.3) m = 'dodge';
    else m = moves[Math.floor(Math.random() * moves.length)]!;
    const s = stances[Math.floor(Math.random() * stances.length)]!;
    return { stance: s, move: m };
  }

  private refreshIntent(): void {
    if (!this.enemy.intent) return;
    if (!this.enemy.intentLabel) {
      this.enemy.intentLabel = this.add.text(0, 0, '', {
        fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#ffd7c7',
        stroke: '#04141a', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(9);
    }
    const moveLabel: Record<Move, string> = { slash: 'vág', thrust: 'szúr', parry: 'hárít', dodge: 'kitér' };
    this.enemy.intentLabel.setText(`«${moveLabel[this.enemy.intent.move]}»`);
    this.enemy.intentLabel.setPosition(this.enemy.baseX, this.enemy.baseY - 118);
  }

  private resolve(pl: Move, en: Move): void {
    const playerLunges = pl === 'slash' || pl === 'thrust';
    const enemyLunges = en === 'slash' || en === 'thrust';
    // Animáció
    if (playerLunges) this.lungeAnim(this.player);
    if (enemyLunges) this.lungeAnim(this.enemy);

    const plDamage = this.computeDamage(pl, en, this.player.stance, this.enemy.stance);
    const enDamage = this.computeDamage(en, pl, this.enemy.stance, this.player.stance);
    this.time.delayedCall(220, () => {
      if (plDamage > 0) {
        this.enemy.hp = Math.max(0, this.enemy.hp - plDamage);
        this.flash(this.enemy.sprite, 0xff8080);
        Particles.sparks(this, this.enemy.baseX, this.enemy.baseY - 30, 8, 12);
        Audio.swordClang();
      }
      if (enDamage > 0) {
        this.player.hp = Math.max(0, this.player.hp - enDamage);
        this.flash(this.player.sprite, 0xff8080);
        Particles.sparks(this, this.player.baseX, this.player.baseY - 30, 8, 12);
        Audio.swordClang();
      }
      if (plDamage === 0 && enDamage === 0) {
        // Csak fémes csengés
        Particles.sparks(this, (this.player.baseX + this.enemy.baseX) / 2, (this.player.baseY + this.enemy.baseY) / 2 - 30, 5, 12);
      }
      this.drawHpBar(this.player);
      this.drawHpBar(this.enemy);
      vibrate(plDamage > enDamage ? 'medium' : enDamage > 0 ? 'warn' : 'light');
      this.time.delayedCall(550, () => {
        this.busy = false;
        if (this.enemy.hp <= 0) this.finish('victory');
        else if (this.player.hp <= 0) this.finish('defeat');
        else this.turnLabel.setText('A te köröd');
      });
    });
  }

  private computeDamage(attacker: Move, defender: Move, aStance: Stance, dStance: Stance): number {
    if (attacker === 'parry' || attacker === 'dodge') return 0;
    const stanceMatch = aStance === dStance;
    if (defender === 'parry') return stanceMatch ? 0 : 4;
    if (defender === 'dodge') return Math.random() < 0.4 ? 5 : 0;
    if (attacker === 'thrust' && defender === 'slash') return 16 + (stanceMatch ? 6 : 0);
    if (attacker === 'slash' && defender === 'thrust') return 8;
    // Mindkettő ugyanazt csinálja, vagy slash/slash, thrust/thrust → mindketten sebződnek
    const base = attacker === 'slash' ? 12 : 9;
    return base + (stanceMatch ? 4 : 0) + Math.floor(Math.random() * 3);
  }

  private lungeAnim(d: Duelist): void {
    const dx = d.facing * 32;
    this.tweens.add({
      targets: [d.sprite, d.shadow],
      x: { from: d.baseX, to: d.baseX + dx },
      duration: 160,
      yoyo: true,
      ease: 'Quad.inOut',
      onComplete: () => {
        d.sprite.setX(d.baseX);
        d.shadow.setX(d.baseX);
      },
    });
    // Sword swing flash
    const sw = this.add.image(d.baseX + dx + d.facing * 14, d.baseY - 30, 'sword-swing').setDepth(7);
    sw.setFlipX(d.facing === -1);
    this.tweens.add({ targets: sw, alpha: 0, duration: 320, onComplete: () => sw.destroy() });
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
      const loot = 250 + Math.floor(Math.random() * 450);
      g.addGold(loot);
      g.adjustMorale(+15);
      g.unlockAchievement('duel-victor');
      bus.emit('toast', { message: `Bordázás sikere! +${loot} arany`, kind: 'good' });
      Audio.success();
    } else {
      g.addGold(-Math.floor(g.career.gold * 0.25));
      g.damageShip(8, 8, 4);
      g.adjustMorale(-12);
      bus.emit('toast', { message: 'A bordázás kudarcot vallott!', kind: 'bad' });
      Audio.failure();
    }
    bus.emit('duel:end', { outcome });
    this.time.delayedCall(800, () => this.scene.start('World'));
  }

  update(): void {
    if (this.busy) {
      this.turnLabel.setText('Ellenfél válaszol…');
    }
  }
}
