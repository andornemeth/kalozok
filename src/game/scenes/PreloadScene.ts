import Phaser from 'phaser';

/**
 * Minden sprite procedurálisan kerül legenerálásra, hogy ne kelljen binárisan szállítani assetet.
 * A hajótest/vitorla/zászló külön textúra: a vitorlák egyenként reagálhatnak a szélre.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    this.makeHull('hull-player', 0x5c3a1e, 0x8a5a2b, 0xe0b24f, 0xfbf5e3);
    this.makeHull('hull-enemy', 0x2e1717, 0x5c2a22, 0xb94a3b, 0xe8d28a);
    this.makeHull('hull-navy', 0x1c2b3f, 0x2d4466, 0x4f8bff, 0xfbf5e3);
    this.makeHull('hull-merchant', 0x3a5a3a, 0x4a7a5a, 0x94cfd2, 0xfbf5e3);

    this.makeSquareSail('sail-main', 24, 30, 0xfbf5e3, 0xd9c99a, 0x9a8a5f);
    this.makeSquareSail('sail-fore', 20, 24, 0xfbf5e3, 0xd9c99a, 0x9a8a5f);
    this.makeSquareSail('sail-mizzen', 22, 26, 0xfbf5e3, 0xd9c99a, 0x9a8a5f);

    this.makeSquareSail('sail-enemy-main', 24, 30, 0xffb7a5, 0xb94a3b, 0x7a2e0e);
    this.makeSquareSail('sail-enemy-fore', 20, 24, 0xffb7a5, 0xb94a3b, 0x7a2e0e);
    this.makeSquareSail('sail-enemy-mizzen', 22, 26, 0xffb7a5, 0xb94a3b, 0x7a2e0e);

    this.makeSquareSail('sail-navy-main', 24, 30, 0xd8e4ff, 0x8fa9d9, 0x4f6ba6);
    this.makeSquareSail('sail-navy-fore', 20, 24, 0xd8e4ff, 0x8fa9d9, 0x4f6ba6);
    this.makeSquareSail('sail-navy-mizzen', 22, 26, 0xd8e4ff, 0x8fa9d9, 0x4f6ba6);

    this.makeFlag('flag-pirate', 0x0a0a0a, 0xfbf5e3);
    this.makeFlag('flag-england', 0xd04040, 0xfbf5e3);
    this.makeFlag('flag-spain', 0xf2c94c, 0xd04040);
    this.makeFlag('flag-france', 0x4f8bff, 0xfbf5e3);
    this.makeFlag('flag-netherlands', 0xff8c42, 0xfbf5e3);

    this.makeWake('wake');
    this.makeTargetMarker('target-marker');
    this.makeShadow('ship-shadow');

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

    this.scene.start('World');
  }

  private makeHull(key: string, shadow: number, sideDark: number, side: number, deck: number): void {
    const w = 72;
    const h = 28;
    const g = this.add.graphics();
    // Hajótest sziluett — hegyes orr jobbra, lekerekített far balra
    const path = new Phaser.Geom.Polygon([
      10, 3,        // far-felső
      w - 10, 4,    // orr közelében felül
      w - 2, h / 2, // orr csúcsa
      w - 10, h - 4,
      10, h - 3,
      3, h / 2,
    ]);
    g.fillStyle(shadow, 1);
    g.fillPoints(path.points, true);
    // Oldal (sötét csík)
    g.fillStyle(sideDark, 1);
    g.fillPoints(
      [
        { x: 12, y: 5 },
        { x: w - 12, y: 6 },
        { x: w - 4, y: h / 2 },
        { x: w - 12, y: h - 6 },
        { x: 12, y: h - 5 },
        { x: 5, y: h / 2 },
      ],
      true,
    );
    // Oldal világosabb pixelsor
    g.fillStyle(side, 1);
    g.fillRect(14, h / 2 - 1, w - 28, 2);
    // Lőrések — apró fekete pixelek oldalt
    g.fillStyle(0x04141a, 1);
    for (let i = 0; i < 5; i++) {
      g.fillRect(18 + i * 7, h / 2 - 5, 2, 2);
      g.fillRect(18 + i * 7, h / 2 + 3, 2, 2);
    }
    // Fedélzet (belső világosabb rész)
    g.fillStyle(deck, 1);
    g.fillPoints(
      [
        { x: 16, y: 8 },
        { x: w - 16, y: 9 },
        { x: w - 12, y: h / 2 },
        { x: w - 16, y: h - 9 },
        { x: 16, y: h - 8 },
        { x: 12, y: h / 2 },
      ],
      true,
    );
    // Fedélzeti palánkok
    g.fillStyle(shadow, 0.6);
    for (let i = 0; i < 6; i++) {
      g.fillRect(18 + i * 8, h / 2 - 4, 1, 8);
    }
    // Orrdísz (bowsprit)
    g.fillStyle(shadow, 1);
    g.fillTriangle(w - 2, h / 2 - 1, w + 2, h / 2, w - 2, h / 2 + 1);
    // Árbocok helye (fekete pöttyök)
    g.fillStyle(0x04141a, 1);
    g.fillCircle(w / 2 - 18, h / 2, 2.5);
    g.fillCircle(w / 2, h / 2, 3);
    g.fillCircle(w / 2 + 18, h / 2, 2.5);
    g.generateTexture(key, w + 4, h);
    g.destroy();
  }

  private makeSquareSail(key: string, w: number, h: number, light: number, mid: number, dark: number): void {
    const g = this.add.graphics();
    // Keret (kötél/spanyolgallér)
    g.fillStyle(0x3a2a1a, 1);
    g.fillRect(0, 0, w, 2);
    g.fillRect(0, h - 2, w, 2);
    // Vitorla alap (kicsit lekerekített, bufflal)
    g.fillStyle(mid, 1);
    g.fillRoundedRect(1, 2, w - 2, h - 4, 2);
    // Billow — függőleges redők, világosabb/sötétebb sávokkal
    g.fillStyle(light, 1);
    g.fillRect(3, 3, w - 6, h - 6);
    g.fillStyle(mid, 0.55);
    g.fillRect(4, 3, 2, h - 6);
    g.fillRect(w - 6, 3, 2, h - 6);
    g.fillRect(w / 2 - 1, 3, 2, h - 6);
    // Árnyék él
    g.fillStyle(dark, 0.9);
    g.fillRect(1, h - 3, w - 2, 1);
    g.fillRect(1, 2, w - 2, 1);
    // Kötélzet (két ferde vékony vonal)
    g.lineStyle(1, 0x3a2a1a, 0.7);
    g.lineBetween(1, 3, w - 1, h - 3);
    g.lineBetween(w - 1, 3, 1, h - 3);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeFlag(key: string, base: number, stripe: number): void {
    const w = 14;
    const h = 8;
    const g = this.add.graphics();
    g.fillStyle(0x04141a, 1);
    g.fillRect(0, 0, 1, h);
    g.fillStyle(base, 1);
    // Háromszög zászló
    g.fillTriangle(1, 0, w - 1, h / 2, 1, h);
    g.fillStyle(stripe, 1);
    g.fillRect(2, h / 2 - 1, w - 5, 1);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeWake(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture(key, 8, 8);
    g.destroy();
  }

  private makeShadow(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0x04141a, 0.5);
    g.fillEllipse(36, 14, 72, 22);
    g.generateTexture(key, 72, 28);
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
    // Apró épület bástyával
    g.fillStyle(0x04141a, 1);
    g.fillRoundedRect(0, 6, 26, 18, 3);
    g.fillStyle(color, 1);
    g.fillRoundedRect(2, 8, 22, 14, 2);
    // Ablakok
    g.fillStyle(0xfbf5e3, 1);
    g.fillRect(6, 12, 3, 3);
    g.fillRect(11, 12, 3, 3);
    g.fillRect(16, 12, 3, 3);
    // Zászlórúd + zászló
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
    // Törzs
    g.fillStyle(0x4a2e1a, 1);
    g.fillRect(5, 6, 2, 6);
    // Levelek (4 irányba kisugárzó)
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
}
