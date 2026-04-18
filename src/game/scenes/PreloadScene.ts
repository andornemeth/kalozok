import Phaser from 'phaser';

/**
 * Procedurálisan generált sprite-tár — nincs binárisszállítás. C64 Pirates! ihletésű,
 * de modernebb paletta és több részlet (3 hajóméret, 4 szín, ostrom-egységek, particle).
 */

interface ShipPalette {
  hullDark: number;
  hullMid: number;
  hullLight: number;
  goldTrim: number;
  sailLight: number;
  sailMid: number;
  sailDark: number;
  mast: number;
  flag: number;
  flagStripe: number;
}

const TONES: Record<string, ShipPalette> = {
  player: {
    hullDark: 0x3a2010, hullMid: 0x6b3e1f, hullLight: 0x8b5a2b,
    goldTrim: 0xe0b24f, sailLight: 0xfbf5e3, sailMid: 0xd9c99a, sailDark: 0x8a7a4a,
    mast: 0x3a2a1a, flag: 0xc0392b, flagStripe: 0xf2c94c,
  },
  enemy: {
    hullDark: 0x2a1515, hullMid: 0x5c2a22, hullLight: 0x8a3d2e,
    goldTrim: 0xb94a3b, sailLight: 0xffd7c7, sailMid: 0xd99a8a, sailDark: 0x7a2e0e,
    mast: 0x2a1515, flag: 0x0a0a0a, flagStripe: 0xff6a3d,
  },
  navy: {
    hullDark: 0x14213a, hullMid: 0x2d4466, hullLight: 0x4f6ba6,
    goldTrim: 0xe0b24f, sailLight: 0xfbf5e3, sailMid: 0xc6d5ee, sailDark: 0x4f6ba6,
    mast: 0x2a2a2a, flag: 0xd04040, flagStripe: 0xfbf5e3,
  },
  merchant: {
    hullDark: 0x2d3e1e, hullMid: 0x5a7a3d, hullLight: 0x7a9a5a,
    goldTrim: 0xbfa24f, sailLight: 0xfbf5e3, sailMid: 0xd9c99a, sailDark: 0x6a5a3a,
    mast: 0x3a2a1a, flag: 0xff8c42, flagStripe: 0xfbf5e3,
  },
};

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    for (const tone of Object.keys(TONES)) {
      const p = TONES[tone]!;
      this.makeSideShipSmall(`ship-${tone}-small`, p);
      this.makeSideShipMedium(`ship-${tone}-medium`, p);
      this.makeSideShipLarge(`ship-${tone}-large`, p);
    }

    this.makeWake('wake');
    this.makeTargetMarker('target-marker');
    this.makeWaveTile('wave-tile');
    this.makeWaveCrest('wave-crest');

    this.makePortMarker('port-eng', 0xc0392b, 0xfbf5e3, 'cross');
    this.makePortMarker('port-esp', 0xf2c94c, 0xc0392b, 'castle');
    this.makePortMarker('port-fra', 0x3470d6, 0xfbf5e3, 'fleur');
    this.makePortMarker('port-ned', 0xff8c42, 0xfbf5e3, 'lion');
    this.makePortMarker('port-pir', 0x1c1c1c, 0xfbf5e3, 'skull');

    this.makeFortIcon('fort-icon');
    this.makeAnchorIcon('anchor-icon');

    this.makeCannonball('cannonball-round', 0x1c1c1c);
    this.makeCannonball('cannonball-chain', 0x5a5a5a);
    this.makeCannonball('cannonball-grape', 0x9a5d3b);
    this.makeSplash('splash');
    this.makeExplosion('explosion');
    this.makeSmokePuff('smoke-puff');
    this.makeFlash('muzzle-flash');
    this.makeSpark('spark');
    this.makeFireParticle('fire-particle');

    this.makeWindArrow('wind-arrow');
    this.makeCompassRose('compass-rose');
    this.makeTreasureX('treasure-x');
    this.makeTreasureChest('treasure-chest');
    this.makeShovelMark('shovel-mark');
    this.makeIslandPatch('island-patch');
    this.makeSandPatch('sand-patch');

    this.makePalm('palm');
    this.makePalmLarge('palm-large');
    this.makeCloudShadow('cloud-shadow');
    this.makeHillSilhouette('hill-1', 0x4a6b3a);
    this.makeHillSilhouette('hill-2', 0x6b8f3d);
    this.makeRock('rock');

    this.makeFortWall('fort-wall', false);
    this.makeFortWall('fort-wall-damaged', true);
    this.makeFortGate('fort-gate');
    this.makeFortGate('fort-gate-broken', true);
    this.makeFortKeep('fort-keep');
    this.makeFortCannon('fort-cannon');
    this.makePowderBarrel('powder-barrel');

    this.makeSoldierSprite('unit-buccaneer', 0xe0b24f, 0x3a2a1a, 'cutlass');
    this.makeSoldierSprite('unit-soldier', 0x4f6ba6, 0xfbf5e3, 'musket');
    this.makeSoldierSprite('unit-cavalry', 0xc0392b, 0xfbf5e3, 'sabre');
    this.makeSoldierSprite('unit-cannon', 0x2a2a2a, 0x6b4a2b, 'cannon');

    this.makeDuelist('duelist-player', 0x6b3e1f, 0xe0b24f, 0xfbf5e3);
    this.makeDuelist('duelist-enemy', 0x5c2a22, 0xb94a3b, 0xff6a3d);
    this.makeSwordSwing('sword-swing');

    this.makeSunflower('sunflower-emblem');
    this.makePaprikaRibbon('paprika-ribbon');
    this.makeHomeStar('home-star');

    this.scene.start('World');
  }

  // ---------- Vajdasági motívumok ----------

  private makeSunflower(key: string): void {
    const size = 24;
    const g = this.add.graphics();
    const cx = size / 2;
    const cy = size / 2;
    // Szirmok — 8 sárga
    g.fillStyle(0xf2c94c, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = cx + Math.cos(a) * 8;
      const y = cy + Math.sin(a) * 8;
      g.fillCircle(x, y, 3.5);
    }
    // Közép - sötét magmag
    g.fillStyle(0x6b3e1f, 1);
    g.fillCircle(cx, cy, 4.5);
    g.fillStyle(0x3a2010, 1);
    g.fillCircle(cx, cy, 2.5);
    // Apró pontok a magra
    g.fillStyle(0xe0b24f, 1);
    g.fillCircle(cx - 1, cy - 1, 0.6);
    g.fillCircle(cx + 1, cy + 1, 0.6);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private makePaprikaRibbon(key: string): void {
    const w = 32;
    const h = 10;
    const g = this.add.graphics();
    // Piros paprikák fűzve
    for (let i = 0; i < 4; i++) {
      const x = 3 + i * 8;
      g.fillStyle(0xc0392b, 1);
      g.fillTriangle(x, 3, x + 4, 3, x + 2, 9);
      g.fillStyle(0x88e07b, 1);
      g.fillRect(x + 1, 1, 2, 2);
    }
    // Zsinór
    g.lineStyle(1, 0x3a2a1a, 0.8);
    g.lineBetween(0, 2, w, 2);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeHomeStar(key: string): void {
    const size = 20;
    const g = this.add.graphics();
    const cx = size / 2;
    const cy = size / 2;
    // 5 ágú csillag — magyar motívum
    const pts: number[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 8 : 4;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.fillStyle(0xf2c94c, 1);
    g.fillPoints(
      pts.reduce<Phaser.Geom.Point[]>((acc, v, i) => {
        if (i % 2 === 0) acc.push(new Phaser.Geom.Point(v, pts[i + 1]!));
        return acc;
      }, []),
      true,
    );
    g.lineStyle(1, 0xc0392b, 1);
    g.strokePoints(
      pts.reduce<Phaser.Geom.Point[]>((acc, v, i) => {
        if (i % 2 === 0) acc.push(new Phaser.Geom.Point(v, pts[i + 1]!));
        return acc;
      }, []),
      true,
    );
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // ---------- Hajók ----------

  private makeSideShipSmall(key: string, c: ShipPalette): void {
    const w = 90;
    const h = 76;
    const g = this.add.graphics();
    const main = 50;
    g.lineStyle(1, c.mast, 0.7);
    g.lineBetween(8, 50, main, 6);
    g.lineBetween(main, 6, 84, 50);
    g.fillStyle(c.mast, 1);
    g.fillRect(main - 1, 4, 2, 50);

    this.drawSquareSail(g, main - 12, 8, 24, 14, c, 3);
    this.drawSquareSail(g, main - 16, 26, 32, 22, c, 3);

    // Jib
    g.fillStyle(c.sailMid, 1);
    g.fillTriangle(main + 4, 18, 84, 50, main + 4, 48);
    g.fillStyle(c.sailLight, 1);
    g.fillTriangle(main + 6, 20, 82, 48, main + 6, 46);

    // Spanker
    g.fillStyle(c.sailMid, 1);
    g.fillTriangle(8, 50, main - 4, 14, main - 4, 48);
    g.fillStyle(c.sailLight, 1);
    g.fillTriangle(10, 50, main - 6, 18, main - 6, 46);

    this.drawHull(g, c, 4, 50, w - 4, 70, true);

    // Bowsprit
    g.fillStyle(c.mast, 1);
    g.fillRect(82, 48, 6, 2);

    // Zászló a fő árboc tetején
    this.drawFlag(g, c, main + 1, 4);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeSideShipMedium(key: string, c: ShipPalette): void {
    const w = 112;
    const h = 96;
    const g = this.add.graphics();
    const mizzen = 26;
    const main = 54;
    const fore = 82;

    g.lineStyle(1, c.mast, 0.7);
    g.lineBetween(8, 68, mizzen, 6);
    g.lineBetween(mizzen, 6, main, 2);
    g.lineBetween(main, 2, fore, 6);
    g.lineBetween(fore, 6, 104, 68);
    g.lineBetween(mizzen, 30, main, 14);
    g.lineBetween(main, 14, fore, 30);

    g.fillStyle(c.mast, 1);
    g.fillRect(mizzen - 1, 6, 2, 66);
    g.fillRect(main - 1, 2, 2, 70);
    g.fillRect(fore - 1, 6, 2, 66);

    this.drawSquareSail(g, mizzen - 11, 10, 22, 14, c, 3);
    this.drawSquareSail(g, mizzen - 14, 28, 28, 18, c, 3);
    this.drawSquareSail(g, mizzen - 16, 48, 32, 22, c, 3);
    this.drawSquareSail(g, main - 12, 6, 24, 14, c, 3);
    this.drawSquareSail(g, main - 15, 24, 30, 20, c, 3);
    this.drawSquareSail(g, main - 18, 46, 36, 24, c, 3);
    this.drawSquareSail(g, fore - 11, 10, 22, 14, c, 3);
    this.drawSquareSail(g, fore - 14, 28, 28, 18, c, 3);
    this.drawSquareSail(g, fore - 16, 48, 32, 22, c, 3);

    g.fillStyle(c.sailMid, 1);
    g.fillTriangle(fore + 2, 34, 108, 68, fore + 2, 64);
    g.fillStyle(c.sailLight, 1);
    g.fillTriangle(fore + 4, 36, 106, 66, fore + 4, 62);

    g.fillStyle(c.sailMid, 1);
    g.fillTriangle(8, 68, mizzen - 2, 30, mizzen - 2, 66);
    g.fillStyle(c.sailLight, 1);
    g.fillTriangle(10, 66, mizzen - 4, 34, mizzen - 4, 64);

    this.drawHull(g, c, 4, 68, w - 4, 92, true);

    g.fillStyle(c.mast, 1);
    g.fillRect(106, 66, 6, 2);

    this.drawFlag(g, c, main + 1, 2);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeSideShipLarge(key: string, c: ShipPalette): void {
    const w = 132;
    const h = 110;
    const g = this.add.graphics();
    const mizzen = 30;
    const main = 64;
    const fore = 96;

    g.lineStyle(1, c.mast, 0.7);
    g.lineBetween(6, 78, mizzen, 4);
    g.lineBetween(mizzen, 4, main, 0);
    g.lineBetween(main, 0, fore, 4);
    g.lineBetween(fore, 4, 124, 78);

    g.fillStyle(c.mast, 1);
    g.fillRect(mizzen - 1, 4, 2, 76);
    g.fillRect(main - 1, 0, 2, 80);
    g.fillRect(fore - 1, 4, 2, 76);

    this.drawSquareSail(g, mizzen - 12, 8, 24, 14, c, 3);
    this.drawSquareSail(g, mizzen - 16, 26, 32, 20, c, 3);
    this.drawSquareSail(g, mizzen - 18, 50, 36, 24, c, 3);
    this.drawSquareSail(g, main - 13, 4, 26, 14, c, 3);
    this.drawSquareSail(g, main - 17, 22, 34, 22, c, 3);
    this.drawSquareSail(g, main - 22, 48, 44, 28, c, 3);
    this.drawSquareSail(g, fore - 12, 8, 24, 14, c, 3);
    this.drawSquareSail(g, fore - 16, 26, 32, 20, c, 3);
    this.drawSquareSail(g, fore - 18, 50, 36, 24, c, 3);

    g.fillStyle(c.sailMid, 1);
    g.fillTriangle(fore + 2, 34, 128, 78, fore + 2, 72);
    g.fillStyle(c.sailLight, 1);
    g.fillTriangle(fore + 4, 36, 126, 76, fore + 4, 70);

    g.fillStyle(c.sailMid, 1);
    g.fillTriangle(6, 78, mizzen - 2, 30, mizzen - 2, 76);
    g.fillStyle(c.sailLight, 1);
    g.fillTriangle(8, 76, mizzen - 4, 34, mizzen - 4, 74);

    // Hátsó kastély (sterncastle) — galleon jellegzetes magas hátulja
    g.fillStyle(c.hullMid, 1);
    g.fillRect(4, 60, 24, 18);
    g.fillStyle(c.hullDark, 1);
    g.fillRect(4, 60, 24, 1);
    g.fillStyle(c.goldTrim, 1);
    for (let i = 0; i < 4; i++) g.fillRect(7 + i * 5, 64, 2, 4);

    this.drawHull(g, c, 4, 78, w - 4, 106, true);
    // Kettős ágyúsor
    g.fillStyle(0x04141a, 1);
    for (let i = 0; i < 9; i++) g.fillRect(14 + i * 12, 96, 4, 4);

    g.fillStyle(c.mast, 1);
    g.fillRect(124, 76, 8, 2);

    this.drawFlag(g, c, main + 1, 0);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  private drawSquareSail(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, sw: number, sh: number,
    c: ShipPalette, sideOffset: number,
  ): void {
    g.fillStyle(c.mast, 1);
    g.fillRect(x - 1, y - 1, sw + 2, 2);
    const ox = sideOffset;
    g.fillStyle(c.sailDark, 1);
    g.fillRect(x + ox, y + 1, sw, sh - 1);
    g.fillStyle(c.sailMid, 1);
    g.fillRect(x + ox + 1, y + 2, sw - 2, sh - 3);
    g.fillStyle(c.sailLight, 1);
    g.fillRect(x + ox + 2, y + 3, sw - 4, sh - 5);
    g.fillStyle(c.sailMid, 0.55);
    g.fillRect(x + ox + 4, y + 3, 1, sh - 5);
    g.fillRect(x + ox + sw - 5, y + 3, 1, sh - 5);
    if (sw > 20) g.fillRect(x + ox + sw / 2 - 1, y + 3, 1, sh - 5);
    g.fillStyle(c.sailDark, 0.7);
    g.fillRect(x + ox + 1, y + sh - 2, sw - 2, 1);
    g.lineStyle(1, c.mast, 0.6);
    g.lineBetween(x + ox, y + 1, x + ox, y + sh);
    g.lineBetween(x + ox + sw, y + 1, x + ox + sw, y + sh);
  }

  private drawHull(g: Phaser.GameObjects.Graphics, c: ShipPalette, leftX: number, topY: number, rightX: number, bottomY: number, portholes: boolean): void {
    const dipL = leftX + 4;
    const dipR = rightX - 6;
    const outline: Phaser.Types.Math.Vector2Like[] = [
      { x: leftX - 2, y: topY },
      { x: rightX + 2, y: topY },
      { x: rightX - 4, y: bottomY - 6 },
      { x: rightX - 14, y: bottomY },
      { x: dipL + 14, y: bottomY },
      { x: dipL, y: bottomY - 6 },
    ];
    g.fillStyle(c.hullDark, 1);
    g.fillPoints(outline, true);
    const mid: Phaser.Types.Math.Vector2Like[] = [
      { x: leftX, y: topY + 2 },
      { x: rightX, y: topY + 2 },
      { x: rightX - 6, y: bottomY - 8 },
      { x: rightX - 14, y: bottomY - 2 },
      { x: dipL + 14, y: bottomY - 2 },
      { x: dipR - 100, y: bottomY - 8 }, // dummy to keep TypeScript happy
      { x: dipL + 2, y: bottomY - 8 },
    ];
    void mid;
    const hullMid: Phaser.Types.Math.Vector2Like[] = [
      { x: leftX, y: topY + 2 },
      { x: rightX, y: topY + 2 },
      { x: rightX - 6, y: bottomY - 8 },
      { x: rightX - 14, y: bottomY - 2 },
      { x: dipL + 14, y: bottomY - 2 },
      { x: dipL + 2, y: bottomY - 8 },
    ];
    g.fillStyle(c.hullMid, 1);
    g.fillPoints(hullMid, true);
    g.fillStyle(c.hullLight, 1);
    g.fillRect(leftX + 2, topY + 6, rightX - leftX - 4, 2);
    g.fillStyle(c.goldTrim, 1);
    g.fillRect(leftX + 2, topY + 8, rightX - leftX - 4, 1);
    if (portholes) {
      g.fillStyle(0x04141a, 1);
      const count = Math.floor((rightX - leftX - 14) / 13);
      for (let i = 0; i < count; i++) g.fillRect(leftX + 10 + i * 13, topY + 12, 4, 4);
    }
    // Korlát
    g.fillStyle(c.goldTrim, 1);
    const railCount = Math.floor((rightX - leftX - 8) / 8);
    for (let i = 0; i < railCount; i++) g.fillRect(leftX + 6 + i * 8, topY - 4, 1, 4);
    g.fillStyle(c.hullDark, 1);
    g.fillRect(leftX + 2, topY - 4, rightX - leftX - 4, 1);
  }

  private drawFlag(g: Phaser.GameObjects.Graphics, c: ShipPalette, x: number, y: number): void {
    g.fillStyle(c.flag, 1);
    g.fillTriangle(x, y, x + 11, y + 2, x, y + 4);
    g.fillStyle(c.flagStripe, 1);
    g.fillRect(x + 2, y + 1, 5, 1);
  }

  // ---------- Tenger / particle ----------

  private makeWake(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture(key, 8, 8);
    g.destroy();
  }

  private makeWaveTile(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0x0e4044, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x145f65, 0.55);
    for (let y = 0; y < 64; y += 4) {
      for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < 64; x += 4) g.fillRect(x, y, 1, 1);
    }
    g.fillStyle(0x1a7f86, 0.45);
    for (let y = 2; y < 64; y += 8) for (let x = 4; x < 64; x += 8) g.fillRect(x, y, 2, 1);
    g.generateTexture(key, 64, 64);
    g.destroy();
  }

  private makeWaveCrest(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0xbfe2e4, 0.7);
    g.fillRect(0, 0, 6, 1);
    g.fillRect(1, 1, 4, 1);
    g.generateTexture(key, 6, 2);
    g.destroy();
  }

  private makeTargetMarker(key: string): void {
    const g = this.add.graphics();
    g.lineStyle(2, 0xe0b24f, 1);
    g.strokeCircle(12, 12, 9);
    g.lineStyle(2, 0xfbf5e3, 0.6);
    g.strokeCircle(12, 12, 5);
    g.lineBetween(2, 12, 22, 12);
    g.lineBetween(12, 2, 12, 22);
    g.generateTexture(key, 24, 24);
    g.destroy();
  }

  private makePortMarker(key: string, color: number, accent: number, kind: 'cross' | 'fleur' | 'castle' | 'lion' | 'skull'): void {
    const w = 32;
    const h = 36;
    const g = this.add.graphics();
    // Lobogó és rúd
    g.fillStyle(0x1a1410, 1);
    g.fillRect(15, 0, 2, 14);
    g.fillStyle(color, 1);
    g.fillRoundedRect(17, 1, 12, 8, 1);
    g.fillStyle(accent, 1);
    if (kind === 'cross') {
      g.fillRect(22, 2, 2, 6);
      g.fillRect(19, 4, 8, 2);
    } else if (kind === 'fleur') {
      g.fillRect(22, 2, 2, 6);
      g.fillCircle(23, 4, 1);
      g.fillCircle(20, 5, 1);
      g.fillCircle(26, 5, 1);
    } else if (kind === 'castle') {
      g.fillRect(20, 5, 2, 3);
      g.fillRect(24, 5, 2, 3);
      g.fillRect(22, 3, 2, 5);
    } else if (kind === 'lion') {
      g.fillCircle(23, 5, 2);
      g.fillRect(21, 6, 4, 2);
    } else {
      g.fillCircle(23, 4, 2);
      g.fillRect(22, 6, 1, 2);
      g.fillRect(24, 6, 1, 2);
    }
    // Bástya / város sziluett
    g.fillStyle(0x2a2520, 1);
    g.fillRoundedRect(4, 18, 24, 16, 2);
    g.fillStyle(0x7a7366, 1);
    g.fillRect(6, 20, 20, 12);
    g.fillStyle(0x4a4238, 1);
    for (let i = 0; i < 4; i++) g.fillRect(6 + i * 5, 18, 4, 4);
    g.fillStyle(color, 1);
    g.fillRect(14, 24, 4, 8);
    g.fillStyle(0x1a1410, 1);
    g.fillRect(15, 26, 2, 6);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeFortIcon(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0x4a4238, 1);
    g.fillRect(0, 6, 18, 12);
    g.fillStyle(0x7a7366, 1);
    g.fillRect(2, 8, 14, 8);
    g.fillStyle(0x4a4238, 1);
    for (let i = 0; i < 4; i++) g.fillRect(i * 4 + 1, 4, 3, 4);
    g.fillStyle(0xc0392b, 1);
    g.fillRect(8, 10, 2, 5);
    g.generateTexture(key, 18, 18);
    g.destroy();
  }

  private makeAnchorIcon(key: string): void {
    const g = this.add.graphics();
    g.lineStyle(2, 0xe0b24f, 1);
    g.lineBetween(8, 2, 8, 14);
    g.strokeCircle(8, 4, 2);
    g.lineBetween(2, 12, 14, 12);
    g.lineBetween(2, 12, 4, 14);
    g.lineBetween(14, 12, 12, 14);
    g.generateTexture(key, 16, 16);
    g.destroy();
  }

  private makeCannonball(key: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(4, 4, 4);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(3, 3, 1);
    g.generateTexture(key, 8, 8);
    g.destroy();
  }

  private makeSplash(key: string): void {
    const g = this.add.graphics();
    g.lineStyle(2, 0xbfe2e4, 1);
    g.strokeCircle(14, 14, 6);
    g.strokeCircle(14, 14, 11);
    g.fillStyle(0xfbfdfd, 0.9);
    g.fillCircle(14, 14, 2);
    g.generateTexture(key, 28, 28);
    g.destroy();
  }

  private makeExplosion(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0xffcc66, 1);
    g.fillCircle(18, 18, 12);
    g.fillStyle(0xff6a3d, 1);
    g.fillCircle(18, 18, 8);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(18, 18, 4);
    g.generateTexture(key, 36, 36);
    g.destroy();
  }

  private makeSmokePuff(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0xfbfdfd, 0.9);
    g.fillCircle(8, 8, 7);
    g.fillStyle(0xc8d6da, 0.7);
    g.fillCircle(6, 9, 4);
    g.generateTexture(key, 16, 16);
    g.destroy();
  }

  private makeFlash(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0xffe79a, 1);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 4);
    g.generateTexture(key, 16, 16);
    g.destroy();
  }

  private makeSpark(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0xffe79a, 1);
    g.fillRect(1, 1, 2, 2);
    g.generateTexture(key, 4, 4);
    g.destroy();
  }

  private makeFireParticle(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0xff6a3d, 1);
    g.fillCircle(4, 4, 4);
    g.fillStyle(0xffe79a, 1);
    g.fillCircle(4, 4, 2);
    g.generateTexture(key, 8, 8);
    g.destroy();
  }

  private makeWindArrow(key: string): void {
    const g = this.add.graphics();
    g.lineStyle(2, 0xbfe2e4, 0.9);
    g.lineBetween(0, 4, 12, 4);
    g.lineBetween(12, 4, 9, 1);
    g.lineBetween(12, 4, 9, 7);
    g.generateTexture(key, 14, 8);
    g.destroy();
  }

  private makeCompassRose(key: string): void {
    const w = 64;
    const h = 64;
    const g = this.add.graphics();
    g.fillStyle(0x04141a, 0.9);
    g.fillCircle(w / 2, h / 2, 30);
    g.lineStyle(1, 0xe0b24f, 1);
    g.strokeCircle(w / 2, h / 2, 30);
    g.strokeCircle(w / 2, h / 2, 22);
    // Cardinális csillag
    const cx = w / 2;
    const cy = h / 2;
    g.fillStyle(0xfbf5e3, 1);
    g.fillTriangle(cx, cy - 26, cx - 4, cy, cx + 4, cy);
    g.fillStyle(0xe0b24f, 1);
    g.fillTriangle(cx, cy + 26, cx - 4, cy, cx + 4, cy);
    g.fillStyle(0xfbf5e3, 0.6);
    g.fillTriangle(cx - 26, cy, cx, cy - 4, cx, cy + 4);
    g.fillTriangle(cx + 26, cy, cx, cy - 4, cx, cy + 4);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeTreasureX(key: string): void {
    const g = this.add.graphics();
    g.lineStyle(3, 0xe0b24f, 1);
    g.lineBetween(2, 2, 14, 14);
    g.lineBetween(14, 2, 2, 14);
    g.generateTexture(key, 16, 16);
    g.destroy();
  }

  private makeTreasureChest(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0x4a2e1a, 1);
    g.fillRoundedRect(0, 6, 28, 18, 2);
    g.fillStyle(0x6b4a2b, 1);
    g.fillRect(2, 8, 24, 14);
    g.fillStyle(0xe0b24f, 1);
    g.fillRect(0, 10, 28, 2);
    g.fillRect(0, 18, 28, 2);
    g.fillStyle(0xb99137, 1);
    g.fillRect(12, 12, 4, 6);
    g.fillStyle(0xffe79a, 1);
    g.fillCircle(8, 4, 1);
    g.fillCircle(20, 5, 1);
    g.fillCircle(14, 3, 1);
    g.generateTexture(key, 28, 26);
    g.destroy();
  }

  private makeShovelMark(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0x4a2e1a, 0.8);
    g.fillEllipse(8, 8, 14, 6);
    g.fillStyle(0x2a1a0a, 1);
    g.fillEllipse(8, 8, 8, 3);
    g.generateTexture(key, 16, 16);
    g.destroy();
  }

  private makeIslandPatch(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0x6b8f3d, 1);
    g.fillCircle(20, 20, 18);
    g.fillStyle(0x3a6d3a, 1);
    g.fillCircle(20, 20, 14);
    g.generateTexture(key, 40, 40);
    g.destroy();
  }

  private makeSandPatch(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0xe8d28a, 1);
    g.fillCircle(20, 20, 18);
    g.generateTexture(key, 40, 40);
    g.destroy();
  }

  private makePalm(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0x4a2e1a, 1);
    g.fillRect(5, 6, 2, 6);
    g.fillStyle(0x2d5a2d, 1);
    g.fillTriangle(6, 2, 11, 4, 6, 6);
    g.fillTriangle(6, 2, 1, 4, 6, 6);
    g.fillTriangle(6, 6, 11, 7, 6, 5);
    g.fillTriangle(6, 6, 1, 7, 6, 5);
    g.fillStyle(0x3a7a3a, 1);
    g.fillTriangle(6, 3, 9, 4, 6, 5);
    g.fillTriangle(6, 3, 3, 4, 6, 5);
    g.generateTexture(key, 12, 12);
    g.destroy();
  }

  private makePalmLarge(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0x3a2010, 1);
    g.fillRect(8, 12, 4, 12);
    g.fillStyle(0x2d5a2d, 1);
    g.fillTriangle(10, 4, 18, 8, 10, 12);
    g.fillTriangle(10, 4, 2, 8, 10, 12);
    g.fillTriangle(10, 12, 19, 14, 10, 10);
    g.fillTriangle(10, 12, 1, 14, 10, 10);
    g.fillStyle(0x3a7a3a, 1);
    g.fillTriangle(10, 6, 15, 9, 10, 10);
    g.fillTriangle(10, 6, 5, 9, 10, 10);
    g.fillStyle(0xb99137, 1);
    g.fillCircle(8, 13, 1);
    g.fillCircle(12, 13, 1);
    g.generateTexture(key, 20, 24);
    g.destroy();
  }

  private makeCloudShadow(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0x04141a, 0.22);
    g.fillCircle(30, 20, 26);
    g.fillCircle(54, 24, 22);
    g.fillCircle(18, 34, 18);
    g.fillCircle(46, 40, 20);
    g.generateTexture(key, 80, 60);
    g.destroy();
  }

  private makeHillSilhouette(key: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillTriangle(0, 16, 12, 0, 24, 16);
    g.fillTriangle(8, 16, 18, 4, 28, 16);
    g.fillStyle(0xfbf5e3, 0.6);
    g.fillTriangle(10, 4, 14, 0, 16, 4);
    g.generateTexture(key, 28, 16);
    g.destroy();
  }

  private makeRock(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0x6b6256, 1);
    g.fillEllipse(6, 5, 10, 6);
    g.fillStyle(0x4a4238, 1);
    g.fillEllipse(7, 6, 8, 4);
    g.generateTexture(key, 12, 10);
    g.destroy();
  }

  // ---------- Erőd ostromhoz ----------

  private makeFortWall(key: string, damaged: boolean): void {
    const w = 64;
    const h = 80;
    const g = this.add.graphics();
    g.fillStyle(0x4a4238, 1);
    g.fillRect(0, 12, w, h - 12);
    g.fillStyle(0x7a7366, 1);
    g.fillRect(2, 14, w - 4, h - 16);
    g.fillStyle(0x9a9388, 1);
    for (let row = 0; row < 7; row++) {
      const y = 16 + row * 10;
      const offset = row % 2 === 0 ? 0 : 6;
      for (let x = offset; x < w - 4; x += 14) g.fillRect(3 + x, y, 10, 1);
      g.fillRect(3, y + 4, w - 6, 1);
    }
    g.fillStyle(0x7a7366, 1);
    for (let i = 0; i < 5; i++) g.fillRect(i * 14 + 2, 0, 10, 16);
    g.fillStyle(0x4a4238, 1);
    for (let i = 0; i < 5; i++) g.fillRect(i * 14 + 2, 12, 10, 2);
    g.fillStyle(0x2a2520, 0.7);
    g.fillRect(0, h - 4, w, 4);
    if (damaged) {
      g.fillStyle(0x1a1410, 1);
      g.fillCircle(20, 32, 7);
      g.fillCircle(40, 50, 9);
      g.fillRect(8, 2, 6, 14);
      g.fillRect(38, 0, 6, 12);
      g.lineStyle(1, 0x1a1410, 1);
      g.lineBetween(14, 22, 24, 50);
      g.lineBetween(34, 28, 50, 60);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeFortGate(key: string, broken = false): void {
    const w = 50;
    const h = 80;
    const g = this.add.graphics();
    g.fillStyle(0x4a4238, 1);
    g.fillRect(0, 12, w, h - 12);
    g.fillStyle(0x7a7366, 1);
    g.fillRect(2, 14, w - 4, h - 16);
    // Pártázat
    g.fillStyle(0x7a7366, 1);
    for (let i = 0; i < 4; i++) g.fillRect(i * 14 + 2, 0, 10, 16);
    g.fillStyle(0x4a4238, 1);
    for (let i = 0; i < 4; i++) g.fillRect(i * 14 + 2, 12, 10, 2);
    // Kapu
    if (broken) {
      g.fillStyle(0x1a1410, 1);
      g.fillRect(14, 36, 22, 40);
      g.fillStyle(0x4a2e1a, 1);
      g.fillRect(14, 36, 6, 40);
      g.fillRect(30, 36, 6, 40);
    } else {
      g.fillStyle(0x4a2e1a, 1);
      g.fillRoundedRect(12, 32, 26, 44, 4);
      g.fillStyle(0x6b4a2b, 1);
      g.fillRect(14, 34, 22, 40);
      g.fillStyle(0x2a1a0a, 1);
      g.fillRect(24, 34, 2, 40);
      g.fillRect(14, 50, 22, 1);
      g.fillStyle(0xe0b24f, 1);
      g.fillCircle(28, 54, 1);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeFortKeep(key: string): void {
    const w = 60;
    const h = 100;
    const g = this.add.graphics();
    g.fillStyle(0x3a3028, 1);
    g.fillRect(0, 24, w, h - 24);
    g.fillStyle(0x8a7a66, 1);
    g.fillRect(3, 26, w - 6, h - 28);
    g.fillStyle(0x6a5a48, 1);
    for (let row = 0; row < 9; row++) {
      const y = 30 + row * 8;
      const off = row % 2 === 0 ? 0 : 5;
      for (let x = off; x < w - 6; x += 10) g.fillRect(4 + x, y, 8, 1);
    }
    g.fillStyle(0x6a5a48, 1);
    for (let i = 0; i < 5; i++) g.fillRect(3 + i * 11, 12, 8, 16);
    g.fillStyle(0x3a3028, 1);
    for (let i = 0; i < 5; i++) g.fillRect(3 + i * 11, 24, 8, 2);
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(14, 40, 4, 8);
    g.fillRect(42, 40, 4, 8);
    g.fillRect(28, 50, 4, 10);
    g.fillStyle(0x1a1a1a, 1);
    g.fillRoundedRect(24, 72, 12, 24, 2);
    g.fillStyle(0x4a3a28, 1);
    g.fillRect(29, 74, 2, 20);
    g.fillStyle(0x2a2a2a, 1);
    g.fillRect(28, 0, 2, 14);
    g.fillStyle(0xc0392b, 1);
    g.fillTriangle(30, 2, 46, 6, 30, 12);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeFortCannon(key: string): void {
    const w = 28;
    const h = 18;
    const g = this.add.graphics();
    g.fillStyle(0x5a3a1a, 1);
    g.fillCircle(7, 14, 4);
    g.fillCircle(20, 14, 4);
    g.fillStyle(0x2a1a0a, 1);
    g.fillCircle(7, 14, 2);
    g.fillCircle(20, 14, 2);
    g.fillStyle(0x6b4a2b, 1);
    g.fillRect(2, 9, 22, 5);
    g.fillStyle(0x2a2a2a, 1);
    g.fillRoundedRect(4, 4, 22, 6, 2);
    g.fillStyle(0x4a4a4a, 1);
    g.fillRect(4, 5, 20, 1);
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(24, 6, 3, 4);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makePowderBarrel(key: string): void {
    const w = 18;
    const h = 22;
    const g = this.add.graphics();
    g.fillStyle(0x3a2a1a, 1);
    g.fillRoundedRect(1, 4, w - 2, h - 4, 3);
    g.fillStyle(0x6b4a2b, 1);
    g.fillRect(3, 6, w - 6, h - 8);
    g.fillStyle(0x3a2a1a, 1);
    g.fillRect(3, 10, w - 6, 1);
    g.fillRect(3, 16, w - 6, 1);
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(w / 2, 0, 1, 5);
    g.fillStyle(0xff6a3d, 1);
    g.fillCircle(w / 2, 1, 1);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // ---------- Egységek (formációs csata) ----------

  private makeSoldierSprite(key: string, body: number, accent: number, weapon: 'cutlass' | 'musket' | 'sabre' | 'cannon'): void {
    const w = weapon === 'cannon' ? 28 : 14;
    const h = 22;
    const g = this.add.graphics();
    if (weapon === 'cannon') {
      // Ágyú szekér
      g.fillStyle(0x5a3a1a, 1);
      g.fillCircle(6, 18, 3);
      g.fillCircle(22, 18, 3);
      g.fillStyle(body, 1);
      g.fillRoundedRect(2, 8, 24, 8, 2);
      g.fillStyle(accent, 1);
      g.fillRect(2, 9, 24, 1);
    } else {
      // Sisak / fej
      g.fillStyle(accent, 1);
      g.fillRect(4, 0, 6, 3);
      g.fillStyle(0xe0b24f, 1);
      g.fillCircle(7, 5, 3);
      // Test
      g.fillStyle(body, 1);
      g.fillRect(4, 8, 6, 9);
      g.fillStyle(accent, 1);
      g.fillRect(4, 10, 6, 1);
      // Lábak
      g.fillStyle(0x2a1a0a, 1);
      g.fillRect(4, 17, 2, 4);
      g.fillRect(8, 17, 2, 4);
      // Fegyver
      g.fillStyle(0x2a1a0a, 1);
      if (weapon === 'cutlass') {
        g.fillRect(11, 8, 1, 6);
        g.fillStyle(0xc6d5ee, 1);
        g.fillRect(10, 4, 2, 5);
      } else if (weapon === 'musket') {
        g.fillRect(10, 9, 4, 1);
        g.fillStyle(0x4a4238, 1);
        g.fillRect(10, 10, 3, 1);
      } else {
        // sabre
        g.fillStyle(0xc6d5ee, 1);
        g.fillTriangle(11, 8, 13, 4, 12, 9);
      }
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // ---------- Párbaj ----------

  private makeDuelist(key: string, body: number, accent: number, sash: number): void {
    const w = 32;
    const h = 60;
    const g = this.add.graphics();
    // Csizma
    g.fillStyle(0x2a1a0a, 1);
    g.fillRect(8, 50, 6, 8);
    g.fillRect(18, 50, 6, 8);
    // Nadrág
    g.fillStyle(0x3a2010, 1);
    g.fillRect(8, 36, 16, 16);
    // Öv
    g.fillStyle(sash, 1);
    g.fillRect(7, 33, 18, 4);
    // Mellény
    g.fillStyle(body, 1);
    g.fillRect(8, 18, 16, 18);
    g.fillStyle(accent, 1);
    g.fillRect(15, 18, 2, 18);
    // Ing-galér
    g.fillStyle(0xfbf5e3, 1);
    g.fillRect(13, 14, 6, 5);
    // Fej
    g.fillStyle(0xe0b24f, 1);
    g.fillCircle(16, 10, 5);
    // Szakáll
    g.fillStyle(0x2a1a0a, 1);
    g.fillRect(13, 11, 6, 2);
    // Bandana / kalap
    g.fillStyle(accent, 1);
    g.fillRoundedRect(10, 3, 12, 5, 1);
    g.fillStyle(0xfbf5e3, 1);
    g.fillCircle(20, 4, 1);
    // Karok
    g.fillStyle(body, 1);
    g.fillRect(4, 20, 4, 14);
    g.fillRect(24, 20, 4, 14);
    // Kard
    g.fillStyle(0xc6d5ee, 1);
    g.fillRect(28, 6, 2, 22);
    g.fillStyle(0xe0b24f, 1);
    g.fillRect(27, 27, 4, 2);
    g.fillRect(28, 29, 2, 4);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeSwordSwing(key: string): void {
    const g = this.add.graphics();
    g.lineStyle(3, 0xfbf5e3, 1);
    g.beginPath();
    g.arc(20, 20, 16, Phaser.Math.DegToRad(-40), Phaser.Math.DegToRad(40), false);
    g.strokePath();
    g.lineStyle(1, 0xc6d5ee, 0.8);
    g.beginPath();
    g.arc(20, 20, 12, Phaser.Math.DegToRad(-40), Phaser.Math.DegToRad(40), false);
    g.strokePath();
    g.generateTexture(key, 40, 40);
    g.destroy();
  }
}
