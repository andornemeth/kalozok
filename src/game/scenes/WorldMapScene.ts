import Phaser from 'phaser';
import { PORTS, type Port, type NationId } from '@/game/data/ports';
import { WindSystem } from '@/game/systems/WindSystem';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { SHIPS } from '@/game/data/ships';

const WORLD_W = 820;
const WORLD_H = 620;

interface Enemy {
  sprite: Phaser.GameObjects.Image;
  heading: number;
  speed: number;
  kind: 'pirate' | 'navy' | 'merchant';
  nation: NationId;
}

export class WorldMapScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private heading = 0;
  private target: Phaser.Math.Vector2 | null = null;
  private wind = new WindSystem();
  private windArrows: Phaser.GameObjects.Image[] = [];
  private portMarkers: Phaser.GameObjects.Container[] = [];
  private enemies: Enemy[] = [];
  private minimap!: Phaser.GameObjects.RenderTexture;
  private minimapMask!: Phaser.GameObjects.Graphics;
  private nearPortId: string | null = null;
  private dayAccum = 0;
  private camTarget = new Phaser.Math.Vector2();

  constructor() {
    super('World');
  }

  create(): void {
    this.drawWater();
    this.drawLandMasses();
    this.spawnWindField();
    this.spawnPorts();
    this.spawnPlayer();
    this.spawnEnemies();
    this.setupCamera();
    this.setupInput();
    this.setupMinimap();
    bus.emit('scene:changed', { key: 'world' });
    bus.emit('world:nearPort', null);
  }

  private drawWater(): void {
    const g = this.add.graphics();
    g.fillStyle(0x0e4044, 1);
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    const wave = this.add.graphics();
    wave.lineStyle(1, 0x1a7f86, 0.35);
    for (let y = 10; y < WORLD_H; y += 18) {
      for (let x = 0; x < WORLD_W; x += 24) {
        wave.lineBetween(x, y, x + 12, y);
      }
    }
  }

  private drawLandMasses(): void {
    const g = this.add.graphics();
    g.fillStyle(0x6b4a2b, 1);
    const islands: [number, number, number, number][] = [
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
    for (const [x1, y1, x2, y2] of islands) {
      g.fillRoundedRect(x1, y1, x2 - x1, y2 - y1, 14);
    }
    const grass = this.add.graphics();
    grass.fillStyle(0x3a6d3a, 1);
    for (const [x1, y1, x2, y2] of islands) {
      grass.fillRoundedRect(x1 + 4, y1 + 4, x2 - x1 - 8, y2 - y1 - 8, 10);
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
      const marker = this.add.image(0, 0, this.portTexture(p.nation));
      const label = this.add
        .text(0, 14, p.name, {
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
    const start = PORTS[0]!;
    this.player = this.add.image(start.x + 40, start.y + 40, 'ship-player').setDepth(5);
    this.heading = -Math.PI / 4;
  }

  private spawnEnemies(): void {
    const rng = () => Math.random();
    for (let i = 0; i < 7; i++) {
      const kind = rng() < 0.5 ? 'merchant' : rng() < 0.5 ? 'pirate' : 'navy';
      const tex = kind === 'pirate' ? 'ship-enemy' : kind === 'navy' ? 'ship-navy' : 'ship-merchant';
      const nation = kind === 'pirate' ? 'pirate' : (['england', 'spain', 'france', 'netherlands'] as NationId[])[Math.floor(rng() * 4)]!;
      let x = 0;
      let y = 0;
      for (let t = 0; t < 30; t++) {
        x = 60 + rng() * (WORLD_W - 120);
        y = 60 + rng() * (WORLD_H - 120);
        if (!this.insideLand(x, y)) break;
      }
      const sprite = this.add.image(x, y, tex).setDepth(4);
      this.enemies.push({
        sprite,
        heading: rng() * Math.PI * 2,
        speed: 0.25 + rng() * 0.25,
        kind,
        nation,
      });
    }
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.camTarget.set(this.player.x, this.player.y);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(this.computeZoom());
    this.scale.on('resize', () => {
      this.cameras.main.setZoom(this.computeZoom());
      this.layoutMinimap();
    });
  }

  private computeZoom(): number {
    const w = this.scale.width;
    const h = this.scale.height;
    const targetTilesAcross = Math.min(w, h) < 500 ? 280 : 360;
    return Math.min(w, h) / targetTilesAcross;
  }

  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      if (this.insideLand(world.x, world.y)) return;
      this.target = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(world.x, 10, WORLD_W - 10),
        Phaser.Math.Clamp(world.y, 10, WORLD_H - 10),
      );
      useGame.getState().setFlag('tutorialMove', true);
    });
  }

  private setupMinimap(): void {
    this.minimap = this.add.renderTexture(0, 0, 140, 110).setScrollFactor(0).setDepth(50);
    this.minimap.setOrigin(0, 0);
    this.minimapMask = this.add.graphics().setScrollFactor(0).setDepth(49);
    this.layoutMinimap();
    this.refreshMinimap();
  }

  private layoutMinimap(): void {
    const margin = 8;
    this.minimap.setPosition(this.scale.width - 140 - margin, margin);
    this.minimapMask.clear();
    this.minimapMask.fillStyle(0x000000, 0.4);
    this.minimapMask.fillRoundedRect(this.minimap.x - 2, this.minimap.y - 2, 144, 114, 6);
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
    const islands: [number, number, number, number][] = [
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
    for (const [x1, y1, x2, y2] of islands) {
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
    const islands: [number, number, number, number][] = [
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
    for (const [x1, y1, x2, y2] of islands) {
      if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return true;
    }
    return false;
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs;
    this.wind.update(dt);
    this.updateWindArrows();
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateEncounter();
    this.updatePortProximity();
    this.dayAccum += dt;
    if (this.dayAccum > 2000) {
      this.dayAccum = 0;
      useGame.getState().advanceDays(1);
    }
    this.refreshMinimap();
  }

  private updateWindArrows(): void {
    for (const a of this.windArrows) {
      a.setRotation(this.wind.state.dir);
      a.setAlpha(0.25 + this.wind.state.strength * 0.4);
    }
  }

  private updatePlayer(dt: number): void {
    if (!this.target) return;
    const dx = this.target.x - this.player.x;
    const dy = this.target.y - this.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
      this.target = null;
      return;
    }
    const desired = Math.atan2(dy, dx);
    const diff = Phaser.Math.Angle.Wrap(desired - this.heading);
    const turnRate = 0.002 * SHIPS[useGame.getState().ship.class].turn;
    this.heading += Phaser.Math.Clamp(diff, -turnRate * dt, turnRate * dt);
    const baseSpeed = 0.05 * SHIPS[useGame.getState().ship.class].speed;
    const sailFactor = useGame.getState().ship.sail / SHIPS[useGame.getState().ship.class].sailMax;
    const speed = baseSpeed * this.wind.speedFactor(this.heading) * (0.4 + 0.6 * sailFactor);
    const nextX = this.player.x + Math.cos(this.heading) * speed * dt;
    const nextY = this.player.y + Math.sin(this.heading) * speed * dt;
    if (!this.insideLand(nextX, nextY)) {
      this.player.x = Phaser.Math.Clamp(nextX, 6, WORLD_W - 6);
      this.player.y = Phaser.Math.Clamp(nextY, 6, WORLD_H - 6);
    } else {
      this.target = null;
    }
    this.player.setRotation(this.heading + Math.PI / 2);
  }

  private updateEnemies(dt: number): void {
    for (const e of this.enemies) {
      const nextX = e.sprite.x + Math.cos(e.heading) * e.speed * (dt / 16);
      const nextY = e.sprite.y + Math.sin(e.heading) * e.speed * (dt / 16);
      if (nextX < 20 || nextX > WORLD_W - 20 || nextY < 20 || nextY > WORLD_H - 20 || this.insideLand(nextX, nextY)) {
        e.heading = e.heading + Math.PI + (Math.random() - 0.5);
      } else {
        e.sprite.x = nextX;
        e.sprite.y = nextY;
        if (Math.random() < 0.002) e.heading += (Math.random() - 0.5) * 0.8;
      }
      e.sprite.setRotation(e.heading + Math.PI / 2);
    }
  }

  private updateEncounter(): void {
    for (const e of this.enemies) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.sprite.x, e.sprite.y);
      if (d < 24 && e.kind !== 'merchant') {
        this.triggerNavalEncounter(e);
        break;
      } else if (d < 20 && e.kind === 'merchant') {
        this.triggerNavalEncounter(e);
        break;
      }
    }
  }

  private triggerNavalEncounter(e: Enemy): void {
    const idx = this.enemies.indexOf(e);
    if (idx >= 0) this.enemies.splice(idx, 1);
    e.sprite.destroy();
    this.scene.start('Naval', { enemyKind: e.kind, enemyNation: e.nation });
  }

  private updatePortProximity(): void {
    let nearest: Port | null = null;
    let bestDist = 18;
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

  enterNearestPort(): void {
    if (this.nearPortId) {
      useGame.getState().dockAt(this.nearPortId);
    }
  }
}
