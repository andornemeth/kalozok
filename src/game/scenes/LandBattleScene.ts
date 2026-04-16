import Phaser from 'phaser';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { vibrate } from '@/utils/haptics';

type Unit = 'buccaneer' | 'soldier' | 'cavalry';

interface Lane {
  units: { side: 'player' | 'enemy'; type: Unit; hp: number }[];
  enemyTimer: number;
}

export class LandBattleScene extends Phaser.Scene {
  private lanes: Lane[] = [];
  private playerTroops = 40;
  private enemyTroops = 40;
  private selected: Unit = 'buccaneer';
  private ended = false;

  constructor() {
    super('Land');
  }

  create(): void {
    bus.emit('scene:changed', { key: 'land' });
    this.cameras.main.setBackgroundColor('#3a6d3a');
    this.add
      .text(this.scale.width / 2, 10, 'OSTROM', { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#fbf5e3' })
      .setOrigin(0.5, 0);

    for (let i = 0; i < 3; i++) this.lanes.push({ units: [], enemyTimer: 2000 + i * 800 });
    this.drawLanes();
    this.createUnitButtons();
    this.createLaneButtons();
  }

  private drawLanes(): void {
    const laneHeight = this.scale.height / 4;
    for (let i = 0; i < 3; i++) {
      this.add.rectangle(this.scale.width / 2, 60 + i * laneHeight, this.scale.width, laneHeight - 6, 0x2f5a2f, 0.9);
    }
  }

  private createUnitButtons(): void {
    const units: { id: Unit; label: string; color: number }[] = [
      { id: 'buccaneer', label: 'KALÓZ', color: 0xb99137 },
      { id: 'soldier', label: 'KATONA', color: 0x4f8bff },
      { id: 'cavalry', label: 'LOVAS', color: 0xd04040 },
    ];
    units.forEach((u, i) => {
      const x = 60 + i * 90;
      const y = this.scale.height - 40;
      const bg = this.add.rectangle(x, y, 80, 40, u.color, 0.95).setStrokeStyle(2, 0xfbf5e3);
      this.add
        .text(x, y, u.label, { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fbf5e3' })
        .setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerup', () => {
        this.selected = u.id;
        this.refreshHighlight();
      });
      bg.setData('unit', u.id);
    });
    this.refreshHighlight();
  }

  private refreshHighlight(): void {
    this.children.list.forEach((obj) => {
      if (obj instanceof Phaser.GameObjects.Rectangle && obj.getData('unit')) {
        const u = obj.getData('unit') as Unit;
        obj.setStrokeStyle(u === this.selected ? 4 : 2, u === this.selected ? 0xe0b24f : 0xfbf5e3);
      }
    });
  }

  private createLaneButtons(): void {
    const laneHeight = this.scale.height / 4;
    for (let i = 0; i < 3; i++) {
      const y = 60 + i * laneHeight + (laneHeight - 6) / 2;
      const bg = this.add.rectangle(60, y, 70, 38, 0x145f65, 0.95).setStrokeStyle(2, 0xfbf5e3);
      this.add
        .text(60, y, 'KÜLD', { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fbf5e3' })
        .setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerup', () => this.deploy(i));
    }
  }

  private deploy(laneIdx: number): void {
    if (this.ended || this.playerTroops <= 0) return;
    this.lanes[laneIdx]!.units.push({ side: 'player', type: this.selected, hp: 20 });
    this.playerTroops--;
    vibrate('light');
    this.drawUnit(laneIdx, 'player', this.selected);
  }

  private drawUnit(laneIdx: number, side: 'player' | 'enemy', type: Unit): void {
    const laneHeight = this.scale.height / 4;
    const y = 60 + laneIdx * laneHeight + (laneHeight - 6) / 2;
    const color = type === 'buccaneer' ? 0xe0b24f : type === 'soldier' ? 0x4f8bff : 0xd04040;
    const x = side === 'player' ? 140 : this.scale.width - 140;
    const sprite = this.add.rectangle(x, y, 16, 24, color).setStrokeStyle(2, 0x04141a);
    sprite.setData('side', side);
    sprite.setData('type', type);
    sprite.setData('lane', laneIdx);
    sprite.setData('hp', 20);
  }

  update(_t: number, dt: number): void {
    if (this.ended) return;
    for (let i = 0; i < this.lanes.length; i++) {
      const lane = this.lanes[i]!;
      lane.enemyTimer -= dt;
      if (lane.enemyTimer <= 0 && this.enemyTroops > 0) {
        const types: Unit[] = ['buccaneer', 'soldier', 'cavalry'];
        const t = types[Math.floor(Math.random() * 3)]!;
        lane.units.push({ side: 'enemy', type: t, hp: 20 });
        this.enemyTroops--;
        this.drawUnit(i, 'enemy', t);
        lane.enemyTimer = 2500 + Math.random() * 1500;
      }
    }
    this.stepUnits(dt);
    this.checkEnd();
  }

  private stepUnits(dt: number): void {
    const laneHeight = this.scale.height / 4;
    const rects = this.children.list.filter(
      (o): o is Phaser.GameObjects.Rectangle => o instanceof Phaser.GameObjects.Rectangle && !!o.getData('side'),
    );
    for (const r of rects) {
      const side = r.getData('side') as 'player' | 'enemy';
      const speed = 0.04 * (r.getData('type') === 'cavalry' ? 1.6 : r.getData('type') === 'buccaneer' ? 1.2 : 1);
      r.x += (side === 'player' ? 1 : -1) * speed * dt;
    }
    for (let li = 0; li < 3; li++) {
      const laneRects = rects.filter((r) => r.getData('lane') === li);
      const y = 60 + li * laneHeight + (laneHeight - 6) / 2;
      for (const a of laneRects) {
        for (const b of laneRects) {
          if (a === b || a.getData('side') === b.getData('side')) continue;
          if (Math.abs(a.x - b.x) < 22 && Math.abs(a.y - y) < 12) {
            const result = this.rps(a.getData('type'), b.getData('type'));
            const dmgA = 0.02 * dt * (result === 'lose' ? 2 : result === 'tie' ? 1 : 0.5);
            const dmgB = 0.02 * dt * (result === 'win' ? 2 : result === 'tie' ? 1 : 0.5);
            a.setData('hp', (a.getData('hp') as number) - dmgA);
            b.setData('hp', (b.getData('hp') as number) - dmgB);
            if ((a.getData('hp') as number) <= 0) a.destroy();
            if ((b.getData('hp') as number) <= 0) b.destroy();
          }
        }
      }
    }
  }

  private rps(a: Unit, b: Unit): 'win' | 'lose' | 'tie' {
    if (a === b) return 'tie';
    if ((a === 'buccaneer' && b === 'cavalry') || (a === 'cavalry' && b === 'soldier') || (a === 'soldier' && b === 'buccaneer'))
      return 'win';
    return 'lose';
  }

  private checkEnd(): void {
    const rects = this.children.list.filter(
      (o): o is Phaser.GameObjects.Rectangle => o instanceof Phaser.GameObjects.Rectangle && !!o.getData('side'),
    );
    const playerOnField = rects.filter((r) => r.getData('side') === 'player').length;
    const enemyOnField = rects.filter((r) => r.getData('side') === 'enemy').length;
    if (this.enemyTroops <= 0 && enemyOnField === 0) this.finish('victory');
    else if (this.playerTroops <= 0 && playerOnField === 0) this.finish('defeat');
  }

  private finish(outcome: 'victory' | 'defeat'): void {
    if (this.ended) return;
    this.ended = true;
    const g = useGame.getState();
    if (outcome === 'victory') {
      g.addGold(600 + Math.floor(Math.random() * 800));
      g.unlockAchievement('city-conqueror');
      g.adjustMorale(+15);
    } else {
      g.adjustMorale(-12);
      g.damageShip(0, 0, 8);
    }
    bus.emit('land:end', { outcome });
    this.scene.start('World');
  }
}
