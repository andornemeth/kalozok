import Phaser from 'phaser';
import { PORTS, type Port, type NationId } from '@/game/data/ports';
import { WindSystem } from '@/game/systems/WindSystem';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { SHIPS } from '@/game/data/ships';
import { ShipGraphic, type ShipKind } from '@/game/entities/ShipGraphic';

const WORLD_W = 820;
const WORLD_H = 620;

const ISLANDS: [number, number, number, number][] = [
  [60, 220, 260, 260],
  [170, 340, 220, 380],
  [290, 380, 330, 410],
  [340, 260, 420, 300],
  [480, 250, 540, 290],
  [560, 290, 620, 320],
  [620, 330, 680, 360],
  [700, 380, 740, 420],
  [680, 450, 730, 490],
  [310, 430, 430, 540],
  [440, 460, 520, 530],
  [80, 360, 170, 430],
  [620, 510, 740, 580],
];

interface Enemy {
  ship: ShipGraphic;
  heading: number;
  speed: number;
  kind: 'pirate' | 'navy' | 'merchant';
  nation: NationId;
}

export class WorldMapScene extends Phaser.Scene {
  private player!: ShipGraphic;
  private heading = 0;
  private target: Phaser.Math.Vector2 | null = null;
  private targetMarker?: Phaser.GameObjects.Image;
  private wind = new WindSystem();
  private windArrows: Phaser.GameObjects.Image[] = [];
  private portMarkers: Phaser.GameObjects.Container[] = [];
  private enemies: Enemy[] = [];
  private minimap!: Phaser.GameObjects.RenderTexture;
  private minimapMask!: Phaser.GameObjects.Graphics;
  private minimapAccum = 0;
  private nearPortId: string | null = null;
  private dayAccum = 0;
  private wakeAccum = 0;
  private wakes: Phaser.GameObjects.Image[] = [];
  private cloudShadows: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('World');
  }

  private tintOverlay?: Phaser.GameObjects.Rectangle;
  private hintText?: Phaser.GameObjects.Text;

  create(): void {
    this.drawWater();
    this.drawLandMasses();
    this.spawnCloudShadows();
    this.spawnWindField();
    this.spawnPorts();
    this.spawnPlayer();
    this.spawnEnemies();
    this.setupCamera();
    this.setupInput();
    this.setupMinimap();
    this.setupDayNight();
    this.showFirstTimeHint();
    this.cameras.main.fadeIn(400, 4, 20, 26);
    bus.emit('scene:changed', { key: 'world' });
    bus.emit('world:nearPort', null);
  }

  private setupDayNight(): void {
    this.tintOverlay = this.add
      .rectangle(0, 0, WORLD_W, WORLD_H, 0x0a1a3a, 0)
      .setOrigin(0, 0)
      .setDepth(40);
  }

  private updateDayNight(): void {
    if (!this.tintOverlay) return;
    const days = useGame.getState().career.daysAtSea;
    const phase = (days % 4) / 4; // 4-napos ciklus
    // 0 = dél, 0.25 = alkony, 0.5 = éj, 0.75 = hajnal
    const nightness = Math.max(0, Math.sin((phase - 0.25) * Math.PI * 2));
    this.tintOverlay.fillAlpha = nightness * 0.45;
  }

  private showFirstTimeHint(): void {
    if (useGame.getState().flags.tutorialMove) return;
    this.hintText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 40, 'Érints a tengerbe\nhogy odavitorlázz', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#fbf5e3',
        align: 'center',
        stroke: '#04141a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50);
    this.tweens.add({
      targets: this.hintText,
      alpha: { from: 1, to: 0.5 },
      yoyo: true,
      repeat: -1,
      duration: 900,
    });
    this.time.delayedCall(6000, () => {
      this.hintText?.destroy();
      this.hintText = undefined;
    });
  }

  private drawWater(): void {
    const g = this.add.graphics();
    g.fillStyle(0x0a3338, 1);
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    // Dithered stipple — apró világos pixelek szabályos mintázatban
    g.fillStyle(0x145f65, 0.8);
    for (let y = 0; y < WORLD_H; y += 4) {
      for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < WORLD_W; x += 4) {
        g.fillRect(x, y, 1, 1);
      }
    }
    g.fillStyle(0x1a7f86, 0.5);
    for (let y = 2; y < WORLD_H; y += 8) {
      for (let x = 4; x < WORLD_W; x += 8) {
        g.fillRect(x, y, 2, 1);
      }
    }
    // Hullámcsúcsok
    const wave = this.add.graphics();
    wave.fillStyle(0xbfe2e4, 0.4);
    for (let i = 0; i < 70; i++) {
      const x = (i * 97) % WORLD_W;
      const y = (i * 53) % WORLD_H;
      if (!this.insideLand(x, y)) {
        wave.fillRect(x, y, 3, 1);
        wave.fillRect(x + 1, y + 1, 1, 1);
      }
    }
  }

  private drawLandMasses(): void {
    const sand = this.add.graphics();
    const mid = this.add.graphics();
    const grass = this.add.graphics();
    const trees = this.add.graphics();
    for (const [x1, y1, x2, y2] of ISLANDS) {
      const w = x2 - x1;
      const h = y2 - y1;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      // Organikus sziluett — poligon csomópontok lekerekített formán
      const pts: Phaser.Types.Math.Vector2Like[] = [];
      const steps = 14;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const bump = 0.85 + 0.3 * Math.sin(a * 3 + x1 * 0.03) + 0.2 * Math.cos(a * 5 + y1 * 0.05);
        pts.push({ x: cx + (Math.cos(a) * w * 0.5 * bump), y: cy + (Math.sin(a) * h * 0.5 * bump) });
      }
      // Homok (külső)
      sand.fillStyle(0xe8d28a, 1);
      sand.fillPoints(pts, true);
      // Közép (világos zöld / sötét homok átmenet)
      const innerPts = pts.map((p) => ({ x: cx + (p.x - cx) * 0.82, y: cy + (p.y - cy) * 0.82 }));
      mid.fillStyle(0x6b8f3d, 1);
      mid.fillPoints(innerPts, true);
      // Fű
      const inner2 = pts.map((p) => ({ x: cx + (p.x - cx) * 0.66, y: cy + (p.y - cy) * 0.66 }));
      grass.fillStyle(0x3a6d3a, 1);
      grass.fillPoints(inner2, true);
    }
    // Pálmák + sziklák a szárazföldön
    for (const [x1, y1, x2, y2] of ISLANDS) {
      const w = x2 - x1;
      const h = y2 - y1;
      const count = Math.max(2, Math.floor((w * h) / 900));
      for (let i = 0; i < count; i++) {
        const rx = x1 + w * 0.2 + ((i * 37) % (w * 0.6));
        const ry = y1 + h * 0.25 + ((i * 59) % (h * 0.5));
        this.add.image(rx, ry, 'palm').setDepth(2);
      }
      // Nagyobb szigeteken egy hegy-szilette
      if (w > 80 && h > 60) {
        trees.fillStyle(0x5a4020, 1);
        trees.fillTriangle((x1 + x2) / 2 - 10, (y1 + y2) / 2 + 4, (x1 + x2) / 2 + 10, (y1 + y2) / 2 + 4, (x1 + x2) / 2, (y1 + y2) / 2 - 10);
        trees.fillStyle(0xfbf5e3, 1);
        trees.fillTriangle((x1 + x2) / 2 - 3, (y1 + y2) / 2 - 4, (x1 + x2) / 2 + 3, (y1 + y2) / 2 - 4, (x1 + x2) / 2, (y1 + y2) / 2 - 10);
      }
    }
  }

  private spawnCloudShadows(): void {
    for (let i = 0; i < 4; i++) {
      const x = (i * 230 + 80) % WORLD_W;
      const y = 40 + i * 150;
      const s = this.add.image(x, y, 'cloud-shadow').setDepth(6).setAlpha(0.6);
      s.setData('speed', 0.008 + Math.random() * 0.006);
      this.cloudShadows.push(s);
    }
  }

  private spawnWindField(): void {
    for (let y = 30; y < WORLD_H; y += 80) {
      for (let x = 30; x < WORLD_W; x += 100) {
        const arr = this.add.image(x, y, 'wind-arrow').setAlpha(0.5).setDepth(1);
        this.windArrows.push(arr);
      }
    }
  }

  private spawnPorts(): void {
    for (const p of PORTS) {
      const c = this.add.container(p.x, p.y);
      const marker = this.add.image(0, 0, this.portTexture(p.nation)).setScale(1.25);
      const label = this.add
        .text(0, 16, p.name, {
          fontFamily: '"Press Start 2P"',
          fontSize: '7px',
          color: '#fbf5e3',
          stroke: '#04141a',
          strokeThickness: 3,
          resolution: 2,
        })
        .setOrigin(0.5, 0);
      c.add([marker, label]);
      c.setDepth(3);
      this.portMarkers.push(c);
    }
  }

  private portTexture(n: NationId): string {
    return (
      {
        england: 'port-eng',
        spain: 'port-esp',
        france: 'port-fra',
        netherlands: 'port-ned',
        pirate: 'port-pir',
      } as const
    )[n];
  }

  private spawnPlayer(): void {
    const saved = useGame.getState().worldPos;
    const start = PORTS[0]!;
    const x = saved?.x ?? start.x + 42;
    const y = saved?.y ?? start.y + 42;
    this.player = new ShipGraphic(this, x, y, {
      kind: 'ship-player',
      scale: 0.22,
    });
    this.player.setDepth(5);
    this.heading = saved?.heading ?? 0;
  }

  private encounterGrace = 2500;
  private saveTimer = 0;

  private spawnEnemies(): void {
    const rng = () => Math.random();
    for (let i = 0; i < 7; i++) {
      const kind = rng() < 0.5 ? 'merchant' : rng() < 0.5 ? 'pirate' : 'navy';
      const shipKind: ShipKind =
        kind === 'pirate' ? 'ship-enemy' : kind === 'navy' ? 'ship-navy' : 'ship-merchant';
      const nation =
        kind === 'pirate'
          ? 'pirate'
          : (['england', 'spain', 'france', 'netherlands'] as NationId[])[Math.floor(rng() * 4)]!;
      let x = 0;
      let y = 0;
      for (let t = 0; t < 30; t++) {
        x = 60 + rng() * (WORLD_W - 120);
        y = 60 + rng() * (WORLD_H - 120);
        if (!this.insideLand(x, y)) break;
      }
      const ship = new ShipGraphic(this, x, y, { kind: shipKind, scale: 0.18 });
      ship.setDepth(4);
      this.enemies.push({ ship, heading: rng() * Math.PI * 2, speed: 0.22 + rng() * 0.2, kind, nation });
    }
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player.container, true, 0.08, 0.08);
    this.cameras.main.setZoom(this.computeZoom());
    this.scale.on('resize', () => {
      this.cameras.main.setZoom(this.computeZoom());
      this.layoutMinimap();
    });
  }

  private computeZoom(): number {
    const w = this.scale.width;
    const h = this.scale.height;
    const small = Math.min(w, h);
    const targetTilesAcross = small < 500 ? 190 : small < 900 ? 260 : 340;
    return small / targetTilesAcross;
  }

  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const topDead = 56;
      const bottomDead = this.scale.height - 72;
      if (p.y < topDead || p.y > bottomDead) return;
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      if (this.insideLand(world.x, world.y)) return;
      this.target = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(world.x, 10, WORLD_W - 10),
        Phaser.Math.Clamp(world.y, 10, WORLD_H - 10),
      );
      this.showTargetMarker(this.target.x, this.target.y);
      useGame.getState().setFlag('tutorialMove', true);
    });
  }

  private showTargetMarker(x: number, y: number): void {
    if (!this.targetMarker) {
      this.targetMarker = this.add.image(x, y, 'target-marker').setDepth(6);
    } else {
      this.targetMarker.setPosition(x, y).setVisible(true).setAlpha(1);
    }
    this.tweens.killTweensOf(this.targetMarker);
    this.targetMarker.setScale(1.5);
    this.tweens.add({
      targets: this.targetMarker,
      scale: 1,
      duration: 250,
      ease: 'Back.out',
    });
  }

  private setupMinimap(): void {
    this.minimap = this.add.renderTexture(0, 0, 140, 100).setScrollFactor(0).setDepth(50);
    this.minimap.setOrigin(0, 0);
    this.minimapMask = this.add.graphics().setScrollFactor(0).setDepth(49);
    this.layoutMinimap();
    this.refreshMinimap();
  }

  private layoutMinimap(): void {
    const margin = 8;
    this.minimap.setPosition(this.scale.width - 140 - margin, margin + 48);
    this.minimapMask.clear();
    this.minimapMask.fillStyle(0x000000, 0.4);
    this.minimapMask.fillRoundedRect(this.minimap.x - 2, this.minimap.y - 2, 144, 104, 6);
  }

  private refreshMinimap(): void {
    const rt = this.minimap;
    rt.clear();
    const sx = rt.width / WORLD_W;
    const sy = rt.height / WORLD_H;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x082427, 1);
    g.fillRect(0, 0, rt.width, rt.height);
    g.fillStyle(0x6b4a2b, 1);
    for (const [x1, y1, x2, y2] of ISLANDS) {
      g.fillRect(x1 * sx, y1 * sy, (x2 - x1) * sx, (y2 - y1) * sy);
    }
    for (const p of PORTS) {
      g.fillStyle(this.miniPortColor(p.nation), 1);
      g.fillCircle(p.x * sx, p.y * sy, 2);
    }
    g.fillStyle(0xe0b24f, 1);
    g.fillCircle(this.player.x * sx, this.player.y * sy, 2.5);
    rt.draw(g);
    g.destroy();
  }

  private miniPortColor(n: NationId): number {
    return { england: 0xd04040, spain: 0xf2c94c, france: 0x4f8bff, netherlands: 0xff8c42, pirate: 0x222222 }[n];
  }

  private insideLand(x: number, y: number): boolean {
    for (const [x1, y1, x2, y2] of ISLANDS) {
      if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return true;
    }
    return false;
  }

  private lastDt = 16;

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs;
    this.lastDt = dt;
    this.wind.update(dt);
    this.updateWindArrows();
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateEncounter(dt);
    this.updatePortProximity();
    if (this.saveTimer > 500) {
      this.saveTimer = 0;
      useGame.getState().setWorldPos({ x: this.player.x, y: this.player.y, heading: this.heading });
    } else {
      this.saveTimer += dt;
    }
    this.dayAccum += dt;
    if (this.dayAccum > 2000) {
      this.dayAccum = 0;
      useGame.getState().advanceDays(1);
    }
    this.minimapAccum += dt;
    if (this.minimapAccum > 500) {
      this.minimapAccum = 0;
      this.refreshMinimap();
    }
    this.updateWakes(dt);
    this.updateCloudShadows(dt);
    this.updateDayNight();
    if (this.hintText && useGame.getState().flags.tutorialMove) {
      this.hintText.destroy();
      this.hintText = undefined;
    }
    if (this.targetMarker && this.targetMarker.visible) {
      this.targetMarker.setRotation(this.targetMarker.rotation + 0.002 * dt);
    }
  }

  private updateCloudShadows(dt: number): void {
    for (const c of this.cloudShadows) {
      const sp = c.getData('speed') as number;
      c.x += Math.cos(this.wind.state.dir) * sp * dt;
      c.y += Math.sin(this.wind.state.dir) * sp * dt;
      if (c.x > WORLD_W + 80) c.x = -80;
      if (c.x < -80) c.x = WORLD_W + 80;
      if (c.y > WORLD_H + 60) c.y = -60;
      if (c.y < -60) c.y = WORLD_H + 60;
    }
  }

  private updateWindArrows(): void {
    for (const a of this.windArrows) {
      a.setRotation(this.wind.state.dir);
      a.setAlpha(0.25 + this.wind.state.strength * 0.4);
    }
  }

  private updatePlayer(dt: number): void {
    if (this.target) {
      const dx = this.target.x - this.player.x;
      const dy = this.target.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        this.target = null;
        if (this.targetMarker) {
          this.tweens.add({ targets: this.targetMarker, alpha: 0, duration: 300, onComplete: () => this.targetMarker?.setVisible(false) });
        }
      } else {
        const desired = Math.atan2(dy, dx);
        const diff = Phaser.Math.Angle.Wrap(desired - this.heading);
        const turnRate = 0.002 * SHIPS[useGame.getState().ship.class].turn;
        this.heading += Phaser.Math.Clamp(diff, -turnRate * dt, turnRate * dt);
        const baseSpeed = 0.05 * SHIPS[useGame.getState().ship.class].speed;
        const sailFactor = useGame.getState().ship.sail / SHIPS[useGame.getState().ship.class].sailMax;
        const speed = baseSpeed * this.wind.speedFactor(this.heading) * (0.4 + 0.6 * sailFactor);
        const nextX = this.player.x + Math.cos(this.heading) * speed * dt;
        const nextY = this.player.y + Math.sin(this.heading) * speed * dt;
        // Sziget-csúszás: X és Y koordinátákat külön ellenőrizzük, így a part menti
        // csúszás lehetséges ahelyett hogy teljesen megállna
        let resolvedX = this.player.x;
        let resolvedY = this.player.y;
        const xBlocked = this.insideLand(nextX, this.player.y);
        const yBlocked = this.insideLand(this.player.x, nextY);
        if (!xBlocked) resolvedX = nextX;
        if (!yBlocked) resolvedY = nextY;
        if (xBlocked && yBlocked) {
          // Mindkét irányba akadály — kissé löködjük tengelyirányban az akadály felől
          const pushX = this.player.x - nextX;
          const pushY = this.player.y - nextY;
          resolvedX = this.player.x + Math.sign(pushX) * 0.3;
          resolvedY = this.player.y + Math.sign(pushY) * 0.3;
        }
        this.player.setPosition(
          Phaser.Math.Clamp(resolvedX, 6, WORLD_W - 6),
          Phaser.Math.Clamp(resolvedY, 6, WORLD_H - 6),
        );
        this.wakeAccum += dt;
        if (this.wakeAccum > 140) {
          this.wakeAccum = 0;
          this.spawnWake(this.player.x - Math.cos(this.heading) * 14, this.player.y - Math.sin(this.heading) * 14);
        }
      }
    }
    this.player.update(this.heading, this.wind.state.dir, this.lastDt);
  }

  private spawnWake(x: number, y: number): void {
    const w = this.add.image(x, y, 'wake').setDepth(4).setAlpha(0.7).setScale(0.8);
    this.wakes.push(w);
    this.tweens.add({
      targets: w,
      alpha: 0,
      scale: 0.2,
      duration: 1200,
      onComplete: () => {
        w.destroy();
        const idx = this.wakes.indexOf(w);
        if (idx >= 0) this.wakes.splice(idx, 1);
      },
    });
  }

  private updateWakes(_dt: number): void {
    /* tweens handle it */
  }

  private updateEnemies(dt: number): void {
    for (const e of this.enemies) {
      const nextX = e.ship.x + Math.cos(e.heading) * e.speed * (dt / 16);
      const nextY = e.ship.y + Math.sin(e.heading) * e.speed * (dt / 16);
      if (nextX < 20 || nextX > WORLD_W - 20 || nextY < 20 || nextY > WORLD_H - 20 || this.insideLand(nextX, nextY)) {
        e.heading = e.heading + Math.PI + (Math.random() - 0.5);
      } else {
        e.ship.setPosition(nextX, nextY);
        if (Math.random() < 0.002) e.heading += (Math.random() - 0.5) * 0.8;
      }
      e.ship.update(e.heading, this.wind.state.dir, dt);
    }
  }

  private updateEncounter(dt: number): void {
    if (this.encounterGrace > 0) {
      this.encounterGrace -= dt;
      return;
    }
    for (const e of this.enemies) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.ship.x, e.ship.y);
      const trigger = e.kind === 'merchant' ? 14 : 22;
      if (d < trigger) {
        this.triggerNavalEncounter(e);
        break;
      }
    }
  }

  private triggerNavalEncounter(e: Enemy): void {
    const idx = this.enemies.indexOf(e);
    if (idx >= 0) this.enemies.splice(idx, 1);
    e.ship.destroy();
    const dx = this.player.x - e.ship.x;
    const dy = this.player.y - e.ship.y;
    const len = Math.hypot(dx, dy) || 1;
    const backX = this.player.x + (dx / len) * 18;
    const backY = this.player.y + (dy / len) * 18;
    useGame.getState().setWorldPos({
      x: Phaser.Math.Clamp(backX, 20, WORLD_W - 20),
      y: Phaser.Math.Clamp(backY, 20, WORLD_H - 20),
      heading: this.heading,
    });
    this.scene.start('Encounter', { enemyKind: e.kind, enemyNation: e.nation });
  }

  private updatePortProximity(): void {
    let nearest: Port | null = null;
    let bestDist = 22;
    for (const p of PORTS) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
      if (d < bestDist) {
        bestDist = d;
        nearest = p;
      }
    }
    const id = nearest?.id ?? null;
    if (id !== this.nearPortId) {
      this.nearPortId = id;
      bus.emit('world:nearPort', id ? { portId: id } : null);
    }
  }
}
