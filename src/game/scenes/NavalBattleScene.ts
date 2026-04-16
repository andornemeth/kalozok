import Phaser from 'phaser';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { SHIPS } from '@/game/data/ships';
import { vibrate } from '@/utils/haptics';

type Ammo = 'round' | 'chain' | 'grape';

interface CombatShip {
  sprite: Phaser.GameObjects.Image;
  heading: number;
  speed: number;
  hull: number;
  sail: number;
  crew: number;
  hullMax: number;
  sailMax: number;
  crewMax: number;
  cannons: number;
  reload: number;
}

type EnemyKind = 'pirate' | 'navy' | 'merchant';

export class NavalBattleScene extends Phaser.Scene {
  private player!: CombatShip;
  private enemy!: CombatShip;
  private ammo: Ammo = 'round';
  private windDir = Math.PI / 4;
  private windStrength = 0.6;
  private turnHint!: Phaser.GameObjects.Text;
  private fireButton!: Phaser.GameObjects.Container;
  private boardButton!: Phaser.GameObjects.Container;
  private ammoButtons: Phaser.GameObjects.Container[] = [];
  private enemyKind: EnemyKind = 'pirate';
  private ended = false;

  constructor() {
    super('Naval');
  }

  init(data: { enemyKind?: EnemyKind }): void {
    this.enemyKind = data.enemyKind ?? 'pirate';
    this.ended = false;
  }

  create(): void {
    bus.emit('scene:changed', { key: 'naval' });
    this.drawSea();
    this.createCombatants();
    this.createHudOverlay();
    this.createTouchControls();
    useGame.getState().setFlag('tutorialCombat', true);
  }

  private drawSea(): void {
    const g = this.add.graphics();
    g.fillStyle(0x0e4044, 1);
    g.fillRect(0, 0, 1600, 1200);
    g.lineStyle(1, 0x1a7f86, 0.3);
    for (let y = 0; y < 1200; y += 24) {
      for (let x = 0; x < 1600; x += 32) {
        g.lineBetween(x, y, x + 18, y);
      }
    }
    this.cameras.main.setBounds(0, 0, 1600, 1200);
    this.cameras.main.centerOn(800, 600);
  }

  private createCombatants(): void {
    const gameState = useGame.getState();
    const cls = gameState.ship.class;
    const stats = SHIPS[cls];
    this.player = this.makeShip('ship-player', 700, 650, 0, {
      hull: gameState.ship.hull,
      sail: gameState.ship.sail,
      crew: gameState.ship.crew,
      hullMax: stats.hullMax,
      sailMax: stats.sailMax,
      crewMax: stats.crewMax,
      cannons: stats.cannons,
    });
    const enemyStats = this.pickEnemyStats();
    this.enemy = this.makeShip(
      this.enemyKind === 'pirate' ? 'ship-enemy' : this.enemyKind === 'navy' ? 'ship-navy' : 'ship-merchant',
      900,
      550,
      Math.PI,
      enemyStats,
    );
  }

  private pickEnemyStats(): Omit<CombatShip, 'sprite' | 'heading' | 'speed' | 'reload'> {
    if (this.enemyKind === 'merchant') {
      const s = SHIPS.brig;
      return { hull: s.hullMax, sail: s.sailMax, crew: 25, hullMax: s.hullMax, sailMax: s.sailMax, crewMax: 40, cannons: 8 };
    }
    if (this.enemyKind === 'navy') {
      const s = SHIPS.frigate;
      return { hull: s.hullMax, sail: s.sailMax, crew: 80, hullMax: s.hullMax, sailMax: s.sailMax, crewMax: 100, cannons: s.cannons };
    }
    const s = SHIPS.brig;
    return { hull: s.hullMax, sail: s.sailMax, crew: 40, hullMax: s.hullMax, sailMax: s.sailMax, crewMax: 60, cannons: s.cannons };
  }

  private makeShip(
    tex: string,
    x: number,
    y: number,
    heading: number,
    stats: Omit<CombatShip, 'sprite' | 'heading' | 'speed' | 'reload'>,
  ): CombatShip {
    const sprite = this.add.image(x, y, tex).setScale(1.5).setDepth(5);
    sprite.setRotation(heading + Math.PI / 2);
    return { sprite, heading, speed: 0.04, reload: 0, ...stats };
  }

  private createHudOverlay(): void {
    this.turnHint = this.add
      .text(this.scale.width / 2, 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#fbf5e3',
        stroke: '#04141a',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(30);
  }

  private createTouchControls(): void {
    const btn = (label: string, x: number, y: number, color: number, handler: () => void) => {
      const c = this.add.container(x, y).setScrollFactor(0).setDepth(30);
      const bg = this.add.rectangle(0, 0, 88, 44, color, 0.92).setStrokeStyle(2, 0xfbf5e3);
      const txt = this.add
        .text(0, 0, label, { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fbf5e3' })
        .setOrigin(0.5);
      c.add([bg, txt]);
      c.setSize(88, 44);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', handler);
      c.on('pointerdown', () => bg.setFillStyle(color, 0.7));
      c.on('pointerout', () => bg.setFillStyle(color, 0.92));
      return c;
    };

    const yBottom = this.scale.height - 80;
    const ammos: Ammo[] = ['round', 'chain', 'grape'];
    this.ammoButtons = ammos.map((a, i) =>
      btn(a.toUpperCase(), 70 + i * 96, yBottom, 0x1a7f86, () => {
        this.ammo = a;
        this.refreshAmmoButtons();
        vibrate('light');
      }),
    );
    this.fireButton = btn('FIRE', this.scale.width - 80, yBottom - 56, 0x7a2e0e, () => this.playerFire());
    this.boardButton = btn('BOARD', this.scale.width - 80, yBottom, 0xb99137, () => this.attemptBoard());
    btn('FLEE', 70, yBottom - 56, 0x555555, () => this.flee());
    this.scale.on('resize', () => this.layoutButtons());
    this.layoutButtons();
    this.refreshAmmoButtons();
  }

  private refreshAmmoButtons(): void {
    this.ammoButtons.forEach((b, i) => {
      const bg = b.list[0] as Phaser.GameObjects.Rectangle;
      const selected = (['round', 'chain', 'grape'] as Ammo[])[i] === this.ammo;
      bg.setStrokeStyle(selected ? 4 : 2, selected ? 0xe0b24f : 0xfbf5e3);
    });
  }

  private layoutButtons(): void {
    const yBottom = this.scale.height - 80;
    this.ammoButtons.forEach((b, i) => b.setPosition(70 + i * 96, yBottom));
    this.fireButton.setPosition(this.scale.width - 80, yBottom - 56);
    this.boardButton.setPosition(this.scale.width - 80, yBottom);
    this.turnHint.setPosition(this.scale.width / 2, 20);
  }

  private playerFire(): void {
    if (this.ended) return;
    const broadsideAngle = this.relativeBroadside(this.player, this.enemy);
    if (broadsideAngle < 0.35) {
      this.showHint('Fordulj oldalra!');
      vibrate('warn');
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.enemy.sprite.x, this.enemy.sprite.y);
    if (dist > 240) {
      this.showHint('Túl messze!');
      return;
    }
    this.volley(this.player, this.enemy, this.ammo);
    vibrate('medium');
  }

  private relativeBroadside(ship: CombatShip, other: CombatShip): number {
    const angleTo = Math.atan2(other.sprite.y - ship.sprite.y, other.sprite.x - ship.sprite.x);
    const rel = Phaser.Math.Angle.Wrap(angleTo - ship.heading);
    return Math.abs(Math.sin(rel));
  }

  private volley(attacker: CombatShip, target: CombatShip, ammo: Ammo): void {
    const origin = new Phaser.Math.Vector2(attacker.sprite.x, attacker.sprite.y);
    const dst = new Phaser.Math.Vector2(target.sprite.x, target.sprite.y);
    const shots = Math.max(2, Math.floor(attacker.cannons / 3));
    const tex = ammo === 'round' ? 'cannonball-round' : ammo === 'chain' ? 'cannonball-chain' : 'cannonball-grape';
    for (let i = 0; i < shots; i++) {
      const spread = (i - (shots - 1) / 2) * 6;
      const ball = this.add.image(origin.x, origin.y, tex).setDepth(10);
      const end = new Phaser.Math.Vector2(dst.x + spread, dst.y + spread);
      this.tweens.add({
        targets: ball,
        x: end.x,
        y: end.y,
        duration: 380,
        ease: 'Quad.easeOut',
        onComplete: () => {
          ball.destroy();
          const hit = Math.random() < this.hitChance(attacker, target);
          if (hit) {
            this.applyHit(target, ammo);
            this.boom(end.x, end.y);
          } else {
            const splash = this.add.image(end.x + (Math.random() - 0.5) * 30, end.y + (Math.random() - 0.5) * 30, 'splash').setDepth(9);
            this.tweens.add({ targets: splash, alpha: 0, duration: 500, onComplete: () => splash.destroy() });
          }
        },
      });
    }
    this.time.delayedCall(900, () => this.checkEnd());
  }

  private hitChance(attacker: CombatShip, target: CombatShip): number {
    const dist = Phaser.Math.Distance.Between(attacker.sprite.x, attacker.sprite.y, target.sprite.x, target.sprite.y);
    const base = Phaser.Math.Clamp(1 - (dist - 80) / 180, 0.25, 0.95);
    const side = this.relativeBroadside(attacker, target);
    return Phaser.Math.Clamp(base * (0.4 + 0.6 * side), 0.1, 0.95);
  }

  private applyHit(target: CombatShip, ammo: Ammo): void {
    if (ammo === 'round') target.hull = Math.max(0, target.hull - Phaser.Math.Between(4, 10));
    else if (ammo === 'chain') target.sail = Math.max(0, target.sail - Phaser.Math.Between(4, 10));
    else target.crew = Math.max(0, target.crew - Phaser.Math.Between(2, 6));
    target.sprite.setTint(0xff8080);
    this.time.delayedCall(100, () => target.sprite.clearTint());
  }

  private boom(x: number, y: number): void {
    const b = this.add.image(x, y, 'explosion').setDepth(11).setScale(0.8);
    this.tweens.add({ targets: b, scale: 1.6, alpha: 0, duration: 400, onComplete: () => b.destroy() });
  }

  private attemptBoard(): void {
    if (this.ended) return;
    const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.enemy.sprite.x, this.enemy.sprite.y);
    if (dist > 60) {
      this.showHint('Közelebb!');
      return;
    }
    if (this.enemy.crew > this.player.crew * 1.4) {
      this.showHint('Túl sokan vannak, sanszos a párbaj!');
    }
    this.ended = true;
    this.scene.start('Duel', { enemyCrew: this.enemy.crew, enemyKind: this.enemyKind });
  }

  private flee(): void {
    if (this.ended) return;
    this.ended = true;
    useGame.getState().damageShip(4, 8, 1);
    bus.emit('naval:end', { outcome: 'fled' });
    this.scene.start('World');
  }

  private showHint(t: string): void {
    this.turnHint.setText(t);
    this.time.delayedCall(1200, () => this.turnHint.setText(''));
  }

  private checkEnd(): void {
    if (this.enemy.hull <= 0 || this.enemy.crew <= 2) {
      this.victory();
    } else if (this.player.hull <= 0 || this.player.crew <= 2) {
      this.defeat();
    }
  }

  private victory(): void {
    if (this.ended) return;
    this.ended = true;
    const g = useGame.getState();
    g.addGold(Math.floor(80 + Math.random() * 300));
    g.damageShip(g.ship.hull - this.player.hull, g.ship.sail - this.player.sail, g.ship.crew - this.player.crew);
    g.adjustMorale(+8);
    g.unlockAchievement('first-blood');
    bus.emit('naval:end', { outcome: 'victory' });
    this.scene.start('World');
  }

  private defeat(): void {
    if (this.ended) return;
    this.ended = true;
    const g = useGame.getState();
    g.damageShip(g.ship.hull, g.ship.sail, Math.max(0, g.ship.crew - 4));
    g.addGold(-Math.floor(g.career.gold * 0.4));
    g.adjustMorale(-15);
    bus.emit('naval:end', { outcome: 'defeat' });
    this.scene.start('World');
  }

  update(_t: number, deltaMs: number): void {
    this.advanceShip(this.player, deltaMs, this.playerHeadingInput());
    this.aiControl(this.enemy, deltaMs);
    this.turnHint.text && this.turnHint.text.length > 0 ? null : null;
    const pb = this.relativeBroadside(this.player, this.enemy);
    if (!this.ended) {
      const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.enemy.sprite.x, this.enemy.sprite.y);
      this.turnHint.setText(pb < 0.35 ? 'Fordulj oldalra!' : dist > 240 ? 'Közeledj…' : 'Broadside!');
    }
    this.checkEnd();
  }

  private playerHeadingInput(): number | null {
    const p = this.input.activePointer;
    if (!p.isDown) return null;
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    const topHudLimit = 80;
    const bottomLimit = this.scale.height - 130;
    if (p.y < topHudLimit || p.y > bottomLimit) return null;
    const dx = w.x - this.player.sprite.x;
    const dy = w.y - this.player.sprite.y;
    if (Math.hypot(dx, dy) < 30) return null;
    return Math.atan2(dy, dx);
  }

  private advanceShip(s: CombatShip, dt: number, target: number | null): void {
    if (target != null) {
      const diff = Phaser.Math.Angle.Wrap(target - s.heading);
      s.heading += Phaser.Math.Clamp(diff, -0.0018 * dt, 0.0018 * dt);
    }
    const windFactor = 0.5 + 0.5 * Math.cos(s.heading - this.windDir) * this.windStrength;
    const sailFactor = s.sail / s.sailMax;
    const speed = s.speed * (0.5 + 0.5 * windFactor) * (0.4 + 0.6 * sailFactor);
    s.sprite.x = Phaser.Math.Clamp(s.sprite.x + Math.cos(s.heading) * speed * dt, 40, 1560);
    s.sprite.y = Phaser.Math.Clamp(s.sprite.y + Math.sin(s.heading) * speed * dt, 40, 1160);
    s.sprite.setRotation(s.heading + Math.PI / 2);
  }

  private aiControl(s: CombatShip, dt: number): void {
    const target = Math.atan2(this.player.sprite.y - s.sprite.y, this.player.sprite.x - s.sprite.x) + Math.PI / 2;
    this.advanceShip(s, dt, target);
    s.reload -= dt;
    if (s.reload <= 0) {
      const broadside = this.relativeBroadside(s, this.player);
      const dist = Phaser.Math.Distance.Between(s.sprite.x, s.sprite.y, this.player.sprite.x, this.player.sprite.y);
      if (broadside > 0.4 && dist < 220) {
        this.volley(s, this.player, Math.random() < 0.5 ? 'round' : 'chain');
        s.reload = 1700 + Math.random() * 1200;
      }
    }
  }
}
