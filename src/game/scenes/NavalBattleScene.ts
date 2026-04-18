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
  // AI cooldown, csak ellenfélnél használt.
  aiCooldown: number;
  // AI elkötelezi magát egy haladási iránnyal, hogy ne kapkodjon.
  aiCommitUntil: number;
  // Célzási képesség (0..1). Játékos 1.0, ellenfelek típustól függ.
  aiSkill: number;
  // Vitorla állás: teljes (gyors, nehezen fordul) vagy csata (lassabb, fordulékony).
  sailMode: 'full' | 'battle';
  // Játékos aktív forgatása gombbal: -1 balra, 0 nem fordul, +1 jobbra.
  turning: -1 | 0 | 1;
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

/** Találati esély. Figyelembe veszi a távolságot, oldalszöget, szelet, lövő képességét
 *  és legénység-állapotát. */
function hitChance(attacker: CombatShip, target: CombatShip, ammo: Ammo, wind: WindSystem): number {
  const dist = Phaser.Math.Distance.Between(attacker.ship.x, attacker.ship.y, target.ship.x, target.ship.y);
  const maxR = rangeFor(attacker, ammo);
  // Távolság-szorzó: közelben ~0.8, félig meddig ~0.5, max-nál 0.15
  const normDist = Phaser.Math.Clamp(dist / maxR, 0, 1);
  const distFactor = Phaser.Math.Clamp(1 - normDist * normDist * 0.75, 0.15, 0.9);
  const side = relativeBroadside(attacker, target);
  // Szélre/széllel szembeni korrekció
  const windAngle = Math.atan2(target.ship.y - attacker.ship.y, target.ship.x - attacker.ship.x);
  const windAlign = Math.abs(Math.cos(windAngle - wind.state.dir));
  const windPenalty = 1 - windAlign * 0.08;
  // Legénységi képesség: 70%-os legénység = 85%-os pontosság
  const crewRatio = Math.max(0.25, attacker.crew / Math.max(1, attacker.crewMax));
  const crewFactor = 0.55 + 0.45 * crewRatio;
  // Teljes célzási képesség
  const skillFactor = attacker.aiSkill * crewFactor;
  return Phaser.Math.Clamp(distFactor * (0.45 + 0.45 * side) * windPenalty * skillFactor, 0.05, 0.9);
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
  private leftTurnBtn!: Phaser.GameObjects.Container;
  private rightTurnBtn!: Phaser.GameObjects.Container;
  private sailBtn!: Phaser.GameObjects.Container;
  private ammoBtns: Phaser.GameObjects.Container[] = [];
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private enemyHpBar!: Phaser.GameObjects.Graphics;
  private compassG!: Phaser.GameObjects.Graphics;
  private reloadG!: Phaser.GameObjects.Graphics;
  private weatherTxt!: Phaser.GameObjects.Text;
  private reloadLabelP!: Phaser.GameObjects.Text;
  private reloadLabelS!: Phaser.GameObjects.Text;
  private lastCry = 0;
  private damageEffectAccum = 0;

  constructor() {
    super('Naval');
  }

  init(data: { enemyKind?: EnemyKind; enemyNation?: NationId; enemySilhouette?: ShipSilhouette }): void {
    this.enemyKind = data.enemyKind ?? 'pirate';
    this.enemyNation = data.enemyNation ?? 'crnagorac';
    this.ended = false;
    this.elapsed = 0;
    this.lastCry = 0;
    this.damageEffectAccum = 0;
    // Fontos: scene újraindításnál a Phaser a GameObject-eket destroyolja, de
    // a class instance megmarad — ezért a mezőket szándékosan undefined-ra
    // tesszük, a create() majd új objektumokat tesz rájuk.
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
    }, 0.06 * stats.speed, 1.0);

    const eStats = this.pickEnemyStats();
    const tone: ShipTone = this.enemyKind === 'pirate' ? 'enemy' : this.enemyKind === 'navy' ? 'navy' : 'merchant';
    // AI célzási képesség típustól függ — ennek hála nem talál el mindig
    const aiSkill =
      this.enemyKind === 'merchant' ? 0.45 :
      this.enemyKind === 'navy' ? 0.80 :
      0.60; // pirate
    this.enemy = this.makeShip(tone, eStats.silhouette, eStats.shipClass, ARENA_W / 2 + 220, ARENA_H / 2 - 80, Math.PI, eStats, 0.05 * SHIPS[eStats.shipClass].speed, aiSkill);
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
      sailMode: 'full', turning: 0,
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
    // Előre létrehozott HUD szövegek — frame-enként csak update
    this.weatherTxt = this.add.text(115, 84, '', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#88e07b',
      stroke: '#04141a', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(32);
    this.reloadLabelP = this.add.text(0, 0, 'BAL', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#c6d5ee',
      stroke: '#04141a', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(32);
    this.reloadLabelS = this.add.text(0, 0, 'JOBB', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#c6d5ee',
      stroke: '#04141a', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(32);
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
    this.weatherTxt.setText(weather);
    this.weatherTxt.setColor(weather === 'TE' ? '#88e07b' : '#ff8070');

    // Port / starboard reload bar-ok a fire-gomb körül
    this.drawReloadBars();
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
    if (!this.fireBtn || !this.player) return;
    const bx = this.fireBtn.x;
    const by = this.fireBtn.y;
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
    this.reloadLabelP.setPosition(bx - 26, by + 38);
    this.reloadLabelS.setPosition(bx + 26, by + 38);
  }

  private createControls(): void {
    // Tap-release gomb — egyszeri tüzeléshez / akcióhoz
    const btn = (label: string, color: number, w: number, h: number, fontSize: string, handler: () => void) => {
      const c = this.add.container(0, 0).setScrollFactor(0).setDepth(30);
      const bg = this.add.rectangle(0, 0, w, h, color, 0.92).setStrokeStyle(2, 0xfbf5e3);
      const txt = this.add
        .text(0, 0, label, { fontFamily: '"Press Start 2P"', fontSize, color: '#fbf5e3', align: 'center' })
        .setOrigin(0.5);
      c.add([bg, txt]);
      c.setSize(w, h);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', handler);
      c.on('pointerdown', () => bg.setFillStyle(color, 0.7));
      c.on('pointerout', () => bg.setFillStyle(color, 0.92));
      return c;
    };
    // Hold-to-turn gomb — lenyomva tartva aktivál, felengedve deaktivál
    const holdBtn = (label: string, color: number, w: number, h: number, onHold: () => void, onRelease: () => void) => {
      const c = this.add.container(0, 0).setScrollFactor(0).setDepth(30);
      const bg = this.add.rectangle(0, 0, w, h, color, 0.92).setStrokeStyle(3, 0xfbf5e3);
      const txt = this.add
        .text(0, 0, label, { fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#fbf5e3' })
        .setOrigin(0.5);
      c.add([bg, txt]);
      c.setSize(w, h);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => { bg.setFillStyle(color, 0.6); onHold(); });
      const release = () => { bg.setFillStyle(color, 0.92); onRelease(); };
      c.on('pointerup', release);
      c.on('pointerout', release);
      c.on('pointerupoutside', release);
      return c;
    };

    // Bal hüvelykujj — forgató gombok
    this.leftTurnBtn = holdBtn('◀', 0x145f65, 78, 78,
      () => { this.player.turning = -1; vibrate('light'); },
      () => { if (this.player.turning === -1) this.player.turning = 0; },
    );
    this.rightTurnBtn = holdBtn('▶', 0x145f65, 78, 78,
      () => { this.player.turning = 1; vibrate('light'); },
      () => { if (this.player.turning === 1) this.player.turning = 0; },
    );
    this.sailBtn = btn('VITORLA\nTELI', 0x3a5a8a, 86, 48, '8px', () => {
      this.player.sailMode = this.player.sailMode === 'full' ? 'battle' : 'full';
      this.refreshSailBtn();
      vibrate('light');
    });

    // Jobb hüvelykujj — lőszer, tűz, bordázás, menekülés
    const ammos: Ammo[] = ['round', 'chain', 'grape'];
    const labels: Record<Ammo, string> = { round: 'GOLYÓ', chain: 'LÁNC', grape: 'KARTÁCS' };
    this.ammoBtns = ammos.map((a) => {
      const c = btn(labels[a], 0x1a7f86, 86, 32, '8px', () => {
        this.ammo = a;
        this.refreshAmmoBtns();
        vibrate('light');
      });
      c.setData('ammo', a);
      return c;
    });
    this.fireBtn = btn('TŰZ', 0x7a2e0e, 112, 78, '14px', () => this.playerFire());
    this.boardBtn = btn('BORDA', 0xb99137, 86, 32, '8px', () => this.attemptBoard());
    this.fleeBtn = btn('MENEKÜL', 0x4a4238, 86, 32, '8px', () => this.flee());
    this.refreshAmmoBtns();
    this.refreshSailBtn();
    this.layoutHud();
  }

  private refreshSailBtn(): void {
    if (!this.sailBtn || !this.player) return;
    const txt = this.sailBtn.list[1] as Phaser.GameObjects.Text;
    txt.setText(this.player.sailMode === 'full' ? 'VITORLA\nTELI' : 'VITORLA\nCSATA');
  }

  private refreshAmmoBtns(): void {
    for (const b of this.ammoBtns) {
      const bg = b.list[0] as Phaser.GameObjects.Rectangle;
      const a = b.getData('ammo') as Ammo;
      bg.setStrokeStyle(a === this.ammo ? 4 : 2, a === this.ammo ? 0xe0b24f : 0xfbf5e3);
    }
  }

  private layoutHud(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const bottomPad = 20;

    // --- Bal alsó sarok: kormányzás (bal hüvelykujj) ---
    const leftX = 58;
    this.leftTurnBtn?.setPosition(leftX, H - bottomPad - 40);
    this.rightTurnBtn?.setPosition(leftX + 90, H - bottomPad - 40);
    this.sailBtn?.setPosition(leftX + 45, H - bottomPad - 40 - 70);

    // --- Jobb alsó sarok: tűz + lőszer + akciók (jobb hüvelykujj) ---
    const rightX = W - 60;
    // Tűz gomb alul középen
    this.fireBtn?.setPosition(rightX, H - bottomPad - 40);
    // Lőszer sor közvetlenül a tűz gomb fölött
    const ammoY = H - bottomPad - 40 - 74;
    this.ammoBtns.forEach((b, i) => b.setPosition(rightX - 92 + i * 92, ammoY));
    // Bordázás + Menekülés a tűz gombtól balra
    this.boardBtn?.setPosition(rightX - 112, H - bottomPad - 56);
    this.fleeBtn?.setPosition(rightX - 112, H - bottomPad - 20);

    // --- Felső sáv: hint + range ---
    this.hintLabel?.setPosition(W / 2, 18);
    this.rangeLabel?.setPosition(W / 2, 38);
  }

  private onWorldTap(_p: Phaser.Input.Pointer): void {
    // Tap-to-heading kikapcsolva — most kifejezett bal/jobb forgató gombokkal
    // kormányozzuk a hajót. A tap a világra semmit sem tesz.
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
    // Szórás skálázás: távolság + lövő képesség függvényében
    const dist = Phaser.Math.Distance.Between(attacker.ship.x, attacker.ship.y, target.ship.x, target.ship.y);
    const maxR = rangeFor(attacker, ammo);
    const distNorm = Phaser.Math.Clamp(dist / maxR, 0, 1.2);
    // Közel 8px szórás, maxlőtávon ~40px. Gyenge lövő 1.6x szór.
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
    if (!this.player || !this.enemy) return;
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
    const inRange = dist <= maxR;
    const rangeColor = dist < 110 ? '#ffd86a' : inRange ? '#88e07b' : '#ff8080';
    this.rangeLabel.setText(`${Math.round(dist)} / ${Math.round(maxR)} px`);
    this.rangeLabel.setColor(rangeColor);

    const side = sideOfTarget(this.player, this.enemy);
    const readyT = side === 'port' ? this.player.portReload : this.player.starboardReload;
    const canFire = pb >= 0.4 && dist <= maxR && readyT <= 0;

    // Tűz gomb színe az állapot alapján
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
      } else if (pb < 0.4) {
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

    if (this.elapsed % 250 < 16) {
      this.hintLabel.setAlpha(1);
      if (pb < 0.4) this.hintLabel.setText('Fordulj oldalra!');
      else if (dist > maxR) this.hintLabel.setText('Közeledj…');
      else if (dist < 90) this.hintLabel.setText('Bordázható!');
      else if (readyT > 0) this.hintLabel.setText(`${side === 'port' ? 'BAL' : 'JOBB'} oldal tölt…`);
      else this.hintLabel.setText(`TÜZELJ ${side === 'port' ? 'BAL' : 'JOBB'}-ra!`);
    }
  }

  private advanceShip(s: CombatShip, dt: number): void {
    const classTurn = SHIPS[s.shipClass].turn;
    // Csata-vitorla: lassabb de fordulékonyabb
    const turnMult = s.sailMode === 'battle' ? 1.7 : 1.0;
    const turnRate = 0.0018 * classTurn * turnMult;

    // Játékos aktív forgatása gombbal — turning -1/+1 direktben forgat
    if (s.turning !== 0) {
      const delta = s.turning * turnRate * dt;
      s.heading += delta;
      s.desiredHeading = s.heading;
    } else {
      const diff = Phaser.Math.Angle.Wrap(s.desiredHeading - s.heading);
      s.heading += Phaser.Math.Clamp(diff, -turnRate * dt, turnRate * dt);
    }

    const sailFactor = s.sail / s.sailMax;
    const sailSpeedMult = s.sailMode === 'battle' ? 0.55 : 1.0;
    const speed = s.baseSpeed * this.wind.speedFactor(s.heading) * (0.45 + 0.55 * sailFactor) * sailSpeedMult;
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

    // Elköteleződés: az AI csak ~1 mp-enként dönt új irányról, nem kapkod.
    const needNewDecision = this.elapsed >= s.aiCommitUntil;

    if (needNewDecision) {
      if (this.enemyKind === 'merchant') {
        // Kereskedő menekül szél alá, kerüli a játékost
        const downwind = this.wind.state.dir;
        const flee = angleTo + Math.PI;
        s.desiredHeading = 0.55 * flee + 0.45 * downwind;
        if (s.hull < s.hullMax * 0.3) s.desiredHeading = flee;
      } else if (this.enemyKind === 'navy') {
        // Párhuzamos távol-harc
        const ideal = maxR * 0.72;
        if (dist > ideal + 60) s.desiredHeading = angleTo;
        else if (dist < ideal - 60) s.desiredHeading = angleTo + Math.PI;
        else s.desiredHeading = angleTo - Math.PI / 2;
      } else {
        // Kalóz: bordázáshoz közelít
        if (dist > 150) s.desiredHeading = angleTo;
        else if (dist > 95) s.desiredHeading = angleTo - Math.PI / 2.2;
        else {
          this.aiAttemptBoard(s);
          s.desiredHeading = angleTo;
        }
      }

      // Visszavonulás extrém sérüléskor (felülírja a típus-stratégiát)
      if (s.hull < s.hullMax * 0.18 || s.crew < s.crewMax * 0.2) {
        s.desiredHeading = angleTo + Math.PI;
      }

      // Legközelebb 900-1400 ms múlva gondolkodik újra
      s.aiCommitUntil = this.elapsed + 900 + Math.random() * 500;
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
    // Csak kalóz próbálja aktívan bordázni a játékost
    if (this.enemyKind !== 'pirate') return;
    const playerWeak = this.player.hull < this.player.hullMax * 0.3 || this.player.crew < this.player.crewMax * 0.35;
    if (!playerWeak) return;
    this.ended = true;
    this.showBanner('ÁTSZÁLLNAK!', '#ff8a3d');
    this.time.delayedCall(800, () => this.scene.start('Duel', { enemyCrew: s.crew, enemyKind: this.enemyKind, defender: true }));
  }

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
