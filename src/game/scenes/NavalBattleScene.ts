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
  // Per-oldal független reload timer (ms). 0 = kész a tüzelésre.
  portReload: number;
  starboardReload: number;
  // Utolsó tüzelés idejének nyomkövetése (AI cadence).
  aiCooldown: number;
}

// --- Mechanika helperek --------------------------------------------------

/** Maximális hatásos lőtáv pixelben — hajó-osztály és lőszer függvénye. */
function rangeFor(ship: CombatShip, ammo: Ammo): number {
  const s = SHIPS[ship.shipClass];
  // Sloop (6 ágyú): ~300, brig (12): ~340, frigate (24): ~400, galleon (20): ~390, manOwar (40): ~470
  const base = 260 + s.cannons * 5.2;
  const ammoMult = ammo === 'grape' ? 0.55 : ammo === 'chain' ? 0.85 : 1.0;
  return base * ammoMult;
}

/** Egy teljes broadside reload-ideje (ms). Több ágyú = lassabb, kisebb legénység = még lassabb. */
function reloadFor(ship: CombatShip, ammo: Ammo): number {
  const s = SHIPS[ship.shipClass];
  const crewRatio = Math.max(0.35, ship.crew / Math.max(1, s.crewMax));
  // Sloop: 1.15x, brig: 1.3x, frigate: 1.6x, galleon: 1.5x, manOwar: 2.0x alapú reload
  const sizeMult = 1 + s.cannons / 40;
  const ammoMult = ammo === 'grape' ? 0.72 : ammo === 'chain' ? 0.88 : 1.0;
  const base = 1200;
  return Math.round((base * sizeMult * ammoMult) / crewRatio);
}

/** Hány ágyúgolyó lő ki egy broadside-ban (az egyik oldal). */
function shotsPerBroadside(ship: CombatShip): number {
  const s = SHIPS[ship.shipClass];
  return Math.max(2, Math.round(s.cannons / 2));
}

/** Egy találat alap-damage tartománya hajó-osztály és lőszer függvényében. */
function baseDamageRange(ship: CombatShip, ammo: Ammo): [number, number] {
  const s = SHIPS[ship.shipClass];
  // Átlag damage = 2 + cannons * 0.22 — sloop ~3.3, brig ~4.6, frigate ~7.3, galleon ~6.4, manOwar ~10.8
  const mid = 2 + s.cannons * 0.22;
  const spread = mid * 0.4;
  if (ammo === 'grape') {
    // Kartács kisebb damage-ű, de crew-re megy
    const g = mid * 0.55;
    return [Math.max(1, Math.round(g - spread * 0.5)), Math.max(2, Math.round(g + spread * 0.5))];
  }
  return [Math.max(1, Math.round(mid - spread)), Math.max(2, Math.round(mid + spread))];
}

/** Aktuális relatív oldalszögfaktor — 0 (fej vagy tat) → 1 (tökéletesen oldalt). */
function relativeBroadside(ship: CombatShip, other: CombatShip): number {
  const angleTo = Math.atan2(other.ship.y - ship.ship.y, other.ship.x - ship.ship.x);
  const rel = Phaser.Math.Angle.Wrap(angleTo - ship.heading);
  return Math.abs(Math.sin(rel));
}

/** Melyik oldalán van a célpont a hajónak: port (bal) vagy starboard (jobb). */
function sideOfTarget(ship: CombatShip, other: CombatShip): Side {
  const angleTo = Math.atan2(other.ship.y - ship.ship.y, other.ship.x - ship.ship.x);
  const rel = Phaser.Math.Angle.Wrap(angleTo - ship.heading);
  return Math.sin(rel) > 0 ? 'port' : 'starboard';
}

/** Rakás-e a lövés: az attacker a target hossztengelyéhez közel lő. */
function isRaking(attacker: CombatShip, target: CombatShip): boolean {
  const shotAngle = Math.atan2(target.ship.y - attacker.ship.y, target.ship.x - attacker.ship.x);
  const rel = Phaser.Math.Angle.Wrap(shotAngle - target.heading);
  // |cos(rel)| > 0.78 → ~±39° a hossztengelyhez képest (bow vagy stern irányból)
  return Math.abs(Math.cos(rel)) > 0.78;
}

/** Találati esély. Figyelembe veszi a távolságot, oldalszöget, a szélirányt. */
function hitChance(attacker: CombatShip, target: CombatShip, ammo: Ammo, wind: WindSystem): number {
  const dist = Phaser.Math.Distance.Between(attacker.ship.x, attacker.ship.y, target.ship.x, target.ship.y);
  const maxR = rangeFor(attacker, ammo);
  // Linear dropoff a hatásos távolságon túl.
  const distFactor = Phaser.Math.Clamp(1 - (dist - maxR * 0.35) / (maxR * 0.9), 0.15, 0.95);
  const side = relativeBroadside(attacker, target);
  // Szél ellen stabilabb célzás, hátszélben füst takarja a célt.
  const windAngle = Math.atan2(target.ship.y - attacker.ship.y, target.ship.x - attacker.ship.x);
  const windAlign = Math.abs(Math.cos(windAngle - wind.state.dir));
  const windPenalty = 1 - windAlign * 0.08;
  return Phaser.Math.Clamp(distFactor * (0.55 + 0.45 * side) * windPenalty, 0.1, 0.95);
}

/** Zsákmány skálázás hajó-osztály és ellenfél-típus alapján. */
function lootFor(enemy: CombatShip, kind: EnemyKind): number {
  const s = SHIPS[enemy.shipClass];
  const base = 30 + s.cannons * 18 + s.crewMax * 3;
  const kindMult = kind === 'merchant' ? 1.6 : kind === 'navy' ? 1.15 : 0.85;
  const jitter = 0.75 + Math.random() * 0.5;
  return Math.round(base * kindMult * jitter);
}

// --- Scene ---------------------------------------------------------------

export class NavalBattleScene extends Phaser.Scene {
  private player!: CombatShip;
  private enemy!: CombatShip;
  private ammo: Ammo = 'round';
  private wind = new WindSystem();
  private enemyKind: EnemyKind = 'pirate';
  private enemyNation: NationId = 'crnagorac';
  private ended = false;
  private elapsed = 0;
  private hintLabel!: Phaser.GameObjects.Text;
  private rangeLabel!: Phaser.GameObjects.Text;
  private fireBtn!: Phaser.GameObjects.Container;
  private boardBtn!: Phaser.GameObjects.Container;
  private fleeBtn!: Phaser.GameObjects.Container;
  private ammoBtns: Phaser.GameObjects.Container[] = [];
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private enemyHpBar!: Phaser.GameObjects.Graphics;
  private compassG!: Phaser.GameObjects.Graphics;
  private reloadG!: Phaser.GameObjects.Graphics;
  private lastCry = 0;

  constructor() {
    super('Naval');
  }

  init(data: { enemyKind?: EnemyKind; enemyNation?: NationId; enemySilhouette?: ShipSilhouette }): void {
    this.enemyKind = data.enemyKind ?? 'pirate';
    this.enemyNation = data.enemyNation ?? 'crnagorac';
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
    const gameState = useGame.getState();
    const cls = gameState.ship.class;
    const stats = SHIPS[cls];
    this.player = this.makeShip('player', stats.silhouette, cls, ARENA_W / 2 - 220, ARENA_H / 2 + 80, 0, {
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
    this.enemy = this.makeShip(tone, eStats.silhouette, eStats.shipClass, ARENA_W / 2 + 220, ARENA_H / 2 - 80, Math.PI, eStats, 0.05 * SHIPS[eStats.shipClass].speed);
  }

  private pickEnemyStats(): {
    shipClass: ShipClass;
    silhouette: ShipSilhouette;
    hull: number; sail: number; crew: number;
    hullMax: number; sailMax: number; crewMax: number;
    cannons: number;
  } {
    if (this.enemyKind === 'merchant') {
      const cls: ShipClass = Math.random() < 0.5 ? 'brig' : 'galleon';
      const s = SHIPS[cls];
      // Kereskedő: kevesebb legénység, csökkentett ágyú (félig felfegyverezve)
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
    // Kalóz (betyár): kisebb, gyorsabb hajók
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
  ): CombatShip {
    const ship = new ShipGraphic(this, x, y, { tone, silhouette, scale: 0.95 });
    ship.setDepth(5);
    ship.update(heading, this.wind.state.dir);
    return {
      ship, tone, silhouette, shipClass, heading, baseSpeed,
      desiredHeading: heading,
      portReload: 0, starboardReload: 0, aiCooldown: 800,
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
    this.rangeLabel = this.add
      .text(this.scale.width / 2, 38, '', {
        fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#e0b24f',
        stroke: '#04141a', strokeThickness: 3,
      })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(30);
    this.playerHpBar = this.add.graphics().setScrollFactor(0).setDepth(30);
    this.enemyHpBar = this.add.graphics().setScrollFactor(0).setDepth(30);
    this.compassG = this.add.graphics().setScrollFactor(0).setDepth(30);
    this.reloadG = this.add.graphics().setScrollFactor(0).setDepth(31);
    this.add.image(54, 84, 'compass-rose').setScrollFactor(0).setDepth(29);
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
    drawBar(this.playerHpBar, 12, 16, 120, this.player, 0xe0b24f);
    drawBar(this.enemyHpBar, this.scale.width - 132, 16, 120, this.enemy, 0xc0392b);

    // Kompasz: szél (kék) + hajóirány (zöld)
    const cg = this.compassG;
    cg.clear();
    const cx = 54;
    const cy = 84;
    const blowTo = this.wind.state.dir + Math.PI;
    cg.lineStyle(3, 0x4f8bff, 1);
    cg.lineBetween(cx, cy, cx + Math.cos(blowTo) * 22, cy + Math.sin(blowTo) * 22);
    cg.lineStyle(2, 0x88e07b, 1);
    cg.lineBetween(cx, cy, cx + Math.cos(this.player.heading) * 18, cy + Math.sin(this.player.heading) * 18);
    // Szél-előny badge: aki szélfelől van annak kis jelző
    const weather = this.weatherGaugeText();
    cg.fillStyle(0x04141a, 0.8);
    cg.fillRoundedRect(86, 72, 58, 24, 4);
    this.drawStaticText('weather-txt', 115, 84, weather, weather === 'TE' ? '#88e07b' : '#ff8070');

    // Port / starboard reload bar-ok a fire-gomb körül
    this.drawReloadBars();
  }

  /** Szöveg cache — egy-egy key-re egyetlen Text objektum. */
  private staticTexts = new Map<string, Phaser.GameObjects.Text>();
  private drawStaticText(key: string, x: number, y: number, value: string, color: string): void {
    let t = this.staticTexts.get(key);
    if (!t) {
      t = this.add.text(x, y, value, {
        fontFamily: '"Press Start 2P"', fontSize: '9px', color,
        stroke: '#04141a', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(32);
      this.staticTexts.set(key, t);
    } else {
      t.setPosition(x, y).setText(value).setColor(color);
    }
  }

  private weatherGaugeText(): string {
    // Aki szélfelől van (upwind) a másikhoz képest.
    const angleToEnemy = Math.atan2(this.enemy.ship.y - this.player.ship.y, this.enemy.ship.x - this.player.ship.x);
    const windFrom = this.wind.state.dir + Math.PI; // ahonnan fúj
    const rel = Math.abs(Phaser.Math.Angle.Wrap(angleToEnemy - windFrom));
    // Ha a játékos a szélfelől néz az ellenfél felé (rel < π/2), akkor övé a szél-előny.
    return rel < Math.PI / 2 ? 'TE' : 'ELL';
  }

  private drawReloadBars(): void {
    this.reloadG.clear();
    if (!this.fireBtn) return;
    const bx = this.fireBtn.x;
    const by = this.fireBtn.y;
    // Port = bal csík, starboard = jobb csík a gomb alatt
    const maxW = 40;
    const drawSide = (xOff: number, loaded: number, max: number, color: number) => {
      const frac = max > 0 ? Phaser.Math.Clamp(1 - loaded / max, 0, 1) : 1;
      this.reloadG.fillStyle(0x04141a, 0.85);
      this.reloadG.fillRect(bx + xOff - maxW / 2, by + 28, maxW, 4);
      this.reloadG.fillStyle(color, 1);
      this.reloadG.fillRect(bx + xOff - maxW / 2, by + 28, maxW * frac, 4);
    };
    const cur = reloadFor(this.player, this.ammo);
    drawSide(-26, this.player.portReload, cur, 0x88e07b);
    drawSide(26, this.player.starboardReload, cur, 0x88e07b);
    this.drawStaticText('reload-label-p', bx - 26, by + 38, 'BAL', '#c6d5ee');
    this.drawStaticText('reload-label-s', bx + 26, by + 38, 'JOBB', '#c6d5ee');
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
    this.fireBtn?.setPosition(this.scale.width - 60, yBottom - 16);
    this.boardBtn?.setPosition(this.scale.width - 160, yBottom);
    this.fleeBtn?.setPosition(this.scale.width - 60, yBottom - 72);
    this.hintLabel?.setPosition(this.scale.width / 2, 18);
    this.rangeLabel?.setPosition(this.scale.width / 2, 38);
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
    const side = sideOfTarget(this.player, this.enemy);
    const readyTimer = side === 'port' ? this.player.portReload : this.player.starboardReload;
    if (readyTimer > 0) {
      this.flashHint(side === 'port' ? 'Bal oldali ágyúk töltenek…' : 'Jobb oldali ágyúk töltenek…');
      vibrate('warn');
      return;
    }
    const broadside = relativeBroadside(this.player, this.enemy);
    if (broadside < 0.4) {
      this.flashHint('Fordulj OLDALRA — broadside!');
      vibrate('warn');
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.player.ship.x, this.player.ship.y, this.enemy.ship.x, this.enemy.ship.y);
    const maxR = rangeFor(this.player, this.ammo);
    if (dist > maxR) {
      this.flashHint(`Túl messze! (${Math.round(dist)} / ${Math.round(maxR)})`);
      return;
    }
    this.volley(this.player, this.enemy, this.ammo, side);
    const reload = reloadFor(this.player, this.ammo);
    if (side === 'port') this.player.portReload = reload;
    else this.player.starboardReload = reload;
    if (Math.random() < 0.35) this.battleCry('naval.cryFire');
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
          const hit = Math.random() < hitChance(attacker, target, ammo, this.wind);
          if (hit) {
            this.applyHit(attacker, target, ammo, raking);
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

  private applyHit(attacker: CombatShip, target: CombatShip, ammo: Ammo, raking: boolean): void {
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
    void attacker;
  }

  private floatDamage(x: number, y: number, dmg: number, ammo: Ammo, raking: boolean): void {
    const color = raking ? '#ff8a3d' : ammo === 'round' ? '#ffb37a' : ammo === 'chain' ? '#a0c8ff' : '#ffd86a';
    const prefix = raking ? '⚡' : '';
    const txt = this.add
      .text(x, y, `${prefix}-${dmg}`, {
        fontFamily: '"Press Start 2P"', fontSize: raking ? '14px' : '12px', color,
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
    // Bordázás feltétele: ellenfél gyengébb VAGY játékosnak előnye van
    const enemyWeak = this.enemy.hull < this.enemy.hullMax * 0.45 || this.enemy.crew < this.enemy.crewMax * 0.4;
    const crewRatio = this.player.crew / Math.max(1, this.enemy.crew);
    if (!enemyWeak && crewRatio < 1.1) {
      this.flashHint('Lágyítsd meg előbb — legénység vagy hull!');
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

  // --- Frame update ---

  update(_t: number, deltaMs: number): void {
    this.elapsed += deltaMs;
    this.wind.update(deltaMs);
    this.advanceShip(this.player, deltaMs);
    this.tickReload(this.player, deltaMs);
    this.aiUpdate(this.enemy, deltaMs);
    this.updateDamageEffects();
    if (!this.ended) {
      this.updateHints();
    }
    this.drawBars();
    this.checkEnd();
  }

  private tickReload(s: CombatShip, dt: number): void {
    s.portReload = Math.max(0, s.portReload - dt);
    s.starboardReload = Math.max(0, s.starboardReload - dt);
  }

  private updateHints(): void {
    const pb = relativeBroadside(this.player, this.enemy);
    const dist = Phaser.Math.Distance.Between(this.player.ship.x, this.player.ship.y, this.enemy.ship.x, this.enemy.ship.y);
    const maxR = rangeFor(this.player, this.ammo);
    // Range label — mindig látható
    const inRange = dist <= maxR;
    const color = dist < 110 ? '#ffd86a' : inRange ? '#88e07b' : '#ff8080';
    this.rangeLabel.setText(`${Math.round(dist)} / ${Math.round(maxR)} px`);
    this.rangeLabel.setColor(color);
    // Hint — 250ms-enként frissítsünk, ne pörögjön
    if (this.elapsed % 250 < 16) {
      this.hintLabel.setAlpha(1);
      const side = sideOfTarget(this.player, this.enemy);
      const readyT = side === 'port' ? this.player.portReload : this.player.starboardReload;
      if (pb < 0.4) this.hintLabel.setText('Fordulj oldalra!');
      else if (dist > maxR) this.hintLabel.setText('Közeledj…');
      else if (dist < 90) this.hintLabel.setText('Bordázható!');
      else if (readyT > 0) this.hintLabel.setText(`${side === 'port' ? 'BAL' : 'JOBB'} oldal tölt…`);
      else this.hintLabel.setText(`TÜZELJ ${side === 'port' ? 'BAL' : 'JOBB'}-ra!`);
    }
  }

  private advanceShip(s: CombatShip, dt: number): void {
    const diff = Phaser.Math.Angle.Wrap(s.desiredHeading - s.heading);
    const classTurn = SHIPS[s.shipClass].turn;
    const turnRate = 0.0018 * classTurn;
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

    // Személyiség EnemyKind szerint
    if (this.enemyKind === 'merchant') {
      // Menekül szél alá, oldalra fordul csak ha menekvés közben célozhat
      const downwind = this.wind.state.dir; // ahol a szél fúj felé
      // Preferált menekülési irány: a szél irányában, távolodva a játékostól
      const flee = angleTo + Math.PI;
      // Keveréke: a szél és a menekülés átlaga, a szél kicsit súlyosabb
      s.desiredHeading = 0.55 * flee + 0.45 * downwind;
      if (s.hull < s.hullMax * 0.3) s.desiredHeading = flee; // pánik
    } else if (this.enemyKind === 'navy') {
      // Párhuzamos távol-harc: tartja a ~70% hatásos lőtávot, oldalra fordul
      const ideal = maxR * 0.72;
      if (dist > ideal + 60) s.desiredHeading = angleTo;
      else if (dist < ideal - 60) s.desiredHeading = angleTo + Math.PI;
      else s.desiredHeading = angleTo - Math.PI / 2; // parallel
    } else {
      // Pirate: közelít a bordázás felé
      if (dist > 150) {
        s.desiredHeading = angleTo;
      } else if (dist > 95) {
        // Kis oldalra fordulás egy broadside-ra
        s.desiredHeading = angleTo - Math.PI / 2.2;
      } else {
        // Közel van — bordáz
        this.aiAttemptBoard(s);
        s.desiredHeading = angleTo;
      }
    }

    // Visszavonulás extrém sérüléskor
    if (s.hull < s.hullMax * 0.18 || s.crew < s.crewMax * 0.2) {
      s.desiredHeading = angleTo + Math.PI;
    }

    this.advanceShip(s, dt);
    this.tickReload(s, dt);

    // Tüzelés döntése
    s.aiCooldown -= dt;
    if (s.aiCooldown > 0) return;
    const broadside = relativeBroadside(s, target);
    const side = sideOfTarget(s, target);
    const readyT = side === 'port' ? s.portReload : s.starboardReload;
    if (readyT > 0 || broadside < 0.42 || dist > maxR) {
      s.aiCooldown = 300;
      return;
    }
    // Lőszer választás a helyzet függvényében
    let ammo: Ammo = 'round';
    if (this.enemyKind === 'merchant') ammo = Math.random() < 0.7 ? 'chain' : 'round'; // csak el akar menekülni
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
    // Csak kalóz próbálja aktívan bordázni a játékost
    if (this.enemyKind !== 'pirate') return;
    const playerWeak = this.player.hull < this.player.hullMax * 0.3 || this.player.crew < this.player.crewMax * 0.35;
    if (!playerWeak) return;
    this.ended = true;
    this.showBanner('ÁTSZÁLLNAK!', '#ff8a3d');
    this.time.delayedCall(800, () => this.scene.start('Duel', { enemyCrew: s.crew, enemyKind: this.enemyKind, defender: true }));
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
