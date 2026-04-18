import Phaser from 'phaser';
import { PORTS, WORLD_W, WORLD_H, type Port, type NationId, nationColor } from '@/game/data/ports';
import { RIVERS } from '@/game/data/rivers';
import { Audio } from '@/audio/AudioManager';
import { WindSystem } from '@/game/systems/WindSystem';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { SHIPS } from '@/game/data/ships';
import { ShipGraphic, type ShipTone } from '@/game/entities/ShipGraphic';
import { Particles } from '@/game/systems/Particles';

interface IslandShape {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  poly: Phaser.Geom.Polygon;
  hilly: boolean;
}

interface Enemy {
  ship: ShipGraphic;
  heading: number;
  speed: number;
  silhouette: 'small' | 'medium' | 'large';
  tone: ShipTone;
  kind: 'pirate' | 'navy' | 'merchant';
  nation: NationId;
  /** Squadron leader (null for solo). Followers requirement spacing around leader. */
  leader?: Enemy | null;
  followOffset?: Phaser.Math.Vector2;
}

// Pannon-tenger: az elárasztott Pannon-medencében csak a hátságok és
// kisebb hegységek állnak ki a vízből. A portok saját tanyájukon
// vannak (isLand port-csatornák adják hozzá), a nagy szigetek a
// Fruška gora, Versec-hegység, Deliblát, Papuk és a kisebb löszhátak.
const ISLAND_SEEDS: { cx: number; cy: number; rx: number; ry: number; jitter?: number; hilly?: boolean }[] = [
  // Fruška gora (Tarcal) — hosszú kelet-nyugati hegyhát Szerémségben
  { cx: 760, cy: 580, rx: 180, ry: 34, hilly: true },
  { cx: 580, cy: 590, rx: 120, ry: 30, hilly: true },
  // Papuk / Szlavóniai-középhegység — Eszéktől északra
  { cx: 150, cy: 640, rx: 120, ry: 40, hilly: true },
  { cx: 280, cy: 680, rx: 80, ry: 30, hilly: true },
  // Versec-hegység / Délkeleti-Bánság
  { cx: 1180, cy: 620, rx: 70, ry: 40, hilly: true },
  { cx: 1250, cy: 650, rx: 50, ry: 30, hilly: true },
  // Deliblát — homokbuckák és kis dombok
  { cx: 1050, cy: 750, rx: 110, ry: 40, hilly: false },
  { cx: 1160, cy: 760, rx: 60, ry: 30, hilly: false },
  // Titeli plató
  { cx: 920, cy: 500, rx: 40, ry: 28, hilly: true },
  // Zentai-löszhát — Pegya otthonát tartja a vízből
  { cx: 700, cy: 270, rx: 50, ry: 32, hilly: false },
  // Telecskai-hát — középső Bácska
  { cx: 580, cy: 340, rx: 90, ry: 28, hilly: false },
  { cx: 640, cy: 370, rx: 60, ry: 22, hilly: false },
  // Báni-hát — Szabadkai homokhátság
  { cx: 520, cy: 200, rx: 70, ry: 25 },
  // Bácskai északi hátak Baja körül
  { cx: 270, cy: 170, rx: 55, ry: 28 },
  // Szeged-környéki homokhátság
  { cx: 630, cy: 120, rx: 60, ry: 25 },
  // Temesi-hátság — Bánság belseje
  { cx: 1250, cy: 340, rx: 90, ry: 30, hilly: true },
  { cx: 1380, cy: 370, rx: 70, ry: 28, hilly: true },
  // Lugos-Karánsebes kishegyek
  { cx: 1470, cy: 450, rx: 60, ry: 30, hilly: true },
  // Eszék-sziget
  { cx: 120, cy: 530, rx: 50, ry: 25 },
  // Vukovár-sziget — Dráva-torkolat magasabb része
  { cx: 320, cy: 600, rx: 55, ry: 25 },
  // Nándorfehérvár-Zimony sziklasziget — Száva-Duna-torok
  { cx: 840, cy: 960, rx: 80, ry: 40, hilly: true },
  { cx: 920, cy: 900, rx: 50, ry: 28 },
  // Apró láncszigetek a Duna mentén (régi ártéri dombok)
  { cx: 450, cy: 440, rx: 28, ry: 18 },
  { cx: 820, cy: 420, rx: 24, ry: 16 },
  { cx: 1000, cy: 540, rx: 26, ry: 18 },
];

export class WorldMapScene extends Phaser.Scene {
  private player!: ShipGraphic;
  private heading = 0;
  private target: Phaser.Math.Vector2 | null = null;
  private targetMarker?: Phaser.GameObjects.Image;
  private wind = new WindSystem();
  private windHud!: Phaser.GameObjects.Container;
  private compass!: Phaser.GameObjects.Image;
  private compassNeedle!: Phaser.GameObjects.Graphics;
  private windText!: Phaser.GameObjects.Text;
  private islands: IslandShape[] = [];
  private portMarkers: Phaser.GameObjects.Container[] = [];
  private enemies: Enemy[] = [];
  private minimap!: Phaser.GameObjects.RenderTexture;
  private minimapBg!: Phaser.GameObjects.Graphics;
  private minimapAccum = 0;
  private nearPortId: string | null = null;
  private dayAccum = 0;
  private wakeAccum = 0;
  private cloudShadows: Phaser.GameObjects.Image[] = [];
  private waveCrests: Phaser.GameObjects.Image[] = [];
  private encounterGrace = 2200;
  private saveTimer = 0;
  private ambientAccum = 0;
  private ambientNextAt = 6000;
  private hintText?: Phaser.GameObjects.Text;
  private dayLabel!: Phaser.GameObjects.Text;
  private spawnTimer = 0;

  constructor() {
    super('World');
  }

  create(): void {
    this.input.removeAllListeners();
    this.cameras.main.setBackgroundColor('#062a2e');
    this.generateIslands();
    this.drawWater();
    this.drawRivers();
    this.drawLandMasses();
    this.spawnWaveCrests();
    this.spawnCloudShadows();
    this.spawnFog();
    this.spawnPorts();
    this.spawnPlayer();
    this.spawnInitialEnemies();
    this.setupCamera();
    this.setupInput();
    this.setupMinimap();
    this.setupCompassHud();
    this.setupDayNight();
    this.showFirstTimeHint();
    this.setupFastTravel();
    this.cameras.main.fadeIn(380, 4, 20, 26);
    bus.emit('scene:changed', { key: 'world' });
    bus.emit('world:nearPort', null);
  }

  private fastTravelHandler: ((p: { portId: string }) => void) | null = null;
  private setupFastTravel(): void {
    if (this.fastTravelHandler) bus.off('world:fastTravel', this.fastTravelHandler);
    this.fastTravelHandler = ({ portId }) => {
      const port = PORTS.find((p) => p.id === portId);
      if (!port) return;
      const angle = Math.random() * Math.PI * 2;
      let tx = port.x + Math.cos(angle) * 60;
      let ty = port.y + Math.sin(angle) * 60;
      for (let r = 60; r < 200 && this.isLand(tx, ty); r += 20) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          const cx = port.x + Math.cos(a) * r;
          const cy = port.y + Math.sin(a) * r;
          if (!this.isLand(cx, cy)) { tx = cx; ty = cy; break; }
        }
      }
      this.player.setPosition(tx, ty);
      this.heading = Math.atan2(port.y - ty, port.x - tx);
      this.cameras.main.flash(260, 224, 178, 79);
      this.cameras.main.centerOn(tx, ty);
      useGame.getState().setWorldPos({ x: tx, y: ty, heading: this.heading });
      bus.emit('world:nearPort', { portId });
    };
    bus.on('world:fastTravel', this.fastTravelHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.fastTravelHandler) bus.off('world:fastTravel', this.fastTravelHandler);
      this.fastTravelHandler = null;
    });
  }

  // --- Sziget generálás ---

  private generateIslands(): void {
    this.islands = ISLAND_SEEDS.map((s) => {
      const steps = Math.max(16, Math.floor((s.rx + s.ry) / 6));
      const pts: { x: number; y: number }[] = [];
      const seed = s.cx * 0.013 + s.cy * 0.017;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const noise =
          0.86 +
          0.18 * Math.sin(a * 3 + seed) +
          0.12 * Math.cos(a * 5 + seed * 1.3) +
          0.08 * Math.sin(a * 7 + seed * 0.5);
        pts.push({ x: s.cx + Math.cos(a) * s.rx * noise, y: s.cy + Math.sin(a) * s.ry * noise });
      }
      const poly = new Phaser.Geom.Polygon(pts);
      return { cx: s.cx, cy: s.cy, rx: s.rx, ry: s.ry, poly, hilly: !!s.hilly };
    });
  }

  // --- Festés ---

  private drawWater(): void {
    // Csempézett víz alap
    const tile = this.textures.get('wave-tile').getSourceImage() as HTMLImageElement;
    const tileW = tile.width;
    const tileH = tile.height;
    for (let y = 0; y < WORLD_H; y += tileH) {
      for (let x = 0; x < WORLD_W; x += tileW) {
        this.add.image(x, y, 'wave-tile').setOrigin(0, 0).setDepth(0);
      }
    }
  }

  private spawnWaveCrests(): void {
    // Apró fehér hullámcsúcsok véletlenszerű elhelyezésben — animált
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * WORLD_W;
      const y = Math.random() * WORLD_H;
      if (this.isLand(x, y)) continue;
      const c = this.add.image(x, y, 'wave-crest').setDepth(1).setAlpha(0);
      this.waveCrests.push(c);
      this.tweens.add({
        targets: c,
        alpha: { from: 0, to: 0.8 },
        duration: 1100 + Math.random() * 800,
        repeat: -1,
        yoyo: true,
        delay: Math.random() * 2000,
      });
    }
  }

  private drawRivers(): void {
    // Folyók — Tisza, Duna, Száva, Temes, Béga. Enyhén világosabb sáv
    // a vízen, mely az áramlás mentén visszaadja a Pannon-medence
    // egykori folyóhálózatát.
    const riverLayer = this.add.graphics().setDepth(1.2);
    const labelFont = {
      fontFamily: 'Cormorant Garamond, serif',
      fontSize: '18px',
      color: '#bfe2e4',
      fontStyle: 'italic',
      stroke: '#04141a',
      strokeThickness: 3,
    } as const;

    for (const r of RIVERS) {
      // Külső halványabb sáv — "szél"
      riverLayer.lineStyle(22, r.color, 0.22);
      riverLayer.beginPath();
      riverLayer.moveTo(r.points[0]!.x, r.points[0]!.y);
      for (let i = 1; i < r.points.length; i++) {
        riverLayer.lineTo(r.points[i]!.x, r.points[i]!.y);
      }
      riverLayer.strokePath();
      // Belső fényesebb vonal — "élő áram"
      riverLayer.lineStyle(8, r.color, 0.55);
      riverLayer.beginPath();
      riverLayer.moveTo(r.points[0]!.x, r.points[0]!.y);
      for (let i = 1; i < r.points.length; i++) {
        riverLayer.lineTo(r.points[i]!.x, r.points[i]!.y);
      }
      riverLayer.strokePath();

      // Áramlási particle-k — fehér pöttyök lassan csúsznak végig
      for (let i = 0; i < 4; i++) {
        this.spawnRiverParticle(r.points, i / 4);
      }

      // Címke
      const label = r.points[r.labelIndex];
      if (label) {
        this.add.text(label.x, label.y - 18, r.name, labelFont)
          .setOrigin(0.5).setDepth(1.3).setAlpha(0.85);
      }
    }
  }

  private spawnRiverParticle(points: { x: number; y: number }[], startT: number): void {
    const dot = this.add.circle(points[0]!.x, points[0]!.y, 2, 0xfbf5e3, 0.75).setDepth(1.4);
    const segments: { x1: number; y1: number; x2: number; y2: number; len: number }[] = [];
    let totalLen = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1]!.x - points[i]!.x;
      const dy = points[i + 1]!.y - points[i]!.y;
      const len = Math.hypot(dx, dy);
      segments.push({ x1: points[i]!.x, y1: points[i]!.y, x2: points[i + 1]!.x, y2: points[i + 1]!.y, len });
      totalLen += len;
    }
    const posAt = (lenIn: number) => {
      let remaining = lenIn;
      for (const s of segments) {
        if (remaining <= s.len) {
          const f = remaining / s.len;
          return { x: s.x1 + (s.x2 - s.x1) * f, y: s.y1 + (s.y2 - s.y1) * f };
        }
        remaining -= s.len;
      }
      const last = segments[segments.length - 1]!;
      return { x: last.x2, y: last.y2 };
    };
    // Egyetlen ciklikus tween: a t 0-tól totalLen-ig megy, 18 ms/px
    const state = { t: startT * totalLen };
    this.tweens.add({
      targets: state,
      t: startT * totalLen + totalLen,
      duration: totalLen * 18,
      repeat: -1,
      onUpdate: () => {
        const cur = state.t % totalLen;
        const p = posAt(cur);
        dot.setPosition(p.x, p.y);
      },
    });
  }

  private drawLandMasses(): void {
    // Délvidéki rétegek: iszapos nádas (part), zsenge fű, erdő-foltok
    const shoreLayer = this.add.graphics().setDepth(2);   // partszéli tőzeg
    const grassLayer = this.add.graphics().setDepth(2);
    const forestLayer = this.add.graphics().setDepth(2);

    for (const isl of this.islands) {
      const pts = isl.poly.points;
      // Legkülső réteg — sáros nádas-part
      shoreLayer.fillStyle(0x8a7a4a, 1);
      shoreLayer.fillPoints(pts, true);
      // Fű — zsenge tavaszi-zöld (kissé a sárgás felé)
      const inner1 = pts.map((p) => ({ x: isl.cx + (p.x - isl.cx) * 0.86, y: isl.cy + (p.y - isl.cy) * 0.86 }));
      grassLayer.fillStyle(0x7aa33d, 1);
      grassLayer.fillPoints(inner1, true);
      // Erdő — sűrű pannon erdő
      const inner2 = pts.map((p) => ({ x: isl.cx + (p.x - isl.cx) * 0.62, y: isl.cy + (p.y - isl.cy) * 0.62 }));
      forestLayer.fillStyle(0x2f5a2f, 1);
      forestLayer.fillPoints(inner2, true);

      // === Fák szórás — gyümölcsfák, jegenyék, fűzfák ===
      const treeCount = Math.max(2, Math.floor((isl.rx * isl.ry) / 1200));
      for (let i = 0; i < treeCount; i++) {
        const angle = (i / treeCount) * Math.PI * 2 + Math.random();
        const r = 0.78;
        const px = isl.cx + Math.cos(angle) * isl.rx * r * (0.7 + Math.random() * 0.3);
        const py = isl.cy + Math.sin(angle) * isl.ry * r * (0.7 + Math.random() * 0.3);
        if (this.isLand(px, py)) {
          const roll = Math.random();
          const tex =
            roll < 0.35 ? 'palm' :
            roll < 0.55 ? 'palm-large' :
            roll < 0.75 ? 'willow' :
            'akacfa';
          this.add.image(px, py, tex).setDepth(3);
        }
      }

      // === Nádas a partvonalon ===
      const reedCount = Math.max(3, Math.floor((isl.rx + isl.ry) / 22));
      for (let i = 0; i < reedCount; i++) {
        const a = (i / reedCount) * Math.PI * 2 + Math.random() * 0.4;
        const rr = 0.98 + Math.random() * 0.08;
        const rx = isl.cx + Math.cos(a) * isl.rx * rr;
        const ry = isl.cy + Math.sin(a) * isl.ry * rr;
        this.add.image(rx, ry, 'reed-cluster').setDepth(2.3).setAlpha(0.85);
      }

      // === Sok ikonikus tájelem a szigeteken ===
      // Nagyobb szigeteken arányosan több, 40-80% eséllyel mindegyik.
      const areaScore = (isl.rx * isl.ry) / 1000; // 0.5-7 között

      // Gémeskút — nagyon magyar
      const gemesCount = areaScore > 3 ? 2 : areaScore > 1.5 ? 1 : (Math.random() < 0.6 ? 1 : 0);
      for (let i = 0; i < gemesCount; i++) {
        const gx = isl.cx + (Math.random() - 0.5) * isl.rx * 0.7;
        const gy = isl.cy + (Math.random() - 0.5) * isl.ry * 0.7;
        if (this.isLand(gx, gy)) this.add.image(gx, gy, 'gemeskut').setDepth(3.3);
      }

      // Szénakazal — több is
      const hayCount = areaScore > 2 ? 2 + Math.floor(Math.random() * 2) : 1;
      for (let i = 0; i < hayCount; i++) {
        const hx = isl.cx + (Math.random() - 0.5) * isl.rx * 0.8;
        const hy = isl.cy + (Math.random() - 0.5) * isl.ry * 0.8;
        if (this.isLand(hx, hy)) this.add.image(hx, hy, 'szenakazal').setDepth(3.1);
      }

      // Tanya + hozzá gólyafészek kémény
      if (isl.rx > 45 && Math.random() < 0.6) {
        const tx = isl.cx + (Math.random() - 0.5) * isl.rx * 0.5;
        const ty = isl.cy + (Math.random() - 0.5) * isl.ry * 0.5;
        if (this.isLand(tx, ty)) {
          this.add.image(tx, ty, 'tanya-hut').setDepth(3.2);
          // Gólyafészek a tanya kéményén 70%
          if (Math.random() < 0.7) {
            this.add.image(tx + 4, ty - 10, 'golyafeszek').setDepth(3.4);
          }
        }
      }

      // Szélmalom — dombos vagy nagyobb szigeteken
      if (isl.rx > 60 && Math.random() < 0.5) {
        const sx = isl.cx + (Math.random() - 0.5) * isl.rx * 0.7;
        const sy = isl.cy + (Math.random() - 0.5) * isl.ry * 0.6;
        if (this.isLand(sx, sy)) this.add.image(sx, sy, 'szelmalom').setDepth(3.2);
      }

      // Napraforgó- vagy kukorica-tábla
      if (Math.random() < 0.5) {
        const fx = isl.cx + (Math.random() - 0.5) * isl.rx * 0.75;
        const fy = isl.cy + (Math.random() - 0.5) * isl.ry * 0.75;
        if (this.isLand(fx, fy)) {
          this.add.image(fx, fy, Math.random() < 0.5 ? 'sunflower-field' : 'kukoricas').setDepth(3.05);
        }
      }

      // Birkanyáj — legelőt szimbolizál
      if (Math.random() < 0.4) {
        const bx = isl.cx + (Math.random() - 0.5) * isl.rx * 0.75;
        const by = isl.cy + (Math.random() - 0.5) * isl.ry * 0.75;
        if (this.isLand(bx, by)) this.add.image(bx, by, 'birkanyaj').setDepth(3.15);
      }

      // Fakereszt — útszéli, kisebb szigeten is
      if (Math.random() < 0.35) {
        const kx = isl.cx + (Math.random() - 0.5) * isl.rx * 0.85;
        const ky = isl.cy + (Math.random() - 0.5) * isl.ry * 0.85;
        if (this.isLand(kx, ky)) this.add.image(kx, ky, 'fakereszt').setDepth(3.1);
      }

      // === Hegy / dombsziluett ===
      if (isl.hilly && isl.rx > 60) {
        const hillCount = Math.max(1, Math.floor(isl.rx / 60));
        for (let i = 0; i < hillCount; i++) {
          const dx = (i - (hillCount - 1) / 2) * 28;
          this.add.image(isl.cx + dx, isl.cy - 4, i % 2 === 0 ? 'hill-1' : 'hill-2').setDepth(3);
        }
        if (Math.random() < 0.5) {
          const vx = isl.cx + (Math.random() - 0.5) * isl.rx * 0.5;
          const vy = isl.cy + (Math.random() - 0.5) * isl.ry * 0.5;
          if (this.isLand(vx, vy)) this.add.image(vx, vy, 'vineyard').setDepth(3.1);
        }
      }

      // === Sziklák part mentén ===
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        const rx = isl.cx + Math.cos(a) * isl.rx * 0.95;
        const ry = isl.cy + Math.sin(a) * isl.ry * 0.95;
        if (!this.isLand(rx, ry)) this.add.image(rx, ry, 'rock').setDepth(2.5);
      }
    }
  }

  private spawnCloudShadows(): void {
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * WORLD_W;
      const y = Math.random() * WORLD_H;
      const s = this.add.image(x, y, 'cloud-shadow').setDepth(7).setAlpha(0.55);
      s.setScale(0.8 + Math.random() * 0.8);
      s.setData('speed', 0.012 + Math.random() * 0.012);
      this.cloudShadows.push(s);
    }
  }

  private fogPatches: Phaser.GameObjects.Image[] = [];
  private spawnFog(): void {
    // 12 köd-folt a vízen — lassan sodródik a széllel, alpha lüktet
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * WORLD_W;
      const y = Math.random() * WORLD_H;
      const f = this.add.image(x, y, 'fog-patch').setDepth(6).setAlpha(0);
      f.setScale(0.6 + Math.random() * 0.9);
      f.setData('driftSpeed', 0.008 + Math.random() * 0.012);
      // Lüktető átlátszóság — köd finoman sűrűsödik/ritkul
      const base = 0.45 + Math.random() * 0.25;
      this.tweens.add({
        targets: f,
        alpha: { from: base * 0.35, to: base },
        duration: 4000 + Math.random() * 3000,
        yoyo: true,
        repeat: -1,
      });
      this.fogPatches.push(f);
    }
  }

  private spawnPorts(): void {
    for (const p of PORTS) {
      const c = this.add.container(p.x, p.y);
      const marker = this.add.image(0, 0, this.portTexture(p.nation)).setOrigin(0.5, 0.85);
      const label = this.add
        .text(0, 6, p.name, {
          fontFamily: '"Press Start 2P"',
          fontSize: '8px',
          color: '#fbf5e3',
          stroke: '#04141a',
          strokeThickness: 3,
          resolution: 2,
        })
        .setOrigin(0.5, 0);
      const items: Phaser.GameObjects.GameObject[] = [marker, label];
      if (p.size === 'large' || p.size === 'capital') {
        const fortIcon = this.add.image(-14, -4, 'fort-icon').setOrigin(0.5, 1);
        items.unshift(fortIcon);
      }
      // Templomtorony a nagyobb keresztény portokhoz (nem oszmán)
      if ((p.size === 'capital' || p.size === 'large') && p.nation !== 'oszman' && p.nation !== 'crnagorac') {
        const tower = this.add.image(14, -4, 'templomtorony').setOrigin(0.5, 1);
        items.unshift(tower);
      }
      if (p.homePort) {
        const sun = this.add.image(0, -30, 'sunflower-emblem').setOrigin(0.5, 0.5);
        this.tweens.add({
          targets: sun,
          scale: { from: 0.9, to: 1.1 },
          yoyo: true,
          repeat: -1,
          duration: 1500,
          ease: 'Sine.easeInOut',
        });
        items.unshift(sun);
      }
      c.add(items);
      c.setDepth(4);
      this.portMarkers.push(c);
    }
  }

  private portTexture(n: NationId): string {
    return ({
      magyar: 'port-magyar',
      rac: 'port-rac',
      bunyevac: 'port-bunyevac',
      olah: 'port-olah',
      tot: 'port-tot',
      oszman: 'port-oszman',
      svab: 'port-svab',
      crnagorac: 'port-crnagorac',
    } as const)[n];
  }

  private spawnPlayer(): void {
    const saved = useGame.getState().worldPos;
    const start = PORTS.find((p) => p.homePort) ?? PORTS[0]!;
    let x = saved?.x ?? start.x;
    let y = saved?.y ?? start.y + 80;
    if (saved == null) {
      // Keressünk biztos tengeri helyet a kezdő kikötő körül
      for (let r = 80; r < 220 && this.isLand(x, y); r += 20) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          const tx = start.x + Math.cos(a) * r;
          const ty = start.y + Math.sin(a) * r;
          if (!this.isLand(tx, ty)) {
            x = tx;
            y = ty;
            break;
          }
        }
      }
    }
    const cls = useGame.getState().ship.class;
    this.player = new ShipGraphic(this, x, y, {
      tone: 'player',
      silhouette: SHIPS[cls].silhouette,
      scale: 0.32,
    });
    this.player.setDepth(6);
    this.heading = saved?.heading ?? 0;
  }

  private spawnInitialEnemies(): void {
    for (let i = 0; i < 5; i++) this.spawnEnemy();
    // Konvoj — 1-2 csoport
    for (let i = 0; i < 2; i++) this.spawnConvoy();
  }

  private spawnEnemy(): Enemy | null {
    const r = Math.random();
    const kind: 'merchant' | 'pirate' | 'navy' = r < 0.45 ? 'merchant' : r < 0.75 ? 'pirate' : 'navy';
    const tone: ShipTone = kind === 'pirate' ? 'enemy' : kind === 'navy' ? 'navy' : 'merchant';
    const silhouette: 'small' | 'medium' | 'large' =
      kind === 'merchant' ? (Math.random() < 0.6 ? 'medium' : 'large') :
      kind === 'navy' ? (Math.random() < 0.5 ? 'medium' : 'large') :
      (Math.random() < 0.7 ? 'small' : 'medium');
    const nation: NationId = kind === 'pirate' ? 'crnagorac'
      : (['magyar', 'rac', 'bunyevac', 'olah', 'tot', 'oszman', 'svab'] as NationId[])[Math.floor(Math.random() * 7)]!;
    const pos = this.findOpenSeaSpot();
    if (!pos) return null;
    const ship = new ShipGraphic(this, pos.x, pos.y, { tone, silhouette, scale: 0.24 });
    ship.setDepth(5);
    const e: Enemy = {
      ship, kind, tone, silhouette, nation,
      heading: Math.random() * Math.PI * 2,
      speed: 0.18 + Math.random() * 0.22,
      leader: null,
    };
    this.enemies.push(e);
    return e;
  }

  private spawnConvoy(): void {
    const leader = this.spawnEnemy();
    if (!leader) return;
    leader.kind = 'merchant';
    const followers = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < followers; i++) {
      const offset = new Phaser.Math.Vector2((i + 1) * 22, (i % 2 === 0 ? 1 : -1) * 14);
      const ship = new ShipGraphic(this, leader.ship.x + offset.x, leader.ship.y + offset.y, {
        tone: leader.tone, silhouette: leader.silhouette, scale: 0.22,
      });
      ship.setDepth(5);
      this.enemies.push({
        ship, kind: leader.kind, tone: leader.tone, silhouette: leader.silhouette, nation: leader.nation,
        heading: leader.heading, speed: leader.speed, leader, followOffset: offset,
      });
    }
  }

  private findOpenSeaSpot(): { x: number; y: number } | null {
    for (let t = 0; t < 40; t++) {
      const x = 80 + Math.random() * (WORLD_W - 160);
      const y = 80 + Math.random() * (WORLD_H - 160);
      if (!this.isLand(x, y) && this.distanceFromPlayer(x, y) > 200) return { x, y };
    }
    return null;
  }

  private distanceFromPlayer(x: number, y: number): number {
    if (!this.player) return 9999;
    return Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
  }

  // --- Kollízió ---

  isLand(x: number, y: number): boolean {
    // A kikötők természetes csatornái — a markert körülvevő ~32px sugarú
    // területen a víznek számít, hogy a játékos behajózhasson dokkolni.
    for (const p of PORTS) {
      const d = Phaser.Math.Distance.Between(x, y, p.x, p.y);
      if (d < 32) return false;
    }
    for (const isl of this.islands) {
      if (Math.abs(x - isl.cx) > isl.rx * 1.1 || Math.abs(y - isl.cy) > isl.ry * 1.1) continue;
      if (Phaser.Geom.Polygon.Contains(isl.poly, x, y)) return true;
    }
    return false;
  }

  // --- Kamera ---

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player.container, true, 0.08, 0.08);
    this.cameras.main.setZoom(this.computeZoom());
    this.scale.on('resize', () => {
      this.cameras.main.setZoom(this.computeZoom());
      this.layoutMinimap();
      this.layoutCompass();
    });
  }

  private computeZoom(): number {
    const w = this.scale.width;
    const h = this.scale.height;
    const small = Math.min(w, h);
    const big = Math.max(w, h);
    // Cél: ~280-450 logikai pixel látszódjon a rövidebb tengelyen
    const target = small < 500 ? 280 : small < 900 ? 360 : 460;
    return Math.min(2.4, Math.max(0.45, small / target * (big < 700 ? 0.95 : 1)));
  }

  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const topDead = 56;
      const bottomDead = this.scale.height - 72;
      if (p.y < topDead || p.y > bottomDead) return;
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      if (this.isLand(world.x, world.y)) {
        this.flashHint('Az nem víz!');
        return;
      }
      this.target = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(world.x, 8, WORLD_W - 8),
        Phaser.Math.Clamp(world.y, 8, WORLD_H - 8),
      );
      this.showTargetMarker(this.target.x, this.target.y);
      useGame.getState().setFlag('tutorialMove', true);
    });
  }

  private flashHint(msg: string): void {
    if (!this.hintText) {
      this.hintText = this.add
        .text(this.scale.width / 2, this.scale.height / 2, msg, {
          fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#fbf5e3',
          stroke: '#04141a', strokeThickness: 4, align: 'center',
        })
        .setOrigin(0.5).setScrollFactor(0).setDepth(60);
    } else {
      this.hintText.setText(msg).setAlpha(1);
    }
    this.tweens.killTweensOf(this.hintText);
    this.tweens.add({ targets: this.hintText, alpha: 0, duration: 1400, delay: 400 });
  }

  private showTargetMarker(x: number, y: number): void {
    if (!this.targetMarker) {
      this.targetMarker = this.add.image(x, y, 'target-marker').setDepth(8);
    } else {
      this.targetMarker.setPosition(x, y).setVisible(true).setAlpha(1);
    }
    this.tweens.killTweensOf(this.targetMarker);
    this.targetMarker.setScale(1.6);
    this.tweens.add({ targets: this.targetMarker, scale: 1, duration: 250, ease: 'Back.out' });
  }

  // --- HUD ---

  private setupCompassHud(): void {
    this.windHud = this.add.container(0, 0).setScrollFactor(0).setDepth(50);
    this.compass = this.add.image(0, 0, 'compass-rose').setOrigin(0.5);
    this.compassNeedle = this.add.graphics();
    this.windText = this.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#fbf5e3',
      stroke: '#04141a', strokeThickness: 3,
    }).setOrigin(0.5);
    this.dayLabel = this.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#e0b24f',
      stroke: '#04141a', strokeThickness: 3,
    }).setOrigin(0.5);
    this.windHud.add([this.compass, this.compassNeedle, this.windText, this.dayLabel]);
    this.layoutCompass();
  }

  private layoutCompass(): void {
    const margin = 8;
    const x = margin + 36;
    const y = margin + 80;
    this.windHud.setPosition(x, y);
  }

  private updateCompass(): void {
    const g = this.compassNeedle;
    g.clear();
    // Szélirány nyíl (innen fúj — a hajó számára szembe)
    const blowTo = this.wind.state.dir + Math.PI;
    const len = 22;
    const x = Math.cos(blowTo) * len;
    const y = Math.sin(blowTo) * len;
    g.lineStyle(3, 0x4f8bff, 1);
    g.lineBetween(0, 0, x, y);
    // Hajó-irány jelölés (zöld)
    const hx = Math.cos(this.heading) * 18;
    const hy = Math.sin(this.heading) * 18;
    g.lineStyle(2, 0x88e07b, 1);
    g.lineBetween(0, 0, hx, hy);
    // Erősség
    this.windText.setText(`SZÉL ${Math.round(this.wind.state.strength * 100)}%`);
    this.windText.setPosition(0, 36);
    const days = useGame.getState().career.daysAtSea;
    this.dayLabel.setText(`${days}. nap`);
    this.dayLabel.setPosition(0, -34);
  }

  private setupMinimap(): void {
    this.minimapBg = this.add.graphics().setScrollFactor(0).setDepth(49);
    this.minimap = this.add.renderTexture(0, 0, 156, 110).setScrollFactor(0).setDepth(50).setOrigin(0, 0);
    this.layoutMinimap();
    this.refreshMinimap();
  }

  private layoutMinimap(): void {
    const margin = 8;
    const x = this.scale.width - 156 - margin;
    const y = margin + 56;
    this.minimap.setPosition(x, y);
    this.minimapBg.clear();
    this.minimapBg.fillStyle(0x04141a, 0.7);
    this.minimapBg.fillRoundedRect(x - 3, y - 3, 162, 116, 6);
    this.minimapBg.lineStyle(1, 0xe0b24f, 0.6);
    this.minimapBg.strokeRoundedRect(x - 3, y - 3, 162, 116, 6);
  }

  private refreshMinimap(): void {
    const rt = this.minimap;
    rt.clear();
    const sx = rt.width / WORLD_W;
    const sy = rt.height / WORLD_H;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x062a2e, 1);
    g.fillRect(0, 0, rt.width, rt.height);
    g.fillStyle(0x6b8f3d, 1);
    for (const isl of this.islands) {
      g.fillEllipse(isl.cx * sx, isl.cy * sy, isl.rx * 2 * sx, isl.ry * 2 * sy);
    }
    for (const p of PORTS) {
      g.fillStyle(nationColor(p.nation), 1);
      g.fillCircle(p.x * sx, p.y * sy, 2);
    }
    for (const e of this.enemies) {
      g.fillStyle(e.kind === 'pirate' ? 0xff6a3d : e.kind === 'navy' ? 0x4f8bff : 0xc6d5ee, 1);
      g.fillRect(e.ship.x * sx - 1, e.ship.y * sy - 1, 2, 2);
    }
    g.fillStyle(0xe0b24f, 1);
    g.fillCircle(this.player.x * sx, this.player.y * sy, 3);
    rt.draw(g);
    g.destroy();
  }

  // --- Day/night ---
  //
  // Korábban egy 4 napos (valós időben ~9 másodperces) ciklus sötét kék
  // overlay-jel elszürkítette a térképet. A gyors villogás zavaró volt,
  // ezért kikapcsolva — ha kell, később normális nappali/éjszakai ciklust
  // építünk (pl. 60 napos időléptékkel).

  private setupDayNight(): void {
    // szándékosan üres
  }

  private updateDayNight(): void {
    // szándékosan üres
  }

  // --- Tutorial ---

  private showFirstTimeHint(): void {
    if (useGame.getState().flags.tutorialMove) return;
    this.hintText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 40, 'Érints a tengerbe\nhogy odavitorlázz', {
        fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#fbf5e3',
        align: 'center', stroke: '#04141a', strokeThickness: 4,
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(50);
    this.tweens.add({
      targets: this.hintText, alpha: { from: 1, to: 0.5 },
      yoyo: true, repeat: -1, duration: 900,
    });
    this.time.delayedCall(6000, () => {
      this.hintText?.destroy();
      this.hintText = undefined;
    });
  }

  // --- Update loop ---

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs;
    this.wind.update(dt);
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateEncounter(dt);
    this.updatePortProximity();
    if (this.saveTimer > 600) {
      this.saveTimer = 0;
      useGame.getState().setWorldPos({ x: this.player.x, y: this.player.y, heading: this.heading });
    } else {
      this.saveTimer += dt;
    }
    this.dayAccum += dt;
    if (this.dayAccum > 2200) {
      this.dayAccum = 0;
      useGame.getState().advanceDays(1);
    }
    this.minimapAccum += dt;
    if (this.minimapAccum > 500) {
      this.minimapAccum = 0;
      this.refreshMinimap();
    }
    this.ambientAccum += dt;
    if (this.ambientAccum > this.ambientNextAt) {
      this.ambientAccum = 0;
      this.ambientNextAt = 8000 + Math.random() * 7000;
      this.playRegionalAmbient();
    }
    this.spawnTimer += dt;
    if (this.spawnTimer > 8000 && this.enemies.length < 12) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }
    this.updateCloudShadows(dt);
    this.updateFog(dt);
    this.updateDayNight();
    this.updateCompass();
    if (this.hintText && useGame.getState().flags.tutorialMove && !this.target) {
      // ne foglalkozzon vele tovább
    }
    if (this.targetMarker && this.targetMarker.visible) {
      this.targetMarker.setRotation(this.targetMarker.rotation + 0.002 * dt);
    }
  }

  private updateCloudShadows(dt: number): void {
    const dir = this.wind.state.dir + Math.PI;
    for (const c of this.cloudShadows) {
      const sp = c.getData('speed') as number;
      c.x += Math.cos(dir) * sp * dt;
      c.y += Math.sin(dir) * sp * dt;
      if (c.x > WORLD_W + 80) c.x = -80;
      if (c.x < -80) c.x = WORLD_W + 80;
      if (c.y > WORLD_H + 60) c.y = -60;
      if (c.y < -60) c.y = WORLD_H + 60;
    }
  }

  private updateFog(dt: number): void {
    // Köd a szél irányával megegyezően sodródik, kicsit lassabban mint a felhőárnyékok
    const dir = this.wind.state.dir + Math.PI;
    for (const f of this.fogPatches) {
      const sp = f.getData('driftSpeed') as number;
      f.x += Math.cos(dir) * sp * dt;
      f.y += Math.sin(dir) * sp * dt;
      if (f.x > WORLD_W + 120) f.x = -120;
      if (f.x < -120) f.x = WORLD_W + 120;
      if (f.y > WORLD_H + 100) f.y = -100;
      if (f.y < -100) f.y = WORLD_H + 100;
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
          this.tweens.add({
            targets: this.targetMarker, alpha: 0, duration: 300,
            onComplete: () => this.targetMarker?.setVisible(false),
          });
        }
      } else {
        const desired = Math.atan2(dy, dx);
        const diff = Phaser.Math.Angle.Wrap(desired - this.heading);
        const cls = useGame.getState().ship.class;
        const turnRate = 0.0021 * SHIPS[cls].turn;
        this.heading += Phaser.Math.Clamp(diff, -turnRate * dt, turnRate * dt);
        const baseSpeed = 0.058 * SHIPS[cls].speed;
        const sailFactor = useGame.getState().ship.sail / SHIPS[cls].sailMax;
        const speed = baseSpeed * this.wind.speedFactor(this.heading) * (0.45 + 0.55 * sailFactor);
        const nextX = this.player.x + Math.cos(this.heading) * speed * dt;
        const nextY = this.player.y + Math.sin(this.heading) * speed * dt;
        let resolvedX = this.player.x;
        let resolvedY = this.player.y;
        const xBlocked = this.isLand(nextX, this.player.y);
        const yBlocked = this.isLand(this.player.x, nextY);
        if (!xBlocked) resolvedX = nextX;
        if (!yBlocked) resolvedY = nextY;
        if (xBlocked && yBlocked) {
          const pushX = this.player.x - nextX;
          const pushY = this.player.y - nextY;
          resolvedX = this.player.x + Math.sign(pushX) * 0.4;
          resolvedY = this.player.y + Math.sign(pushY) * 0.4;
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
    this.player.update(this.heading, this.wind.state.dir, dt);
  }

  private spawnWake(x: number, y: number): void {
    Particles.splash(this, x, y, 4);
  }

  private updateEnemies(dt: number): void {
    for (const e of this.enemies) {
      if (e.leader && e.followOffset) {
        const desired = new Phaser.Math.Vector2(
          e.leader.ship.x + Math.cos(e.leader.heading + Math.PI) * e.followOffset.x + e.followOffset.y * Math.sin(e.leader.heading),
          e.leader.ship.y + Math.sin(e.leader.heading + Math.PI) * e.followOffset.x - e.followOffset.y * Math.cos(e.leader.heading),
        );
        const dx = desired.x - e.ship.x;
        const dy = desired.y - e.ship.y;
        const len = Math.hypot(dx, dy);
        if (len > 2) {
          const sp = Math.min(0.05 * dt, len);
          e.ship.setPosition(e.ship.x + (dx / len) * sp, e.ship.y + (dy / len) * sp);
          e.heading = Math.atan2(dy, dx);
        }
        e.ship.update(e.heading, this.wind.state.dir, dt);
        continue;
      }
      const nx = e.ship.x + Math.cos(e.heading) * e.speed * (dt / 16);
      const ny = e.ship.y + Math.sin(e.heading) * e.speed * (dt / 16);
      if (nx < 30 || nx > WORLD_W - 30 || ny < 30 || ny > WORLD_H - 30 || this.isLand(nx, ny)) {
        e.heading = e.heading + Math.PI + (Math.random() - 0.5) * 0.4;
      } else {
        e.ship.setPosition(nx, ny);
        if (Math.random() < 0.0025) e.heading += (Math.random() - 0.5) * 0.6;
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
      const trigger = e.kind === 'merchant' ? 18 : 24;
      if (d < trigger) {
        this.triggerNavalEncounter(e);
        break;
      }
    }
  }

  private triggerNavalEncounter(e: Enemy): void {
    // El kell távolítani a követőit is
    const removed = this.enemies.filter((o) => o === e || o.leader === e);
    this.enemies = this.enemies.filter((o) => !removed.includes(o));
    for (const r of removed) r.ship.destroy();

    const dx = this.player.x - e.ship.x;
    const dy = this.player.y - e.ship.y;
    const len = Math.hypot(dx, dy) || 1;
    const backX = this.player.x + (dx / len) * 22;
    const backY = this.player.y + (dy / len) * 22;
    useGame.getState().setWorldPos({
      x: Phaser.Math.Clamp(backX, 20, WORLD_W - 20),
      y: Phaser.Math.Clamp(backY, 20, WORLD_H - 20),
      heading: this.heading,
    });
    this.scene.start('Encounter', { enemyKind: e.kind, enemyNation: e.nation, enemySilhouette: e.silhouette });
  }

  private updatePortProximity(): void {
    let nearest: Port | null = null;
    let bestDist = 36;
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

  /**
   * Régió-alapú ambient: megnézi a legközelebbi portot és azt, hogy a
   * játékos milyen környezetben vitorlázik, majd illő hangot játszik le.
   */
  private playRegionalAmbient(): void {
    if (!this.player) return;
    // Legközelebbi port keresése
    let nearest: Port | null = null;
    let bestD = Infinity;
    for (const p of PORTS) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
      if (d < bestD) { bestD = d; nearest = p; }
    }
    // Távoli ambient: nád / víz
    if (bestD > 260) {
      if (Math.random() < 0.5) Audio.reedCricket();
      else Audio.storkClatter();
      return;
    }
    if (!nearest) return;
    // Közeli port — választás a port jellege alapján
    if (nearest.homePort) {
      // Zenta közelében halk cimbalom-frázis
      Audio.cimbalomPhrase();
      return;
    }
    if (nearest.size === 'capital' || nearest.size === 'large') {
      // Nagyobb város — templomi harangszó
      if ((nearest.nation === 'magyar' || nearest.nation === 'olah' || nearest.nation === 'svab' || nearest.nation === 'bunyevac' || nearest.nation === 'rac') && Math.random() < 0.7) {
        Audio.churchBell();
        return;
      }
    }
    // Default: madárhang
    if (Math.random() < 0.5) Audio.storkClatter();
    else Audio.reedCricket();
  }
}
