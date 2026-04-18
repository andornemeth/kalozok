import Phaser from 'phaser';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { SHIPS, type ShipClass, type ShipSilhouette } from '@/game/data/ships';
import { vibrate } from '@/utils/haptics';
import { ShipGraphic, type ShipTone } from '@/game/entities/ShipGraphic';
import { Audio } from '@/audio/AudioManager';
import { Particles } from '@/game/systems/Particles';
import { WindSystem } from '@/game/systems/WindSystem';
import { checkQuestCompletion } from '@/game/systems/QuestSystem';
import { Joystick } from '@/game/ui/Joystick';
import type { NationId } from '@/game/data/ports';
import i18n from '@/i18n';

type Ammo = 'round' | 'chain' | 'grape';
type EnemyKind = 'pirate' | 'navy' | 'merchant';
type Side = 'port' | 'starboard';

const ARENA_W = 1800;
const ARENA_H = 1200;

interface CombatShip {
  ship: ShipGraphic;
  tone: ShipTone;
  silhouette: ShipSilhouette;
  shipClass: ShipClass;
  heading: number;
  desiredHeading: number;
  baseSpeed: number;
  hull: number;
  sail: number;
  crew: number;
  hullMax: number;
  sailMax: number;
  crewMax: number;
  cannons: number;
  portReload: number;
  starboardReload: number;
  aiCooldown: number;
  aiCommitUntil: number;
  aiSkill: number;
}

// =========================================================================
// Csata-matek helperek — változatlanok a rewrite során
// =========================================================================

/** Maximális hatásos lőtáv pixelben — hajó-osztály és lőszer függvénye. */
function rangeFor(ship: CombatShip, ammo: Ammo): number {
  const s = SHIPS[ship.shipClass];
  const base = 260 + s.cannons * 5.2;
  const ammoMult = ammo === 'grape' ? 0.55 : ammo === 'chain' ? 0.85 : 1.0;
  return base * ammoMult;
}

/** Egy teljes broadside reload-ideje (ms). */
function reloadFor(ship: CombatShip, ammo: Ammo): number {
  const s = SHIPS[ship.shipClass];
  const crewRatio = Math.max(0.35, ship.crew / Math.max(1, s.crewMax));
  const sizeMult = 1 + s.cannons / 40;
  const ammoMult = ammo === 'grape' ? 0.72 : ammo === 'chain' ? 0.88 : 1.0;
  const base = 1200;
  return Math.round((base * sizeMult * ammoMult) / crewRatio);
}

function shotsPerBroadside(ship: CombatShip): number {
  const s = SHIPS[ship.shipClass];
  return Math.max(2, Math.round(s.cannons / 2));
}

function baseDamageRange(ship: CombatShip, ammo: Ammo): [number, number] {
  const s = SHIPS[ship.shipClass];
  const mid = 2 + s.cannons * 0.22;
  const spread = mid * 0.4;
  if (ammo === 'grape') {
    const g = mid * 0.55;
    return [Math.max(1, Math.round(g - spread * 0.5)), Math.max(2, Math.round(g + spread * 0.5))];
  }
  return [Math.max(1, Math.round(mid - spread)), Math.max(2, Math.round(mid + spread))];
}

function relativeBroadside(ship: CombatShip, other: CombatShip): number {
  const angleTo = Math.atan2(other.ship.y - ship.ship.y, other.ship.x - ship.ship.x);
  const rel = Phaser.Math.Angle.Wrap(angleTo - ship.heading);
  return Math.abs(Math.sin(rel));
}

function sideOfTarget(ship: CombatShip, other: CombatShip): Side {
  const angleTo = Math.atan2(other.ship.y - ship.ship.y, other.ship.x - ship.ship.x);
  const rel = Phaser.Math.Angle.Wrap(angleTo - ship.heading);
  return Math.sin(rel) > 0 ? 'port' : 'starboard';
}

function isRaking(attacker: CombatShip, target: CombatShip): boolean {
  const shotAngle = Math.atan2(target.ship.y - attacker.ship.y, target.ship.x - attacker.ship.x);
  const rel = Phaser.Math.Angle.Wrap(shotAngle - target.heading);
  return Math.abs(Math.cos(rel)) > 0.78;
}

function hitChance(attacker: CombatShip, target: CombatShip, ammo: Ammo, wind: WindSystem): number {
  const dist = Phaser.Math.Distance.Between(attacker.ship.x, attacker.ship.y, target.ship.x, target.ship.y);
  const maxR = rangeFor(attacker, ammo);
  const normDist = Phaser.Math.Clamp(dist / maxR, 0, 1);
  const distFactor = Phaser.Math.Clamp(1 - normDist * normDist * 0.75, 0.15, 0.9);
  const side = relativeBroadside(attacker, target);
  const windAngle = Math.atan2(target.ship.y - attacker.ship.y, target.ship.x - attacker.ship.x);
  const windAlign = Math.abs(Math.cos(windAngle - wind.state.dir));
  const windPenalty = 1 - windAlign * 0.08;
  const crewRatio = Math.max(0.25, attacker.crew / Math.max(1, attacker.crewMax));
  const crewFactor = 0.55 + 0.45 * crewRatio;
  const skillFactor = attacker.aiSkill * crewFactor;
  return Phaser.Math.Clamp(distFactor * (0.45 + 0.45 * side) * windPenalty * skillFactor, 0.05, 0.9);
}

function lootFor(enemy: CombatShip, kind: EnemyKind): number {
  const s = SHIPS[enemy.shipClass];
  const base = 30 + s.cannons * 18 + s.crewMax * 3;
  const kindMult = kind === 'merchant' ? 1.6 : kind === 'navy' ? 1.15 : 0.85;
  const jitter = 0.75 + Math.random() * 0.5;
  return Math.round(base * kindMult * jitter);
}

// =========================================================================
// Scene
// =========================================================================

export class NavalBattleScene extends Phaser.Scene {
  private player!: CombatShip;
  private enemy!: CombatShip;
  private ammo: Ammo = 'round';
  private wind = new WindSystem();
  private enemyKind: EnemyKind = 'pirate';
  private enemyNation: NationId = 'crnagorac';
  private ended = false;
  private elapsed = 0;
  private lastCry = 0;
  private damageAccum = 0;

  // HUD elemek
  private joystick!: Joystick;
  private fireBtn!: Phaser.GameObjects.Container;
  private ammoBtn!: Phaser.GameObjects.Container;
  private boardBtn!: Phaser.GameObjects.Container;
  private fleeBtn!: Phaser.GameObjects.Container;
  private playerBars!: Phaser.GameObjects.Graphics;
  private enemyBars!: Phaser.GameObjects.Graphics;
  private topHint!: Phaser.GameObjects.Text;
  private rangeText!: Phaser.GameObjects.Text;
  private windArrow!: Phaser.GameObjects.Graphics;
  private arcG!: Phaser.GameObjects.Graphics;
  private headingArrow!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Naval');
  }

  init(data: { enemyKind?: EnemyKind; enemyNation?: NationId; enemySilhouette?: ShipSilhouette }): void {
    this.enemyKind = data.enemyKind ?? 'pirate';
    this.enemyNation = data.enemyNation ?? 'crnagorac';
    this.ended = false;
    this.elapsed = 0;
    this.lastCry = 0;
    this.damageAccum = 0;
    this.ammo = 'round';
    this.player = undefined as unknown as CombatShip;
    this.enemy = undefined as unknown as CombatShip;
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
    this.setupInput();

    this.scale.on('resize', () => this.layoutHud());
    this.layoutHud();
    Audio.wave();
    this.time.delayedCall(500, () => this.battleCry('naval.cryRally'));
  }

  // --- Setup -----------------------------------------------------------

  private drawSea(): void {
    for (let y = 0; y < ARENA_H; y += 64) {
      for (let x = 0; x < ARENA_W; x += 64) {
        this.add.image(x, y, 'wave-tile').setOrigin(0, 0).setDepth(0);
      }
    }
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * ARENA_W;
      const y = Math.random() * ARENA_H;
      const c = this.add.image(x, y, 'wave-crest').setDepth(1).setAlpha(0.6);
      this.tweens.add({
        targets: c, alpha: { from: 0, to: 0.7 },
        yoyo: true, repeat: -1, duration: 1100 + Math.random() * 700,
      });
    }
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(4, 0x04141a, 0.6);
    g.strokeRect(0, 0, ARENA_W, ARENA_H);
  }

  private spawnShips(): void {
    const gs = useGame.getState();
    const cls = gs.ship.class;
    const stats = SHIPS[cls];
    this.player = this.makeShip('player', stats.silhouette, cls, ARENA_W / 2 - 220, ARENA_H / 2 + 80, 0, {
      hull: gs.ship.hull, sail: gs.ship.sail, crew: gs.ship.crew,
      hullMax: stats.hullMax, sailMax: stats.sailMax, crewMax: stats.crewMax,
      cannons: stats.cannons,
    }, 0.06 * stats.speed, 1.0);

    const eStats = this.pickEnemyStats();
    const tone: ShipTone = this.enemyKind === 'pirate' ? 'enemy' : this.enemyKind === 'navy' ? 'navy' : 'merchant';
    const aiSkill =
      this.enemyKind === 'merchant' ? 0.45 :
      this.enemyKind === 'navy' ? 0.80 :
      0.60;
    this.enemy = this.makeShip(tone, eStats.silhouette, eStats.shipClass, ARENA_W / 2 + 220, ARENA_H / 2 - 80, Math.PI, eStats, 0.05 * SHIPS[eStats.shipClass].speed, aiSkill);
  }

  private pickEnemyStats(): {
    shipClass: ShipClass; silhouette: ShipSilhouette;
    hull: number; sail: number; crew: number;
    hullMax: number; sailMax: number; crewMax: number;
    cannons: number;
  } {
    if (this.enemyKind === 'merchant') {
      const cls: ShipClass = Math.random() < 0.5 ? 'brig' : 'galleon';
      const s = SHIPS[cls];
      const effCannons = Math.max(6, Math.floor(s.cannons * 0.6));
      return {
        shipClass: cls, silhouette: s.silhouette,
        hull: s.hullMax, sail: s.sailMax, crew: Math.floor(s.crewMax * 0.4),
        hullMax: s.hullMax, sailMax: s.sailMax, crewMax: Math.floor(s.crewMax * 0.7),
        cannons: effCannons,
      };
    }
    if (this.enemyKind === 'navy') {
      const cls: ShipClass = Math.random() < 0.6 ? 'frigate' : 'manOwar';
      const s = SHIPS[cls];
      return {
        shipClass: cls, silhouette: s.silhouette,
        hull: s.hullMax, sail: s.sailMax, crew: Math.floor(s.crewMax * 0.85),
        hullMax: s.hullMax, sailMax: s.sailMax, crewMax: s.crewMax,
        cannons: s.cannons,
      };
    }
    const cls: ShipClass = Math.random() < 0.6 ? 'sloop' : 'brig';
    const s = SHIPS[cls];
    return {
      shipClass: cls, silhouette: s.silhouette,
      hull: s.hullMax, sail: s.sailMax, crew: Math.floor(s.crewMax * 0.75),
      hullMax: s.hullMax, sailMax: s.sailMax, crewMax: s.crewMax,
      cannons: s.cannons,
    };
  }

  private makeShip(
    tone: ShipTone,
    silhouette: ShipSilhouette,
    shipClass: ShipClass,
    x: number, y: number, heading: number,
    stats: {
      hull: number; sail: number; crew: number;
      hullMax: number; sailMax: number; crewMax: number;
      cannons: number;
    },
    baseSpeed: number,
    aiSkill: number,
  ): CombatShip {
    const ship = new ShipGraphic(this, x, y, { tone, silhouette, scale: 0.95 });
    ship.setDepth(5);
    ship.update(heading, this.wind.state.dir);
    return {
      ship, tone, silhouette, shipClass, heading, baseSpeed,
      desiredHeading: heading,
      portReload: 0, starboardReload: 0, aiCooldown: 800,
      aiCommitUntil: 0, aiSkill,
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

  // --- HUD ---------------------------------------------------------

  private createHud(): void {
    this.playerBars = this.add.graphics().setScrollFactor(0).setDepth(30);
    this.enemyBars = this.add.graphics().setScrollFactor(0).setDepth(30);
    this.windArrow = this.add.graphics().setScrollFactor(0).setDepth(30);

    this.topHint = this.add
      .text(this.scale.width / 2, 18, '', {
        fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#fbf5e3',
        stroke: '#04141a', strokeThickness: 4,
      })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(30);

    this.rangeText = this.add
      .text(this.scale.width / 2, 40, '', {
        fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#88e07b',
        stroke: '#04141a', strokeThickness: 3,
      })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(30);

    // Heading-nyíl és lőív — a hajó rotáció-hiányát pótolja
    this.arcG = this.add.graphics().setDepth(4);
    this.headingArrow = this.add.graphics().setDepth(4);
  }

  private createControls(): void {
    // Joystick a bal alsó sarokban
    this.joystick = new Joystick(this, 120, this.scale.height - 120, 80, 28);

    // Jobb oldali akció-oszlop
    const mkBtn = (label: string, w: number, h: number, color: number, fontSize: string, handler: () => void) => {
      const c = this.add.container(0, 0).setScrollFactor(0).setDepth(30);
      const bg = this.add.rectangle(0, 0, w, h, color, 0.92).setStrokeStyle(2, 0xfbf5e3);
      const txt = this.add.text(0, 0, label, {
        fontFamily: '"Press Start 2P"', fontSize, color: '#fbf5e3', align: 'center',
      }).setOrigin(0.5);
      c.add([bg, txt]);
      c.setSize(w, h);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () => handler());
      c.on('pointerdown', () => bg.setFillStyle(color, 0.7));
      c.on('pointerout', () => bg.setFillStyle(color, 0.92));
      return c;
    };

    this.fireBtn = mkBtn('TŰZ', 120, 90, 0x7a2e0e, '16px', () => this.playerFire());
    this.ammoBtn = mkBtn('GOLYÓ', 120, 40, 0x1a7f86, '9px', () => this.cycleAmmo());
    this.boardBtn = mkBtn('BORDA', 104, 36, 0xb99137, '9px', () => this.attemptBoard());
    this.fleeBtn = mkBtn('MENEKÜL', 104, 36, 0x4a4238, '9px', () => this.flee());
  }

  private setupInput(): void {
    // Pointer események a scene szintjén — a joystick saját pointer-id-t tart.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.joystick.handlePointerDown(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.joystick.handlePointerMove(p);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.joystick.handlePointerUp(p);
    });
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => {
      this.joystick.handlePointerUp(p);
    });
  }

  private layoutHud(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const bottomPad = 24;

    this.joystick?.reposition(120, H - 120);

    // Jobb oszlop: TŰZ középen nagy, fölötte AMMO, balra/fölé BORDA+MENEKÜL
    const rightX = W - 68;
    this.fireBtn?.setPosition(rightX, H - bottomPad - 54);
    this.ammoBtn?.setPosition(rightX, H - bottomPad - 54 - 68);
    this.boardBtn?.setPosition(rightX - 116, H - bottomPad - 82);
    this.fleeBtn?.setPosition(rightX - 116, H - bottomPad - 40);

    this.topHint?.setPosition(W / 2, 18);
    this.rangeText?.setPosition(W / 2, 40);
  }

  // --- Ammo cycle ----------------------------------------------------

  private cycleAmmo(): void {
    const order: Ammo[] = ['round', 'chain', 'grape'];
    const i = order.indexOf(this.ammo);
    this.ammo = order[(i + 1) % order.length]!;
    const label = this.ammo === 'round' ? 'GOLYÓ' : this.ammo === 'chain' ? 'LÁNC' : 'KARTÁCS';
    const txt = this.ammoBtn.list[1] as Phaser.GameObjects.Text;
    txt.setText(label);
    vibrate('light');
  }

  // --- Tüzelés -------------------------------------------------------

  private playerFire(): void {
    if (this.ended) return;
    const side = sideOfTarget(this.player, this.enemy);
    const readyTimer = side === 'port' ? this.player.portReload : this.player.starboardReload;
    if (readyTimer > 0) {
      this.flashHint(side === 'port' ? 'Bal oldal tölt…' : 'Jobb oldal tölt…');
      vibrate('warn');
      return;
    }
    const broadside = relativeBroadside(this.player, this.enemy);
    if (broadside < 0.4) {
      this.flashHint('Fordulj OLDALRA!');
      vibrate('warn');
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.player.ship.x, this.player.ship.y, this.enemy.ship.x, this.enemy.ship.y);
    const maxR = rangeFor(this.player, this.ammo);
    if (dist > maxR) {
      this.flashHint('Túl messze!');
      return;
    }
    this.volley(this.player, this.enemy, this.ammo, side);
    const reload = reloadFor(this.player, this.ammo);
    if (side === 'port') this.player.portReload = reload;
    else this.player.starboardReload = reload;
    if (Math.random() < 0.3) this.battleCry('naval.cryFire');
    vibrate('medium');
  }

  private volley(attacker: CombatShip, target: CombatShip, ammo: Ammo, side: Side): void {
    Audio.cannon();
    const sideAngle = attacker.heading + (side === 'port' ? Math.PI / 2 : -Math.PI / 2);
    const shots = shotsPerBroadside(attacker);
    const tex = ammo === 'round' ? 'cannonball-round' : ammo === 'chain' ? 'cannonball-chain' : 'cannonball-grape';
    const ox = Math.cos(sideAngle);
    const oy = Math.sin(sideAngle);
    const raking = isRaking(attacker, target);
    const dist = Phaser.Math.Distance.Between(attacker.ship.x, attacker.ship.y, target.ship.x, target.ship.y);
    const maxR = rangeFor(attacker, ammo);
    const distNorm = Phaser.Math.Clamp(dist / maxR, 0, 1.2);
    const spreadBase = 8 + distNorm * 32;
    const spreadMult = 1 + (1 - attacker.aiSkill) * 0.8;
    const maxSpread = spreadBase * spreadMult;
    for (let i = 0; i < shots; i++) {
      const offset = (i - (shots - 1) / 2) * 12;
      const px = attacker.ship.x + Math.cos(attacker.heading) * offset + ox * 20;
      const py = attacker.ship.y + Math.sin(attacker.heading) * offset + oy * 20;
      Particles.flash(this, px, py);
      Particles.smoke(this, px, py, { count: 4, depth: 12, scale: 0.9 });
      const ball = this.add.image(px, py, tex).setDepth(11);
      const spreadX = (Math.random() - 0.5) * maxSpread;
      const spreadY = (Math.random() - 0.5) * maxSpread;
      const tx = target.ship.x + Math.cos(sideAngle) * spreadX + spreadY * 0.4;
      const ty = target.ship.y + Math.sin(sideAngle) * spreadX + spreadY * 0.4;
      this.tweens.add({
        targets: ball,
        x: tx, y: ty,
        duration: 380 + Math.random() * 140,
        ease: 'Quad.easeOut',
        onComplete: () => {
          ball.destroy();
          const hit = Math.random() < hitChance(attacker, target, ammo, this.wind);
          if (hit) {
            this.applyHit(target, ammo, raking);
            Particles.explosion(this, tx, ty, raking ? 18 : 13);
            Audio.cannonHit();
          } else {
            Particles.splash(this, tx, ty);
            Audio.splash();
          }
        },
      });
    }
    if (raking && target === this.enemy) {
      this.time.delayedCall(320, () => this.showBanner('RAKELÉS!', '#ffb37a'));
    }
    this.time.delayedCall(900, () => this.checkEnd());
  }

  private applyHit(target: CombatShip, ammo: Ammo, raking: boolean): void {
    const attacker = target === this.enemy ? this.player : this.enemy;
    const [lo, hi] = baseDamageRange(attacker, ammo);
    let dmg = Phaser.Math.Between(lo, hi);
    if (raking) dmg = Math.round(dmg * 1.8);
    let tone = 0xff8080;
    if (ammo === 'round') {
      target.hull = Math.max(0, target.hull - dmg);
    } else if (ammo === 'chain') {
      target.sail = Math.max(0, target.sail - dmg);
      tone = 0xa0c8ff;
    } else {
      target.crew = Math.max(0, target.crew - dmg);
      tone = 0xffc070;
    }
    target.ship.setTint(tone);
    this.time.delayedCall(110, () => target.ship.clearTint());
    this.floatDamage(target.ship.x, target.ship.y - 40, dmg, ammo, raking);
    if (target === this.enemy && Math.random() < 0.18) {
      this.battleCry('naval.cryHit');
    }
  }

  private floatDamage(x: number, y: number, dmg: number, ammo: Ammo, raking: boolean): void {
    const color = raking ? '#ff8a3d' : ammo === 'round' ? '#ffb37a' : ammo === 'chain' ? '#a0c8ff' : '#ffd86a';
    const prefix = raking ? '⚡' : '';
    const txt = this.add.text(x, y, `${prefix}-${dmg}`, {
      fontFamily: '"Press Start 2P"', fontSize: raking ? '14px' : '12px', color,
      stroke: '#04141a', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: txt, y: y - 40, alpha: { from: 1, to: 0 },
      duration: 900, ease: 'Quad.easeOut', onComplete: () => txt.destroy(),
    });
  }

  private showBanner(text: string, color: string): void {
    const banner = this.add.text(this.scale.width / 2, this.scale.height / 2, text, {
      fontFamily: '"Press Start 2P"', fontSize: '22px', color,
      stroke: '#04141a', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(45).setAlpha(0);
    this.tweens.add({
      targets: banner, alpha: { from: 0, to: 1 },
      scale: { from: 0.6, to: 1.1 }, duration: 220, yoyo: true, hold: 320,
      onComplete: () => banner.destroy(),
    });
  }

  private battleCry(key: string): void {
    if (this.elapsed - this.lastCry < 2200) return;
    this.lastCry = this.elapsed;
    const msg = i18n.t(key);
    const txt = this.add.text(this.scale.width / 2, this.scale.height / 2 - 80, msg, {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#fbf5e3',
      stroke: '#c0392b', strokeThickness: 4,
      align: 'center', wordWrap: { width: this.scale.width - 60 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(40).setAlpha(0);
    this.tweens.add({
      targets: txt, alpha: { from: 0, to: 1 }, y: '-=10',
      duration: 180, yoyo: true, hold: 900,
      onComplete: () => txt.destroy(),
    });
  }

  // --- Akciók --------------------------------------------------------

  private attemptBoard(): void {
    if (this.ended) return;
    const dist = Phaser.Math.Distance.Between(this.player.ship.x, this.player.ship.y, this.enemy.ship.x, this.enemy.ship.y);
    if (dist > 90) {
      this.flashHint('Közelebb a bordázáshoz!');
      return;
    }
    const enemyWeak = this.enemy.hull < this.enemy.hullMax * 0.45 || this.enemy.crew < this.enemy.crewMax * 0.4;
    const crewRatio = this.player.crew / Math.max(1, this.enemy.crew);
    if (!enemyWeak && crewRatio < 1.1) {
      this.flashHint('Lágyítsd meg előbb!');
      return;
    }
    this.battleCry('naval.cryBoard');
    this.ended = true;
    this.time.delayedCall(600, () => this.scene.start('Duel', { enemyCrew: this.enemy.crew, enemyKind: this.enemyKind }));
  }

  private flee(): void {
    if (this.ended) return;
    const sternExposed = relativeBroadside(this.enemy, this.player);
    if (sternExposed > 0.6) {
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
    this.topHint.setText(t);
    this.tweens.killTweensOf(this.topHint);
    this.topHint.setAlpha(1);
    this.tweens.add({ targets: this.topHint, alpha: 0, duration: 1500, delay: 500 });
  }

  private checkEnd(): void {
    if (this.enemy.hull <= 0 || this.enemy.crew <= 1) this.victory();
    else if (this.player.hull <= 0 || this.player.crew <= 1) this.defeat();
  }

  private victory(): void {
    if (this.ended) return;
    this.ended = true;
    const g = useGame.getState();
    const loot = lootFor(this.enemy, this.enemyKind);
    g.addGold(loot);
    g.damageShip(g.ship.hull - this.player.hull, g.ship.sail - this.player.sail, g.ship.crew - this.player.crew);
    g.adjustMorale(+8);
    g.unlockAchievement('first-blood');
    g.recordShipDefeated();
    if (this.enemyNation !== 'crnagorac') g.changeReputation(this.enemyNation, -8);
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

  // --- Frame update --------------------------------------------------

  update(_t: number, deltaMs: number): void {
    if (!this.player || !this.enemy) return;
    this.elapsed += deltaMs;
    this.wind.update(deltaMs);

    // Joystick → player.desiredHeading (csak ha nyomva van és kilépett a dead-zone-ból)
    if (this.joystick.active && this.joystick.magnitude > 0.05) {
      this.player.desiredHeading = this.joystick.angle;
    }

    this.advanceShip(this.player, deltaMs);
    this.tickReload(this.player, deltaMs);
    this.aiUpdate(this.enemy, deltaMs);
    this.updateEnvironmentalEffects();
    if (!this.ended) this.updateHud();
    this.drawHud();
    this.checkEnd();
  }

  private tickReload(s: CombatShip, dt: number): void {
    s.portReload = Math.max(0, s.portReload - dt);
    s.starboardReload = Math.max(0, s.starboardReload - dt);
  }

  private advanceShip(s: CombatShip, dt: number): void {
    const classTurn = SHIPS[s.shipClass].turn;
    const turnRate = 0.0022 * classTurn;
    const diff = Phaser.Math.Angle.Wrap(s.desiredHeading - s.heading);
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
    const maxR = rangeFor(s, 'round');

    if (this.elapsed >= s.aiCommitUntil) {
      if (this.enemyKind === 'merchant') {
        const downwind = this.wind.state.dir;
        const flee = angleTo + Math.PI;
        s.desiredHeading = 0.55 * flee + 0.45 * downwind;
        if (s.hull < s.hullMax * 0.3) s.desiredHeading = flee;
      } else if (this.enemyKind === 'navy') {
        const ideal = maxR * 0.72;
        if (dist > ideal + 60) s.desiredHeading = angleTo;
        else if (dist < ideal - 60) s.desiredHeading = angleTo + Math.PI;
        else s.desiredHeading = angleTo - Math.PI / 2;
      } else {
        if (dist > 150) s.desiredHeading = angleTo;
        else if (dist > 95) s.desiredHeading = angleTo - Math.PI / 2.2;
        else {
          this.aiAttemptBoard(s);
          s.desiredHeading = angleTo;
        }
      }
      if (s.hull < s.hullMax * 0.18 || s.crew < s.crewMax * 0.2) {
        s.desiredHeading = angleTo + Math.PI;
      }
      s.aiCommitUntil = this.elapsed + 900 + Math.random() * 500;
    }

    this.advanceShip(s, dt);
    this.tickReload(s, dt);

    s.aiCooldown -= dt;
    if (s.aiCooldown > 0) return;
    const broadside = relativeBroadside(s, target);
    const side = sideOfTarget(s, target);
    const readyT = side === 'port' ? s.portReload : s.starboardReload;
    if (readyT > 0 || broadside < 0.42 || dist > maxR) {
      s.aiCooldown = 300;
      return;
    }
    let ammo: Ammo = 'round';
    if (this.enemyKind === 'merchant') ammo = Math.random() < 0.7 ? 'chain' : 'round';
    else if (this.enemyKind === 'pirate' && dist < 140) ammo = Math.random() < 0.5 ? 'grape' : 'round';
    else if (target.sail > target.sailMax * 0.7 && dist > maxR * 0.55) ammo = Math.random() < 0.35 ? 'chain' : 'round';

    this.volley(s, target, ammo, side);
    const reload = reloadFor(s, ammo);
    if (side === 'port') s.portReload = reload;
    else s.starboardReload = reload;
    s.aiCooldown = 700 + Math.random() * 500;
  }

  private aiAttemptBoard(s: CombatShip): void {
    if (this.ended) return;
    const dist = Phaser.Math.Distance.Between(s.ship.x, s.ship.y, this.player.ship.x, this.player.ship.y);
    if (dist > 70) return;
    if (this.enemyKind !== 'pirate') return;
    const playerWeak = this.player.hull < this.player.hullMax * 0.3 || this.player.crew < this.player.crewMax * 0.35;
    if (!playerWeak) return;
    this.ended = true;
    this.showBanner('ÁTSZÁLLNAK!', '#ff8a3d');
    this.time.delayedCall(800, () => this.scene.start('Duel', { enemyCrew: s.crew, enemyKind: this.enemyKind, defender: true }));
  }

  private updateEnvironmentalEffects(): void {
    this.damageAccum += 16;
    if (this.damageAccum < 800) return;
    this.damageAccum = 0;
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

  // --- HUD rajzolás --------------------------------------------------

  private updateHud(): void {
    const broadside = relativeBroadside(this.player, this.enemy);
    const dist = Phaser.Math.Distance.Between(this.player.ship.x, this.player.ship.y, this.enemy.ship.x, this.enemy.ship.y);
    const maxR = rangeFor(this.player, this.ammo);
    const inRange = dist <= maxR;

    const rangeColor = dist < 110 ? '#ffd86a' : inRange ? '#88e07b' : '#ff8080';
    this.rangeText.setText(`${Math.round(dist)} / ${Math.round(maxR)}`);
    this.rangeText.setColor(rangeColor);

    const side = sideOfTarget(this.player, this.enemy);
    const readyT = side === 'port' ? this.player.portReload : this.player.starboardReload;
    const canFire = broadside >= 0.4 && inRange && readyT <= 0;

    const fireBg = this.fireBtn?.list[0] as Phaser.GameObjects.Rectangle | undefined;
    const fireTxt = this.fireBtn?.list[1] as Phaser.GameObjects.Text | undefined;
    if (fireBg && fireTxt) {
      if (canFire) {
        fireBg.setFillStyle(0x2d5a2d, 0.95);
        fireBg.setStrokeStyle(3, 0x88e07b);
        fireTxt.setText(`TŰZ\n${side === 'port' ? 'BAL' : 'JOBB'}`);
        fireTxt.setColor('#fbf5e3');
      } else if (readyT > 0) {
        fireBg.setFillStyle(0x7a5e14, 0.9);
        fireBg.setStrokeStyle(2, 0xb99137);
        fireTxt.setText('TÖLT…');
        fireTxt.setColor('#ffd86a');
      } else if (broadside < 0.4) {
        fireBg.setFillStyle(0x7a2e0e, 0.75);
        fireBg.setStrokeStyle(2, 0xff8070);
        fireTxt.setText('FORDULJ');
        fireTxt.setColor('#ff8070');
      } else {
        fireBg.setFillStyle(0x7a2e0e, 0.75);
        fireBg.setStrokeStyle(2, 0xff8070);
        fireTxt.setText('TÚL\nMESSZE');
        fireTxt.setColor('#ff8070');
      }
    }

    // Tip (250ms throttle)
    if (this.elapsed % 250 < 16) {
      this.topHint.setAlpha(1);
      if (broadside < 0.4) this.topHint.setText('Fordulj oldalra!');
      else if (!inRange) this.topHint.setText('Közeledj…');
      else if (dist < 90) this.topHint.setText('Bordázható!');
      else if (readyT > 0) this.topHint.setText(`${side === 'port' ? 'BAL' : 'JOBB'} tölt…`);
      else this.topHint.setText(`TÜZELJ ${side === 'port' ? 'BAL' : 'JOBB'}-ra!`);
    }
  }

  private drawHud(): void {
    this.drawBars();
    this.drawWind();
    this.drawShipIndicators();
  }

  private drawBars(): void {
    const drawBar = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, ship: CombatShip, color: number) => {
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
    };
    drawBar(this.playerBars, 12, 16, 120, this.player, 0xe0b24f);
    drawBar(this.enemyBars, this.scale.width - 132, 16, 120, this.enemy, 0xc0392b);
  }

  private drawWind(): void {
    const g = this.windArrow;
    g.clear();
    const cx = this.scale.width / 2 - 130;
    const cy = 28;
    g.fillStyle(0x04141a, 0.6);
    g.fillRoundedRect(cx - 28, cy - 12, 70, 24, 4);
    const blowTo = this.wind.state.dir + Math.PI;
    g.lineStyle(3, 0x4f8bff, 0.9);
    g.lineBetween(cx, cy, cx + Math.cos(blowTo) * 18, cy + Math.sin(blowTo) * 18);
    // Nyíl hegye
    const tipX = cx + Math.cos(blowTo) * 18;
    const tipY = cy + Math.sin(blowTo) * 18;
    g.fillStyle(0x4f8bff, 1);
    g.fillTriangle(
      tipX, tipY,
      tipX - Math.cos(blowTo + 0.4) * 7, tipY - Math.sin(blowTo + 0.4) * 7,
      tipX - Math.cos(blowTo - 0.4) * 7, tipY - Math.sin(blowTo - 0.4) * 7,
    );
  }

  private drawShipIndicators(): void {
    // Heading + ghost + lőív a saját hajó körül, világtérben (a kamera követi)
    const g = this.headingArrow;
    g.clear();
    if (!this.player) return;
    const px = this.player.ship.x;
    const py = this.player.ship.y;
    const h = this.player.heading;

    // Heading nyíl — sárga, 80 px
    const hx = px + Math.cos(h) * 80;
    const hy = py + Math.sin(h) * 80;
    g.lineStyle(3, 0xe0b24f, 0.65);
    g.lineBetween(px, py, hx, hy);
    g.fillStyle(0xe0b24f, 0.8);
    g.fillTriangle(
      hx, hy,
      hx - Math.cos(h + 0.35) * 12, hy - Math.sin(h + 0.35) * 12,
      hx - Math.cos(h - 0.35) * 12, hy - Math.sin(h - 0.35) * 12,
    );

    // Ghost nyíl a célirányba, ha eltér a jelenlegitől
    const diff = Math.abs(Phaser.Math.Angle.Wrap(this.player.desiredHeading - h));
    if (diff > 0.12 && this.joystick.active) {
      const dh = this.player.desiredHeading;
      const dhx = px + Math.cos(dh) * 60;
      const dhy = py + Math.sin(dh) * 60;
      g.lineStyle(2, 0xfbf5e3, 0.35);
      // Szaggatott
      const seg = 6;
      for (let i = 0; i < 10; i++) {
        const t0 = i / 10;
        const t1 = (i + 0.5) / 10;
        g.lineBetween(
          px + (dhx - px) * t0, py + (dhy - py) * t0,
          px + (dhx - px) * t1, py + (dhy - py) * t1,
        );
        void seg;
      }
    }

    // Lőívek: port (90°) és starboard (-90°), keskeny cikk
    const arc = this.arcG;
    arc.clear();
    const maxR = rangeFor(this.player, this.ammo);
    const drawArc = (sideAngle: number, cannonSide: Side) => {
      const inThisSide = sideOfTarget(this.player, this.enemy) === cannonSide;
      const broadsideOk = relativeBroadside(this.player, this.enemy) >= 0.4;
      const inR = Phaser.Math.Distance.Between(px, py, this.enemy.ship.x, this.enemy.ship.y) <= maxR;
      const highlight = inThisSide && broadsideOk && inR;
      const color = highlight ? 0xe0b24f : 0xfbf5e3;
      const alpha = highlight ? 0.2 : 0.06;
      arc.fillStyle(color, alpha);
      arc.beginPath();
      arc.moveTo(px, py);
      const halfArc = Math.PI / 4; // ±45°
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const a = sideAngle - halfArc + (halfArc * 2 * i) / steps;
        arc.lineTo(px + Math.cos(a) * maxR, py + Math.sin(a) * maxR);
      }
      arc.closePath();
      arc.fillPath();
    };
    drawArc(h + Math.PI / 2, 'port');
    drawArc(h - Math.PI / 2, 'starboard');
  }
}
