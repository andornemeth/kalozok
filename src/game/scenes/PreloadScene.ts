import Phaser from 'phaser';

/**
 * Procedurally builds all sprites so we don't ship binary assets.
 * Hull, sail and flag are separate textures so sails can react to the wind.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    this.makeHull('hull-player', 0xb99137, 0xe0b24f);
    this.makeHull('hull-enemy', 0x8b3a2b, 0xb94a3b);
    this.makeHull('hull-navy', 0x3a567a, 0x4f8bff);
    this.makeHull('hull-merchant', 0x4a8f93, 0x94cfd2);

    this.makeSail('sail-white', 0xfbf5e3, 0xd9c99a);
    this.makeSail('sail-tan', 0xe8d28a, 0xb99137);
    this.makeSail('sail-red', 0xff9f87, 0xb94a3b);
    this.makeSail('sail-blue', 0xb7d1ff, 0x4f8bff);

    this.makeFlag('flag-pirate', 0x0a0a0a, 0xfbf5e3);
    this.makeFlag('flag-england', 0xd04040, 0xfbf5e3);
    this.makeFlag('flag-spain', 0xf2c94c, 0xd04040);
    this.makeFlag('flag-france', 0x4f8bff, 0xfbf5e3);
    this.makeFlag('flag-netherlands', 0xff8c42, 0xfbf5e3);

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

    this.scene.start('World');
  }

  private makeHull(key: string, deck: number, hull: number): void {
    const w = 48;
    const h = 24;
    const g = this.add.graphics();
    g.fillStyle(0x04141a, 1);
    g.fillRoundedRect(6, 6, w - 12, h - 10, 3);
    g.fillStyle(hull, 1);
    g.fillRoundedRect(7, 7, w - 14, h - 12, 2);
    g.fillStyle(deck, 1);
    g.fillRect(10, 9, w - 20, 2);
    g.fillStyle(0x04141a, 1);
    g.fillTriangle(w - 8, 10, w - 2, 12, w - 8, 14);
    g.fillRect(7, 11, 3, 2);
    g.fillStyle(hull, 1);
    g.fillTriangle(2, 12, 7, 10, 7, 14);
    g.fillStyle(0x2a2a2a, 1);
    g.fillRect(w / 2 - 1, 2, 2, 10);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeSail(key: string, light: number, dark: number): void {
    const w = 32;
    const h = 40;
    const g = this.add.graphics();
    g.fillStyle(0x04141a, 1);
    g.fillRect(w / 2 - 1, 0, 2, h);
    g.fillStyle(dark, 1);
    g.fillRoundedRect(2, 4, w - 4, h - 10, 6);
    g.fillStyle(light, 1);
    g.fillRoundedRect(3, 5, w - 6, h - 12, 5);
    g.fillStyle(dark, 1);
    g.fillRect(3, (h - 10) / 2 + 3, w - 6, 1);
    g.fillStyle(0x04141a, 1);
    g.fillRect(3, 5, w - 6, 1);
    g.fillRect(3, h - 8, w - 6, 1);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeFlag(key: string, base: number, stripe: number): void {
    const w = 16;
    const h = 10;
    const g = this.add.graphics();
    g.fillStyle(0x04141a, 1);
    g.fillRect(0, 0, 1, h);
    g.fillStyle(base, 1);
    g.fillRect(1, 0, w - 1, h);
    g.fillStyle(stripe, 1);
    g.fillRect(1, 3, w - 1, 2);
    g.fillRect(1, h - 3, w - 1, 1);
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
    g.fillRoundedRect(0, 4, 24, 20, 4);
    g.fillStyle(color, 1);
    g.fillRoundedRect(2, 6, 20, 16, 3);
    g.fillStyle(0xfbf5e3, 1);
    g.fillTriangle(11, 10, 19, 14, 11, 18);
    g.fillRect(11, 2, 2, 12);
    g.generateTexture(key, 24, 24);
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
}
