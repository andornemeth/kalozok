import Phaser from 'phaser';

/**
 * Procedurally builds all sprites the game needs so we don't ship binary assets.
 * Every texture is drawn once via a Graphics helper and snapshot via generateTexture.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    this.makeShip('ship-player', 0xe0b24f, 0xffffff);
    this.makeShip('ship-enemy', 0xb94a3b, 0xe8d28a);
    this.makeShip('ship-merchant', 0x94cfd2, 0xffffff);
    this.makeShip('ship-navy', 0x4a6fa5, 0xffffff);

    this.makePortMarker('port-eng', 0xd04040);
    this.makePortMarker('port-esp', 0xf2c94c);
    this.makePortMarker('port-fra', 0x4f8bff);
    this.makePortMarker('port-ned', 0xff8c42);
    this.makePortMarker('port-pir', 0x333333);

    this.makeCannonball('cannonball-round', 0x1c1c1c);
    this.makeCannonball('cannonball-chain', 0x5a5a5a);
    this.makeCannonball('cannonball-grape', 0x9a5d3b);
    this.makeSplash('splash');
    this.makeExplosion('explosion');
    this.makeWindArrow('wind-arrow');
    this.makeTreasureX('treasure-x');

    this.scene.start('World');
  }

  private makeShip(key: string, hullColor: number, sailColor: number): void {
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0x04141a, 0);
    g.fillRect(0, 0, 48, 48);
    g.fillStyle(hullColor, 1);
    g.fillTriangle(6, 30, 42, 30, 40, 38);
    g.fillRect(10, 28, 28, 4);
    g.fillStyle(0x2a2a2a, 1);
    g.fillRect(22, 8, 4, 22);
    g.fillStyle(sailColor, 1);
    g.fillTriangle(24, 10, 36, 24, 24, 24);
    g.fillTriangle(24, 10, 12, 24, 24, 24);
    g.fillStyle(0x000000, 1);
    g.fillRect(22, 6, 4, 4);
    g.generateTexture(key, 48, 48);
    g.destroy();
  }

  private makePortMarker(key: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(12, 12, 8);
    g.lineStyle(2, 0xfbf5e3, 1);
    g.strokeCircle(12, 12, 8);
    g.fillStyle(0xfbf5e3, 1);
    g.fillRect(10, 4, 4, 6);
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
    g.lineStyle(2, 0xbfe2e4, 0.8);
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
