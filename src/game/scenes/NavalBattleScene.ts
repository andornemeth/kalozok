import Phaser from 'phaser';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { SHIPS, type ShipSilhouette } from '@/game/data/ships';
import { vibrate } from '@/utils/haptics';
import { ShipGraphic, type ShipTone } from '@/game/entities/ShipGraphic';
import { Audio } from '@/audio/AudioManager';
import { Particles } from '@/game/systems/Particles';
import { WindSystem } from '@/game/systems/WindSystem';
import { checkQuestCompletion } from '@/game/systems/QuestSystem';
import type { NationId } from '@/game/data/ports';
import i18n from '@/i18n';

type Ammo = 'round' | 'chain' | 'grape';
type EnemyKind = 'pirate' | 'navy' | 'merchant';

const ARENA_W = 1800;
const ARENA_H = 1200;

interface CombatShip {
  ship: ShipGraphic;
  tone: ShipTone;
  silhouette: ShipSilhouette;
  heading: number;
  baseSpeed: number;
  hull: number;
  sail: number;
  crew: number;
  hullMax: number;
  sailMax: number;
  crewMax: number;
  cannons: number;
  reload: number;
  desiredHeading: number;
  fireT: number; // last fire ms
}

export class NavalBattleScene extends Phaser.Scene {
  private player!: CombatShip;
  private enemy!: CombatShip;
  private ammo: Ammo = 'round';
  private wind = new WindSystem();
  private enemyKind: EnemyKind = 'pirate';
  private enemyNation: NationId = 'pirate';
  private ended = false;
  private elapsed = 0;
  private hintLabel!: Phaser.GameObjects.Text;
  private fireBtn!: Phaser.GameObjects.Container;
  private boardBtn!: Phaser.GameObjects.Container;
  private fleeBtn!: Phaser.GameObjects.Container;
  private ammoBtns: Phaser.GameObjects.Container[] = [];
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private enemyHpBar!: Phaser.GameObjects.Graphics;
  private compassG!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Naval');
  }

  init(data: { enemyKind?: EnemyKind; enemyNation?: NationId; enemySilhouette?: ShipSilhouette }): void {
    this.enemyKind = data.enemyKind ?? 'pirate';
    this.enemyNation = data.enemyNation ?? 'pirate';
    this.ended = false;
    this.elapsed = 0;
  }

  create(): void {
    bus.emit('scene:changed', { key: 'naval' });
    this.input.removeAllListeners();
    this.cameras.main.fadeIn(380, 4, 20, 26);
    this.drawSea();
    this.spawnShips();
    this.setupCamera();
    this.createHud();
    this.createControls();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onWorldTap(p));
    useGame.getState().setFlag('tutorialCombat', true);
    this.scale.on('resize', () => this.layoutHud());
    this.layoutHud();
    Audio.wave();
    this.time.delayedCall(500, () => this.battleCry('naval.cryRally'));
  }

  // --- World setup ---

  private drawSea(): void {
    for (let y = 0; y < ARENA_H; y += 64) {
      for (let x = 0; x < ARENA_W; x += 64) {
        this.add.image(x, y, 'wave-tile').setOrigin(0, 0).setDepth(0);
      }
    }
    // Néhány hullámcsúcs
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * ARENA_W;
      const y = Math.random() * ARENA_H;
      const c = this.add.image(x, y, 'wave-crest').setDepth(1).setAlpha(0.6);
      this.tweens.add({
        targets: c, alpha: { from: 0, to: 0.7 },
        yoyo: true, repeat: -1, duration: 1100 + Math.random() * 700,
      });
    }
    // Vintage szegély
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(4, 0x04141a, 0.6);
    g.strokeRect(0, 0, ARENA_W, ARENA_H);
  }

  private spawnShips(): void {
    const gameState = useGame.getState();
    const cls = gameState.ship.class;
    const stats = SHIPS[cls];
    this.player = this.makeShip('player', stats.silhouette, ARENA_W / 2 - 220, ARENA_H / 2 + 80, 0, {
      hull: gameState.ship.hull,
      sail: gameState.ship.sail,
      crew: gameState.ship.crew,
      hullMax: stats.hullMax,
      sailMax: stats.sailMax,
      crewMax: stats.crewMax,
      cannons: stats.cannons,
    }, 0.06 * stats.speed);

    const eStats = this.pickEnemyStats();
    const tone: ShipTone = this.enemyKind === 'pirate' ? 'enemy' : this.enemyKind === 'navy' ? 'navy' : 'merchant';
    this.enemy = this.makeShip(tone, eStats.silhouette, ARENA_W / 2 + 220, ARENA_H / 2 - 80, Math.PI, eStats, 0.05);
  }

  private pickEnemyStats(): Omit<CombatShip, 'ship' | 'heading' | 'baseSpeed' | 'reload' | 'desiredHeading' | 'fireT' | 'tone'> & { silhouette: ShipSilhouette } {
    if (this.enemyKind === 'merchant') {
      const s = SHIPS.brig;
      return { silhouette: 'medium', hull: s.hullMax, sail: s.sailMax, crew: 22, hullMax: s.hullMax, sailMax: s.sailMax, crewMax: 40, cannons: 8 };
    }
    if (this.enemyKind === 'navy') {
      const s = SHIPS.frigate;
      return { silhouette: 'medium', hull: s.hullMax, sail: s.sailMax, crew: 70, hullMax: s.hullMax, sailMax: s.sailMax, crewMax: 100, cannons: s.cannons };
    }
    const s = SHIPS.brig;
    return { silhouette: 'medium', hull: s.hullMax, sail: s.sailMax, crew: 35, hullMax: s.hullMax, sailMax: s.sailMax, crewMax: 60, cannons: s.cannons };
  }

  private makeShip(
    tone: ShipTone,
    silhouette: ShipSilhouette,
    x: number, y: number, heading: number,
    stats: Omit<CombatShip, 'ship' | 'heading' | 'baseSpeed' | 'reload' | 'desiredHeading' | 'fireT' | 'tone' | 'silhouette'>,
    baseSpeed: number,
  ): CombatShip {
    const ship = new ShipGraphic(this, x, y, { tone, silhouette, scale: 0.95 });
    ship.setDepth(5);
    ship.update(heading, this.wind.state.dir);
    return {
      ship, tone, silhouette, heading, baseSpeed, reload: 1500, desiredHeading: heading, fireT: 0,
      ...stats,
    };
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, ARENA_W, ARENA_H);
    this.cameras.main.startFollow(this.player.ship.container, true, 0.06, 0.06);
    this.cameras.main.setZoom(this.computeZoom());
    this.scale.on('resize', () => this.cameras.main.setZoom(this.computeZoom()));
  }

  private computeZoom(): number {
    const small = Math.min(this.scale.width, this.scale.height);
    return Math.min(1.6, Math.max(0.6, small / 580));
  }

  // --- HUD ---

  private createHud(): void {
    this.hintLabel = this.add
      .text(this.scale.width / 2, 18, '', {
        fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#fbf5e3',
        stroke: '#04141a', strokeThickness: 4,
      })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(30);
    this.playerHpBar = this.add.graphics().setScrollFactor(0).setDepth(30);
    this.enemyHpBar = this.add.graphics().setScrollFactor(0).setDepth(30);
    this.compassG = this.add.graphics().setScrollFactor(0).setDepth(30);
    this.add.image(54, 84, 'compass-rose').setScrollFactor(0).setDepth(29);
  }

  private drawBars(): void {
    const drawBar = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, ship: CombatShip, label: string, color: number) => {
      g.clear();
      g.fillStyle(0x04141a, 0.85);
      g.fillRoundedRect(x - 4, y - 4, w + 8, 28, 4);
      g.fillStyle(0x202b30, 1);
      g.fillRect(x, y, w, 6);
      g.fillStyle(color, 1);
      g.fillRect(x, y, (ship.hull / ship.hullMax) * w, 6);
      g.fillStyle(0x202b30, 1);
      g.fillRect(x, y + 8, w, 4);
      g.fillStyle(0xfbf5e3, 1);
      g.fillRect(x, y + 8, (ship.sail / ship.sailMax) * w, 4);
      g.fillStyle(0x202b30, 1);
      g.fillRect(x, y + 14, w, 4);
      g.fillStyle(0x88e07b, 1);
      g.fillRect(x, y + 14, (ship.crew / ship.crewMax) * w, 4);
      void label;
    };
    drawBar(this.playerHpBar, 12, 16, 120, this.player, 'TE', 0xe0b24f);
    drawBar(this.enemyHpBar, this.scale.width - 132, 16, 120, this.enemy, 'ELL', 0xc0392b);
    // Kompasz nyilak
    const cg = this.compassG;
    cg.clear();
    const cx = 54;
    const cy = 84;
    const blowTo = this.wind.state.dir + Math.PI;
    cg.lineStyle(3, 0x4f8bff, 1);
    cg.lineBetween(cx, cy, cx + Math.cos(blowTo) * 22, cy + Math.sin(blowTo) * 22);
    cg.lineStyle(2, 0x88e07b, 1);
    cg.lineBetween(cx, cy, cx + Math.cos(this.player.heading) * 18, cy + Math.sin(this.player.heading) * 18);
  }

  private createControls(): void {
    const btn = (label: string, color: number, handler: () => void) => {
      const c = this.add.container(0, 0).setScrollFactor(0).setDepth(30);
      const bg = this.add.rectangle(0, 0, 92, 44, color, 0.92).setStrokeStyle(2, 0xfbf5e3);
      const txt = this.add
        .text(0, 0, label, { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fbf5e3' })
        .setOrigin(0.5);
      c.add([bg, txt]);
      c.setSize(92, 44);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', handler);
      c.on('pointerdown', () => bg.setFillStyle(color, 0.7));
      c.on('pointerout', () => bg.setFillStyle(color, 0.92));
      return c;
    };
    const ammos: Ammo[] = ['round', 'chain', 'grape'];
    const labels: Record<Ammo, string> = { round: 'GOLYÓ', chain: 'LÁNC', grape: 'KARTÁCS' };
    this.ammoBtns = ammos.map((a) => {
      const c = btn(labels[a], 0x1a7f86, () => {
        this.ammo = a;
        this.refreshAmmoBtns();
        vibrate('light');
      });
      c.setData('ammo', a);
      return c;
    });
    this.fireBtn = btn('TŰZ', 0x7a2e0e, () => this.playerFire());
    this.boardBtn = btn('BORDA', 0xb99137, () => this.attemptBoard());
    this.fleeBtn = btn('MENEKÜL', 0x4a4238, () => this.flee());
    this.refreshAmmoBtns();
    this.layoutHud();
  }

  private refreshAmmoBtns(): void {
    for (const b of this.ammoBtns) {
      const bg = b.list[0] as Phaser.GameObjects.Rectangle;
      const a = b.getData('ammo') as Ammo;
      bg.setStrokeStyle(a === this.ammo ? 4 : 2, a === this.ammo ? 0xe0b24f : 0xfbf5e3);
    }
  }

  private layoutHud(): void {
    const yBottom = this.scale.height - 36;
    this.ammoBtns.forEach((b, i) => b.setPosition(60 + i * 100, yBottom));
    this.fireBtn?.setPosition(this.scale.width - 60, yBottom);
    this.boardBtn?.setPosition(this.scale.width - 160, yBottom);
    this.fleeBtn?.setPosition(this.scale.width - 60, yBottom - 56);
    this.hintLabel?.setPosition(this.scale.width / 2, 18);
  }

  private onWorldTap(p: Phaser.Input.Pointer): void {
    if (p.y < 60 || p.y > this.scale.height - 70) return;
    if (p.x > this.scale.width - 220 || p.x < 220) return;
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    const dx = w.x - this.player.ship.x;
    const dy = w.y - this.player.ship.y;
    if (Math.hypot(dx, dy) < 40) return;
    this.player.desiredHeading = Math.atan2(dy, dx);
    Particles.splash(this, w.x, w.y, 4);
  }

  // --- Tüzelés ---

  private playerFire(): void {
    if (this.ended) return;
    if (this.elapsed - this.player.fireT < 1400) return;
    const broadside = this.relativeBroadside(this.player, this.enemy);
    if (broadside < 0.4) {
      this.flashHint('Fordulj OLDALRA — broadside!');
      vibrate('warn');
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.player.ship.x, this.player.ship.y, this.enemy.ship.x, this.enemy.ship.y);
    if (dist > 360) {
      this.flashHint('Túl messze!');
      return;
    }
    this.volley(this.player, this.enemy, this.ammo);
    this.player.fireT = this.elapsed;
    if (Math.random() < 0.35) this.battleCry('naval.cryFire');
    vibrate('medium');
  }

  private relativeBroadside(ship: CombatShip, other: CombatShip): number {
    const angleTo = Math.atan2(other.ship.y - ship.ship.y, other.ship.x - ship.ship.x);
    const rel = Phaser.Math.Angle.Wrap(angleTo - ship.heading);
    return Math.abs(Math.sin(rel));
  }

  private volley(attacker: CombatShip, target: CombatShip, ammo: Ammo): void {
    Audio.cannon();
    const angleTo = Math.atan2(target.ship.y - attacker.ship.y, target.ship.x - attacker.ship.x);
    const portSide = Math.sin(angleTo - attacker.heading) > 0;
    const sideAngle = attacker.heading + (portSide ? Math.PI / 2 : -Math.PI / 2);
    const shots = Math.max(2, Math.floor(attacker.cannons / 3));
    const tex = ammo === 'round' ? 'cannonball-round' : ammo === 'chain' ? 'cannonball-chain' : 'cannonball-grape';
    const ox = Math.cos(sideAngle);
    const oy = Math.sin(sideAngle);
    for (let i = 0; i < shots; i++) {
      const offset = (i - (shots - 1) / 2) * 12;
      const px = attacker.ship.x + Math.cos(attacker.heading) * offset + ox * 20;
      const py = attacker.ship.y + Math.sin(attacker.heading) * offset + oy * 20;
      Particles.flash(this, px, py);
      Particles.smoke(this, px, py, { count: 4, depth: 12, scale: 0.9 });
      const ball = this.add.image(px, py, tex).setDepth(11);
      const spread = (Math.random() - 0.5) * 14;
      const tx = target.ship.x + Math.cos(sideAngle) * spread;
      const ty = target.ship.y + Math.sin(sideAngle) * spread;
      this.tweens.add({
        targets: ball,
        x: tx, y: ty,
        duration: 380 + Math.random() * 140,
        ease: 'Quad.easeOut',
        onComplete: () => {
          ball.destroy();
          const hit = Math.random() < this.hitChance(attacker, target);
          if (hit) {
            this.applyHit(target, ammo);
            Particles.explosion(this, tx, ty, 13);
            Audio.cannonHit();
          } else {
            Particles.splash(this, tx, ty);
            Audio.splash();
          }
        },
      });
    }
    this.time.delayedCall(900, () => this.checkEnd());
  }

  private hitChance(attacker: CombatShip, target: CombatShip): number {
    const dist = Phaser.Math.Distance.Between(attacker.ship.x, attacker.ship.y, target.ship.x, target.ship.y);
    const base = Phaser.Math.Clamp(1 - (dist - 100) / 260, 0.25, 0.95);
    const side = this.relativeBroadside(attacker, target);
    return Phaser.Math.Clamp(base * (0.45 + 0.55 * side), 0.1, 0.95);
  }

  private applyHit(target: CombatShip, ammo: Ammo): void {
    let dmg = 0;
    let tone = 0xff8080;
    if (ammo === 'round') {
      dmg = Phaser.Math.Between(5, 11);
      target.hull = Math.max(0, target.hull - dmg);
    } else if (ammo === 'chain') {
      dmg = Phaser.Math.Between(5, 11);
      target.sail = Math.max(0, target.sail - dmg);
      tone = 0xa0c8ff;
    } else {
      dmg = Phaser.Math.Between(2, 7);
      target.crew = Math.max(0, target.crew - dmg);
      tone = 0xffc070;
    }
    target.ship.setTint(tone);
    this.time.delayedCall(110, () => target.ship.clearTint());
    this.floatDamage(target.ship.x, target.ship.y - 40, dmg, ammo);
    if (target === this.enemy && Math.random() < 0.2) {
      this.battleCry('naval.cryHit');
    }
  }

  private floatDamage(x: number, y: number, dmg: number, ammo: Ammo): void {
    const color = ammo === 'round' ? '#ffb37a' : ammo === 'chain' ? '#a0c8ff' : '#ffd86a';
    const txt = this.add
      .text(x, y, `-${dmg}`, {
        fontFamily: '"Press Start 2P"', fontSize: '12px', color,
        stroke: '#04141a', strokeThickness: 3,
      })
      .setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  private lastCry = 0;
  private battleCry(key: string): void {
    if (this.elapsed - this.lastCry < 2200) return;
    this.lastCry = this.elapsed;
    const msg = i18n.t(key);
    const txt = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 80, msg, {
        fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#fbf5e3',
        stroke: '#c0392b', strokeThickness: 4,
        align: 'center', wordWrap: { width: this.scale.width - 60 },
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(40).setAlpha(0);
    this.tweens.add({
      targets: txt,
      alpha: { from: 0, to: 1 },
      y: '-=10',
      duration: 180,
      yoyo: true,
      hold: 900,
      onComplete: () => txt.destroy(),
    });
  }

  // --- Aktiók ---

  private attemptBoard(): void {
    if (this.ended) return;
    const dist = Phaser.Math.Distance.Between(this.player.ship.x, this.player.ship.y, this.enemy.ship.x, this.enemy.ship.y);
    if (dist > 90) {
      this.flashHint('Közelebb a bordázásra!');
      return;
    }
    if (this.enemy.crew > 6 && this.enemy.hull > this.enemy.hullMax * 0.4) {
      this.flashHint('Lágyítsd meg előbb!');
      return;
    }
    this.battleCry('naval.cryBoard');
    this.ended = true;
    this.time.delayedCall(600, () => this.scene.start('Duel', { enemyCrew: this.enemy.crew, enemyKind: this.enemyKind }));
  }

  private flee(): void {
    if (this.ended) return;
    const stern = this.relativeBroadside(this.enemy, this.player);
    if (stern > 0.6) {
      // Az ellenfél közben oldalágyúz — büntetés
      useGame.getState().damageShip(6, 12, 1);
    } else {
      useGame.getState().damageShip(2, 4, 0);
    }
    this.ended = true;
    bus.emit('toast', { message: 'Megmenekültél a csatából.', kind: 'info' });
    bus.emit('naval:end', { outcome: 'fled' });
    this.scene.start('World');
  }

  private flashHint(t: string): void {
    this.hintLabel.setText(t);
    this.tweens.killTweensOf(this.hintLabel);
    this.hintLabel.setAlpha(1);
    this.tweens.add({ targets: this.hintLabel, alpha: 0, duration: 1500, delay: 500 });
  }

  private checkEnd(): void {
    if (this.enemy.hull <= 0 || this.enemy.crew <= 1) this.victory();
    else if (this.player.hull <= 0 || this.player.crew <= 1) this.defeat();
  }

  private victory(): void {
    if (this.ended) return;
    this.ended = true;
    const g = useGame.getState();
    const lootBase = this.enemyKind === 'merchant' ? 280 : this.enemyKind === 'navy' ? 520 : 220;
    const loot = Math.floor(lootBase + Math.random() * 360);
    g.addGold(loot);
    g.damageShip(g.ship.hull - this.player.hull, g.ship.sail - this.player.sail, g.ship.crew - this.player.crew);
    g.adjustMorale(+8);
    g.unlockAchievement('first-blood');
    g.recordShipDefeated();
    if (this.enemyNation !== 'pirate') g.changeReputation(this.enemyNation, -8);
    checkQuestCompletion(useGame.getState(), (_id, title, reward) =>
      bus.emit('toast', { message: `Cél teljesült: ${title} (+${reward}g)`, kind: 'good' }),
    );
    bus.emit('toast', { message: `${i18n.t('naval.cryVictory')} +${loot} arany`, kind: 'good' });
    Audio.success();
    bus.emit('naval:end', { outcome: 'victory' });
    this.scene.start('World');
  }

  private defeat(): void {
    if (this.ended) return;
    this.ended = true;
    const g = useGame.getState();
    const penalty = Math.floor(g.career.gold * 0.4);
    g.damageShip(g.ship.hull, g.ship.sail, Math.max(0, g.ship.crew - 3));
    g.addGold(-penalty);
    g.adjustMorale(-15);
    bus.emit('toast', { message: `${i18n.t('naval.cryDefeat')} −${penalty} arany`, kind: 'bad' });
    Audio.failure();
    bus.emit('naval:end', { outcome: 'defeat' });
    this.scene.start('World');
  }

  // --- Frame update ---

  update(_t: number, deltaMs: number): void {
    this.elapsed += deltaMs;
    this.wind.update(deltaMs);
    this.advanceShip(this.player, deltaMs);
    this.aiUpdate(this.enemy, deltaMs);
    this.updateDamageEffects();
    if (!this.ended) {
      const pb = this.relativeBroadside(this.player, this.enemy);
      const dist = Phaser.Math.Distance.Between(this.player.ship.x, this.player.ship.y, this.enemy.ship.x, this.enemy.ship.y);
      if (this.elapsed % 250 < 16) {
        this.hintLabel.setAlpha(1);
        this.hintLabel.setText(pb < 0.4 ? 'Fordulj oldalra!' : dist > 360 ? 'Közeledj…' : dist < 90 ? 'Bordázható!' : 'Tüzelhetsz oldalágyúval');
      }
    }
    this.drawBars();
    this.checkEnd();
  }

  private advanceShip(s: CombatShip, dt: number): void {
    const diff = Phaser.Math.Angle.Wrap(s.desiredHeading - s.heading);
    const turnRate = 0.0021;
    s.heading += Phaser.Math.Clamp(diff, -turnRate * dt, turnRate * dt);
    const sailFactor = s.sail / s.sailMax;
    const speed = s.baseSpeed * this.wind.speedFactor(s.heading) * (0.45 + 0.55 * sailFactor);
    const nx = Phaser.Math.Clamp(s.ship.x + Math.cos(s.heading) * speed * dt, 80, ARENA_W - 80);
    const ny = Phaser.Math.Clamp(s.ship.y + Math.sin(s.heading) * speed * dt, 80, ARENA_H - 80);
    s.ship.setPosition(nx, ny);
    s.ship.update(s.heading, this.wind.state.dir, dt);
  }

  private aiUpdate(s: CombatShip, dt: number): void {
    const target = this.player;
    const dist = Phaser.Math.Distance.Between(s.ship.x, s.ship.y, target.ship.x, target.ship.y);
    const angleTo = Math.atan2(target.ship.y - s.ship.y, target.ship.x - s.ship.x);
    if (dist > 280) {
      // Közeledjen
      s.desiredHeading = angleTo;
    } else {
      // Forduljon oldalra (90°-ot a target felé)
      const flank = angleTo - Math.PI / 2;
      s.desiredHeading = flank;
    }
    if (s.crew < s.crewMax * 0.3 || s.hull < s.hullMax * 0.25) {
      // Menekül a játékos elől
      s.desiredHeading = angleTo + Math.PI;
    }
    this.advanceShip(s, dt);
    s.reload -= dt;
    if (s.reload <= 0 && this.elapsed - s.fireT > 1700) {
      const broadside = this.relativeBroadside(s, target);
      if (broadside > 0.45 && dist < 300) {
        const choice: Ammo = s.crew < s.crewMax * 0.4 ? 'chain' : Math.random() < 0.6 ? 'round' : (Math.random() < 0.5 ? 'chain' : 'grape');
        this.volley(s, target, choice);
        s.fireT = this.elapsed;
        s.reload = 1900 + Math.random() * 1200;
      } else {
        s.reload = 400;
      }
    }
  }

  private damageEffectAccum = 0;
  private updateDamageEffects(): void {
    this.damageEffectAccum += 16;
    if (this.damageEffectAccum < 800) return;
    this.damageEffectAccum = 0;
    const burnIfBroken = (s: CombatShip) => {
      if (s.hull < s.hullMax * 0.4) {
        Particles.smoke(this, s.ship.x + (Math.random() - 0.5) * 30, s.ship.y - 6, { count: 3, scale: 1 });
      }
      if (s.hull < s.hullMax * 0.25) {
        Particles.fire(this, s.ship.x + (Math.random() - 0.5) * 40, s.ship.y);
      }
      const sailAlpha = 0.55 + 0.45 * (s.sail / s.sailMax);
      s.ship.setAlpha(sailAlpha);
    };
    burnIfBroken(this.player);
    burnIfBroken(this.enemy);
  }
}
