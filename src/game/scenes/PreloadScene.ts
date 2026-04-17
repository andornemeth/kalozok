import Phaser from 'phaser';

/**
 * Minden sprite procedurálisan kerül legenerálásra, ne kelljen binárisat szállítani.
 * A hajók OLDALNÉZETI részletes 3-árbocos rajzok — nem forognak, csak horizontális flippel
 * fordulnak menetirány szerint (C64 Pirates!-stílus).
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    this.makeSideShip('ship-player', {
      hullDark: 0x3a2010,
      hullMid: 0x6b3e1f,
      hullLight: 0x8b5a2b,
      goldTrim: 0xe0b24f,
      sailLight: 0xfbf5e3,
      sailMid: 0xd9c99a,
      sailDark: 0x8a7a4a,
      mast: 0x3a2a1a,
      flag: 0x0a0a0a,
      flagStripe: 0xfbf5e3,
    });
    this.makeSideShip('ship-enemy', {
      hullDark: 0x2a1515,
      hullMid: 0x5c2a22,
      hullLight: 0x8a3d2e,
      goldTrim: 0xb94a3b,
      sailLight: 0xffd7c7,
      sailMid: 0xd99a8a,
      sailDark: 0x7a2e0e,
      mast: 0x2a1515,
      flag: 0x0a0a0a,
      flagStripe: 0xff6a3d,
    });
    this.makeSideShip('ship-navy', {
      hullDark: 0x14213a,
      hullMid: 0x2d4466,
      hullLight: 0x4f6ba6,
      goldTrim: 0xe0b24f,
      sailLight: 0xfbf5e3,
      sailMid: 0xc6d5ee,
      sailDark: 0x4f6ba6,
      mast: 0x2a2a2a,
      flag: 0xd04040,
      flagStripe: 0xfbf5e3,
    });
    this.makeSideShip('ship-merchant', {
      hullDark: 0x2d3e1e,
      hullMid: 0x5a7a3d,
      hullLight: 0x7a9a5a,
      goldTrim: 0xbfa24f,
      sailLight: 0xfbf5e3,
      sailMid: 0xd9c99a,
      sailDark: 0x6a5a3a,
      mast: 0x3a2a1a,
      flag: 0xff8c42,
      flagStripe: 0xfbf5e3,
    });

    this.makeWake('wake');
    this.makeTargetMarker('target-marker');

    this.makePortMarker('port-eng', 0xd04040);
    this.makePortMarker('port-esp', 0xf2c94c);
    this.makePortMarker('port-fra', 0x4f8bff);
    this.makePortMarker('port-ned', 0xff8c42);
    this.makePortMarker('port-pir', 0x1c1c1c);

    this.makeCannonball('cannonball-round', 0x1c1c1c);
    this.makeCannonball('cannonball-chain', 0x5a5a5a);
    this.makeCannonball('cannonball-grape', 0x9a5d3b);
    this.makeSplash('splash');
    this.makeExplosion('explosion');
    this.makeWindArrow('wind-arrow');
    this.makeTreasureX('treasure-x');
    this.makePalm('palm');
    this.makeCloudShadow('cloud-shadow');

    this.makeFortWall('fort-wall');
    this.makeFortWall('fort-wall-damaged', true);
    this.makeFortCannon('fort-cannon');
    this.makeFortKeep('fort-keep');
    this.makePowderBarrel('powder-barrel');
    this.makeGuard('fort-guard');
    this.makeAimDot('aim-dot');
    this.makeMuzzleFlash('muzzle-flash');

    this.scene.start('World');
  }

  /** Oldalnézeti háromárbocos hajó: 3 árboc × (top-gallant + topsail + main) + jib + spanker + bowsprit + zászló. */
  private makeSideShip(
    key: string,
    c: {
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
    },
  ): void {
    const w = 112;
    const h = 96;
    const g = this.add.graphics();

    // Árboc-x pozíciók: orr jobbra néz alapértelmezettként (bow = jobbra)
    const mizzen = 26; // hátulsó
    const main = 54; // fő árboc
    const fore = 82; // orr felé

    // Rigging háttér (vékony keresztvonalak a testtől az árboc-csúcsig)
    g.lineStyle(1, c.mast, 0.7);
    g.lineBetween(8, 68, mizzen, 6);
    g.lineBetween(mizzen, 6, main, 2);
    g.lineBetween(main, 2, fore, 6);
    g.lineBetween(fore, 6, 104, 68);
    g.lineBetween(mizzen, 30, main, 14);
    g.lineBetween(main, 14, fore, 30);
    // Árbocok
    g.fillStyle(c.mast, 1);
    g.fillRect(mizzen - 1, 6, 2, 66);
    g.fillRect(main - 1, 2, 2, 70);
    g.fillRect(fore - 1, 6, 2, 66);

    // Vitorlák: minden árbocon top-gallant (legfelül, kicsi) + topsail + main sail
    const maxOffset = 3; // enyhe szélnek fordulás, ahogy a C64 képen is balra dől
    // Mizzen (hátulsó)
    this.drawSquareSail(g, mizzen - 11, 10, 22, 14, c, maxOffset);
    this.drawSquareSail(g, mizzen - 14, 28, 28, 18, c, maxOffset);
    this.drawSquareSail(g, mizzen - 16, 48, 32, 22, c, maxOffset);
    // Main
    this.drawSquareSail(g, main - 12, 6, 24, 14, c, maxOffset);
    this.drawSquareSail(g, main - 15, 24, 30, 20, c, maxOffset);
    this.drawSquareSail(g, main - 18, 46, 36, 24, c, maxOffset);
    // Fore
    this.drawSquareSail(g, fore - 11, 10, 22, 14, c, maxOffset);
    this.drawSquareSail(g, fore - 14, 28, 28, 18, c, maxOffset);
    this.drawSquareSail(g, fore - 16, 48, 32, 22, c, maxOffset);

    // Jib (háromszög vitorla orron, bowsprit felett)
    g.fillStyle(c.sailMid, 1);
    g.fillTriangle(fore + 2, 34, 108, 68, fore + 2, 64);
    g.fillStyle(c.sailLight, 1);
    g.fillTriangle(fore + 4, 36, 106, 66, fore + 4, 62);

    // Spanker (trapéz vitorla hátul, mizzen mögött)
    g.fillStyle(c.sailMid, 1);
    g.fillTriangle(8, 68, mizzen - 2, 30, mizzen - 2, 66);
    g.fillStyle(c.sailLight, 1);
    g.fillTriangle(10, 66, mizzen - 4, 34, mizzen - 4, 64);

    // Hajótest (oldalnézet) — íves aljjal
    // Árnyék/külső sziluett
    const hullOutline: Phaser.Types.Math.Vector2Like[] = [
      { x: 2, y: 68 },
      { x: 110, y: 68 },
      { x: 104, y: 86 },
      { x: 90, y: 92 },
      { x: 22, y: 92 },
      { x: 8, y: 86 },
    ];
    g.fillStyle(c.hullDark, 1);
    g.fillPoints(hullOutline, true);
    // Középsáv
    const hullMid: Phaser.Types.Math.Vector2Like[] = [
      { x: 4, y: 70 },
      { x: 108, y: 70 },
      { x: 102, y: 84 },
      { x: 90, y: 90 },
      { x: 22, y: 90 },
      { x: 10, y: 84 },
    ];
    g.fillStyle(c.hullMid, 1);
    g.fillPoints(hullMid, true);
    // Világos csík
    g.fillStyle(c.hullLight, 1);
    g.fillRect(6, 74, 100, 2);
    // Aranycsík
    g.fillStyle(c.goldTrim, 1);
    g.fillRect(6, 76, 100, 1);
    // Lőrések (portholes)
    g.fillStyle(0x04141a, 1);
    for (let i = 0; i < 7; i++) {
      g.fillRect(14 + i * 13, 80, 4, 4);
    }
    // Fedélzeti korlát (deck rail)
    g.fillStyle(c.goldTrim, 1);
    for (let i = 0; i < 12; i++) {
      g.fillRect(10 + i * 8, 64, 1, 4);
    }
    g.fillStyle(c.hullDark, 1);
    g.fillRect(6, 64, 100, 1);

    // Bowsprit (orrdísz) jobbra kinyúlva
    g.fillStyle(c.mast, 1);
    g.fillRect(106, 66, 6, 2);

    // Zászló a fő árboc csúcsán
    g.fillStyle(c.flag, 1);
    g.fillTriangle(main + 1, 2, main + 12, 4, main + 1, 6);
    g.fillStyle(c.flagStripe, 1);
    g.fillRect(main + 3, 3, 5, 1);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  private drawSquareSail(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    sw: number,
    sh: number,
    c: { sailLight: number; sailMid: number; sailDark: number; mast: number },
    sideOffset: number,
  ): void {
    // Keresztrúd (yard)
    g.fillStyle(c.mast, 1);
    g.fillRect(x - 1, y - 1, sw + 2, 2);
    // Billowing rectangle — enyhén eltolva oldalra (C64 kép: vitorlák kissé jobbra bufflanak)
    const ox = sideOffset;
    g.fillStyle(c.sailDark, 1);
    g.fillRect(x + ox, y + 1, sw, sh - 1);
    g.fillStyle(c.sailMid, 1);
    g.fillRect(x + ox + 1, y + 2, sw - 2, sh - 3);
    g.fillStyle(c.sailLight, 1);
    g.fillRect(x + ox + 2, y + 3, sw - 4, sh - 5);
    // Függőleges redők (pleats)
    g.fillStyle(c.sailMid, 0.55);
    g.fillRect(x + ox + 4, y + 3, 1, sh - 5);
    g.fillRect(x + ox + sw - 5, y + 3, 1, sh - 5);
    if (sw > 20) g.fillRect(x + ox + sw / 2 - 1, y + 3, 1, sh - 5);
    // Alsó árnyék
    g.fillStyle(c.sailDark, 0.7);
    g.fillRect(x + ox + 1, y + sh - 2, sw - 2, 1);
    // Kötélzet oldalt (bowlines)
    g.lineStyle(1, c.mast, 0.6);
    g.lineBetween(x + ox, y + 1, x + ox, y + sh);
    g.lineBetween(x + ox + sw, y + 1, x + ox + sw, y + sh);
  }

  private makeWake(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture(key, 8, 8);
    g.destroy();
  }

  private makeTargetMarker(key: string): void {
    const g = this.add.graphics();
    g.lineStyle(2, 0xe0b24f, 1);
    g.strokeCircle(10, 10, 8);
    g.lineBetween(4, 10, 16, 10);
    g.lineBetween(10, 4, 10, 16);
    g.generateTexture(key, 20, 20);
    g.destroy();
  }

  private makePortMarker(key: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x04141a, 1);
    g.fillRoundedRect(0, 6, 26, 18, 3);
    g.fillStyle(color, 1);
    g.fillRoundedRect(2, 8, 22, 14, 2);
    g.fillStyle(0xfbf5e3, 1);
    g.fillRect(6, 12, 3, 3);
    g.fillRect(11, 12, 3, 3);
    g.fillRect(16, 12, 3, 3);
    g.fillStyle(0x04141a, 1);
    g.fillRect(12, 0, 2, 10);
    g.fillStyle(0xfbf5e3, 1);
    g.fillTriangle(14, 2, 22, 5, 14, 8);
    g.generateTexture(key, 26, 24);
    g.destroy();
  }

  private makeCannonball(key: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture(key, 8, 8);
    g.destroy();
  }

  private makeSplash(key: string): void {
    const g = this.add.graphics();
    g.lineStyle(2, 0xbfe2e4, 1);
    g.strokeCircle(12, 12, 5);
    g.strokeCircle(12, 12, 10);
    g.generateTexture(key, 24, 24);
    g.destroy();
  }

  private makeExplosion(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0xffcc66, 1);
    g.fillCircle(16, 16, 10);
    g.fillStyle(0xff6a3d, 1);
    g.fillCircle(16, 16, 6);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(16, 16, 3);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private makeWindArrow(key: string): void {
    const g = this.add.graphics();
    g.lineStyle(2, 0xbfe2e4, 0.9);
    g.lineBetween(0, 4, 10, 4);
    g.lineBetween(10, 4, 7, 1);
    g.lineBetween(10, 4, 7, 7);
    g.generateTexture(key, 12, 8);
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

  private makeFortWall(key: string, damaged = false): void {
    const w = 56;
    const h = 70;
    const g = this.add.graphics();
    // Alapzat (sötét)
    g.fillStyle(0x4a4238, 1);
    g.fillRect(0, 10, w, h - 10);
    // Kő blokkok
    g.fillStyle(0x7a7366, 1);
    g.fillRect(2, 12, w - 4, h - 14);
    // Kő-fugák (világosabb vonalak)
    g.fillStyle(0x9a9388, 1);
    for (let row = 0; row < 6; row++) {
      const y = 14 + row * 10;
      const offset = row % 2 === 0 ? 0 : 6;
      for (let x = offset; x < w - 4; x += 14) {
        g.fillRect(3 + x, y, 10, 1);
      }
      g.fillRect(3, y + 4, w - 6, 1);
    }
    // Pártázat (crenellations)
    g.fillStyle(0x7a7366, 1);
    for (let i = 0; i < 5; i++) {
      g.fillRect(i * 12 + 2, 0, 8, 14);
    }
    g.fillStyle(0x4a4238, 1);
    for (let i = 0; i < 5; i++) {
      g.fillRect(i * 12 + 2, 10, 8, 2);
    }
    // Árnyék
    g.fillStyle(0x2a2520, 0.7);
    g.fillRect(0, h - 4, w, 4);
    // Sérülés — ha damaged, rajzolj fekete repedéseket és hiányzó darabokat
    if (damaged) {
      g.fillStyle(0x1a1410, 1);
      g.fillCircle(18, 28, 6);
      g.fillCircle(36, 44, 8);
      g.fillRect(8, 2, 6, 12);
      g.fillRect(34, 0, 6, 10);
      // Repedések
      g.lineStyle(1, 0x1a1410, 1);
      g.lineBetween(12, 18, 20, 40);
      g.lineBetween(30, 24, 42, 50);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeFortCannon(key: string): void {
    const w = 24;
    const h = 16;
    const g = this.add.graphics();
    // Kerék
    g.fillStyle(0x5a3a1a, 1);
    g.fillCircle(6, 12, 4);
    g.fillStyle(0x2a1a0a, 1);
    g.fillCircle(6, 12, 2);
    // Test (fa szekér)
    g.fillStyle(0x6b4a2b, 1);
    g.fillRect(2, 8, 16, 4);
    // Cső (fém)
    g.fillStyle(0x2a2a2a, 1);
    g.fillRoundedRect(4, 4, 18, 5, 1);
    g.fillStyle(0x4a4a4a, 1);
    g.fillRect(4, 5, 16, 1);
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(20, 5, 2, 3);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeFortKeep(key: string): void {
    const w = 50;
    const h = 86;
    const g = this.add.graphics();
    // Árnyék
    g.fillStyle(0x3a3028, 1);
    g.fillRect(0, 20, w, h - 20);
    // Fal
    g.fillStyle(0x8a7a66, 1);
    g.fillRect(3, 22, w - 6, h - 24);
    // Kő-fugák
    g.fillStyle(0x6a5a48, 1);
    for (let row = 0; row < 7; row++) {
      const y = 26 + row * 8;
      const off = row % 2 === 0 ? 0 : 5;
      for (let x = off; x < w - 6; x += 10) {
        g.fillRect(4 + x, y, 8, 1);
      }
    }
    // Tető pártázat
    g.fillStyle(0x6a5a48, 1);
    for (let i = 0; i < 4; i++) {
      g.fillRect(3 + i * 11, 12, 8, 14);
    }
    g.fillStyle(0x3a3028, 1);
    for (let i = 0; i < 4; i++) {
      g.fillRect(3 + i * 11, 22, 8, 2);
    }
    // Ablakok (keresztrács)
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(12, 36, 4, 8);
    g.fillRect(34, 36, 4, 8);
    // Főkapu
    g.fillStyle(0x1a1a1a, 1);
    g.fillRoundedRect(20, 62, 10, 20, 2);
    g.fillStyle(0x4a3a28, 1);
    g.fillRect(24, 64, 2, 16);
    // Zászló
    g.fillStyle(0x2a2a2a, 1);
    g.fillRect(24, 0, 2, 14);
    g.fillStyle(0xd04040, 1);
    g.fillTriangle(26, 2, 40, 5, 26, 10);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makePowderBarrel(key: string): void {
    const w = 16;
    const h = 18;
    const g = this.add.graphics();
    g.fillStyle(0x3a2a1a, 1);
    g.fillRoundedRect(1, 2, w - 2, h - 2, 3);
    g.fillStyle(0x6b4a2b, 1);
    g.fillRect(3, 4, w - 6, h - 6);
    g.fillStyle(0x3a2a1a, 1);
    g.fillRect(3, 8, w - 6, 1);
    g.fillRect(3, 12, w - 6, 1);
    // Kanóc
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(w / 2, 0, 1, 3);
    g.fillStyle(0xff6a3d, 1);
    g.fillCircle(w / 2, 1, 1);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeGuard(key: string): void {
    const w = 10;
    const h = 16;
    const g = this.add.graphics();
    // Test
    g.fillStyle(0x4f6ba6, 1);
    g.fillRect(2, 6, 6, 7);
    // Fej
    g.fillStyle(0xe0b24f, 1);
    g.fillCircle(5, 4, 3);
    // Tollas sisak
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(2, 1, 6, 2);
    // Musket
    g.fillStyle(0x2a1a0a, 1);
    g.fillRect(7, 4, 3, 1);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeAimDot(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0xe0b24f, 1);
    g.fillCircle(2, 2, 2);
    g.generateTexture(key, 4, 4);
    g.destroy();
  }

  private makeMuzzleFlash(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0xffcc66, 1);
    g.fillCircle(6, 6, 6);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 3);
    g.generateTexture(key, 12, 12);
    g.destroy();
  }
}
