import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { EncounterScene } from './scenes/EncounterScene';
import { NavalBattleScene } from './scenes/NavalBattleScene';
import { DuelScene } from './scenes/DuelScene';
import { LandBattleScene } from './scenes/LandBattleScene';
import { TreasureHuntScene } from './scenes/TreasureHuntScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#04141a',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    input: { activePointers: 3 },
    scene: [BootScene, PreloadScene, WorldMapScene, EncounterScene, NavalBattleScene, DuelScene, LandBattleScene, TreasureHuntScene],
  });
}
