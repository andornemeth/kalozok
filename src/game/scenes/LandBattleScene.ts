import Phaser from 'phaser';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { vibrate } from '@/utils/haptics';
import { checkQuestCompletion } from '@/game/systems/QuestSystem';

type UnitType = 'buccaneer' | 'soldier' | 'cavalry';
type Side = 'player' | 'enemy';

interface Unit {
  rect: Phaser.GameObjects.Container;
  side: Side;
  type: UnitType;
  hp: number;
  speed: number;
  lane: number;
  cooldown: number;
}

interface Gate {
  side: Side;
  lane: number;
  hp: number;
  hpMax: number;
  x: number;
  y: number;
  bar: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}

const UNIT_COLORS: Record<UnitType, number> = {
  buccaneer: 0xe0b24f,
  soldier: 0x4f8bff,
  cavalry: 0xd04040,
};

const UNIT_LABEL: Record<UnitType, string> = {
  buccaneer: 'KAL',
  soldier: 'KAT',
  cavalry: 'LOV',
};

const UNIT_STATS: Record<UnitType, { hp: number; speed: number; cost: number }> = {
  buccaneer: { hp: 22, speed: 0.055, cost: 1 },
  soldier: { hp: 28, speed: 0.040, cost: 1 },
  cavalry: { hp: 20, speed: 0.078, cost: 2 },
};

const GATE_MAX_HP = 60;
const MATCH_MAX = 120000;

export class LandBattleScene extends Phaser.Scene {
  private units: Unit[] = [];
  private gates: Gate[] = [];
  private selected: UnitType = 'buccaneer';
  private playerPool = 28;
  private enemyPool = 28;
  private enemyTimers: number[] = [3000, 5500, 7000];
  private elapsed = 0;
  private ended = false;

  private poolLabel!: Phaser.GameObjects.Text;
  private enemyLabel!: Phaser.GameObjects.Text;
  private statusLabel!: Phaser.GameObjects.Text;
  private unitButtons: Phaser.GameObjects.Container[] = [];
  private laneHeight = 0;
  private leftX = 80;
  private rightX = 0;

  constructor() {
    super('Land');
  }

  create(): void {
    bus.emit('scene:changed', { key: 'land' });
    this.cameras.main.fadeIn(350, 4, 20, 26);
    this.ended = false;
    this.units = [];
    this.gates = [];
    this.unitButtons = [];
    this.playerPool = 28;
    this.enemyPool = 28;
    this.enemyTimers = [3000, 5500, 7000];
    this.elapsed = 0;

    this.rightX = this.scale.width - 80;
    this.drawBackground();
    this.createLanes();
    this.createGates();
    this.createHud();
    this.createControls();
    this.scale.on('resize', () => this.layoutHud());
    this.layoutHud();
  }

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillStyle(0x3a6d3a, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
    // Két part — bal oldalon homokos tengerpart, jobbon város-kavicsos
    g.fillStyle(0xe8d28a, 1);
    g.fillRect(0, 0, 40, this.scale.height);
    g.fillStyle(0x7a7a7a, 1);
    g.fillRect(this.scale.width - 40, 0, 40, this.scale.height);
    // Víz bal oldalon
    g.fillStyle(0x1a7f86, 1);
    g.fillRect(0, 0, 8, this.scale.height);
  }

  private createLanes(): void {
    const topOffset = 70;
    const bottomOffset = 110;
    const usable = this.scale.height - topOffset - bottomOffset;
    this.laneHeight = usable / 3;
    const g = this.add.graphics();
    for (let i = 0; i < 3; i++) {
      const y = topOffset + i * this.laneHeight;
      g.fillStyle(i % 2 === 0 ? 0x2f5a2f : 0x346434, 1);
      g.fillRect(8, y + 2, this.scale.width - 16, this.laneHeight - 4);
      // Útpálya
      g.fillStyle(0x5a4a2a, 0.3);
      g.fillRect(40, y + this.laneHeight / 2 - 4, this.scale.width - 80, 8);
    }
  }

  private createGates(): void {
    const topOffset = 70;
    for (let i = 0; i < 3; i++) {
      const y = topOffset + i * this.laneHeight + this.laneHeight / 2;
      this.gates.push(this.makeGate('player', i, 40, y));
      this.gates.push(this.makeGate('enemy', i, this.scale.width - 40, y));
    }
  }

  private makeGate(side: Side, lane: number, x: number, y: number): Gate {
    const color = side === 'player' ? 0xe0b24f : 0xb94a3b;
    const dark = side === 'player' ? 0x8b5a2b : 0x5c2a22;
    // Falsziluett
    const g = this.add.graphics();
    g.fillStyle(dark, 1);
    g.fillRoundedRect(x - 14, y - 20, 28, 40, 4);
    g.fillStyle(color, 1);
    g.fillRoundedRect(x - 10, y - 16, 20, 32, 3);
    // Kapuív
    g.fillStyle(0x04141a, 1);
    g.fillRoundedRect(x - 6, y - 8, 12, 14, 3);
    // Zászló
    g.fillStyle(dark, 1);
    g.fillRect(x - 1, y - 30, 2, 10);
    g.fillStyle(side === 'player' ? 0xfbf5e3 : 0x04141a, 1);
    g.fillTriangle(x + 1, y - 28, x + 8, y - 25, x + 1, y - 22);

    const bar = this.add.graphics();
    const label = this.add
      .text(x, y + 26, '', { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#fbf5e3' })
      .setOrigin(0.5);

    const gate: Gate = { side, lane, hp: GATE_MAX_HP, hpMax: GATE_MAX_HP, x, y, bar, label };
    this.drawGateBar(gate);
    return gate;
  }

  private drawGateBar(g: Gate): void {
    g.bar.clear();
    const w = 28;
    const h = 4;
    const bx = g.x - w / 2;
    const by = g.y + 16;
    g.bar.fillStyle(0x04141a, 0.8);
    g.bar.fillRect(bx, by, w, h);
    g.bar.fillStyle(g.side === 'player' ? 0xe0b24f : 0xb94a3b, 1);
    g.bar.fillRect(bx, by, Math.max(0, (g.hp / g.hpMax) * w), h);
    g.label.setText(`${Math.max(0, Math.round(g.hp))}`);
  }

  private createHud(): void {
    this.add
      .text(this.scale.width / 2, 10, 'VÁROSOSTROM', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#fbf5e3',
        stroke: '#04141a',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(10);
    this.poolLabel = this.add
      .text(16, 38, '', { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#e0b24f' })
      .setDepth(10);
    this.enemyLabel = this.add
      .text(this.scale.width - 16, 38, '', { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#b94a3b' })
      .setOrigin(1, 0)
      .setDepth(10);
    this.statusLabel = this.add
      .text(this.scale.width / 2, 38, '', { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fbf5e3' })
      .setOrigin(0.5, 0)
      .setDepth(10);
    this.refreshLabels();
  }

  private createControls(): void {
    const units: UnitType[] = ['buccaneer', 'soldier', 'cavalry'];
    units.forEach((u, i) => {
      const x = 70 + i * 110;
      const y = this.scale.height - 50;
      const btn = this.button(x, y, 100, 46, UNIT_COLORS[u], `${UNIT_LABEL[u]}\n${UNIT_STATS[u].cost}fő`, () => {
        this.selected = u;
        this.refreshUnitButtons();
        vibrate('light');
      });
      btn.setData('unit', u);
      this.unitButtons.push(btn);
    });
    this.refreshUnitButtons();

    const topOffset = 70;
    for (let i = 0; i < 3; i++) {
      const y = topOffset + i * this.laneHeight + this.laneHeight / 2;
      this.button(this.scale.width / 2, y, 80, 30, 0x145f65, 'KÜLD', () => this.deploy(i));
    }
  }

  private button(
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    text: string,
    onTap: () => void,
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(11);
    const bg = this.add.rectangle(0, 0, w, h, color, 0.95).setStrokeStyle(2, 0xfbf5e3);
    const label = this.add
      .text(0, 0, text, { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fbf5e3', align: 'center' })
      .setOrigin(0.5);
    c.add([bg, label]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerup', onTap);
    c.on('pointerdown', () => bg.setFillStyle(color, 0.7));
    c.on('pointerout', () => bg.setFillStyle(color, 0.95));
    return c;
  }

  private refreshUnitButtons(): void {
    for (const b of this.unitButtons) {
      const bg = b.list[0] as Phaser.GameObjects.Rectangle;
      const u = b.getData('unit') as UnitType;
      bg.setStrokeStyle(u === this.selected ? 4 : 2, u === this.selected ? 0xe0b24f : 0xfbf5e3);
    }
  }

  private layoutHud(): void {
    this.rightX = this.scale.width - 80;
    this.refreshLabels();
  }

  private refreshLabels(): void {
    this.poolLabel.setText(`Sereged: ${this.playerPool}`);
    this.enemyLabel.setText(`Védők: ${this.enemyPool}`);
  }

  private deploy(lane: number): void {
    if (this.ended) return;
    const stat = UNIT_STATS[this.selected];
    if (this.playerPool < stat.cost) {
      this.flashStatus('Nincs elég ember!');
      return;
    }
    this.playerPool -= stat.cost;
    this.spawnUnit('player', this.selected, lane);
    this.refreshLabels();
  }

  private spawnUnit(side: Side, type: UnitType, lane: number): void {
    const topOffset = 70;
    const y = topOffset + lane * this.laneHeight + this.laneHeight / 2 + (Math.random() - 0.5) * 10;
    const x = side === 'player' ? this.leftX : this.rightX;
    const container = this.add.container(x, y).setDepth(7);
    const body = this.add.rectangle(0, 0, 12, 16, UNIT_COLORS[type]).setStrokeStyle(2, 0x04141a);
    const head = this.add.circle(0, -10, 4, UNIT_COLORS[type]).setStrokeStyle(1, 0x04141a);
    container.add([body, head]);
    if (side === 'enemy') {
      container.setScale(-1, 1);
    }
    const stat = UNIT_STATS[type];
    this.units.push({
      rect: container,
      side,
      type,
      hp: stat.hp,
      speed: stat.speed,
      lane,
      cooldown: 0,
    });
  }

  private flashStatus(msg: string): void {
    this.statusLabel.setText(msg);
    this.time.delayedCall(1200, () => this.statusLabel.setText(''));
  }

  update(_t: number, dt: number): void {
    if (this.ended) return;
    this.elapsed += dt;

    this.aiSpawn(dt);
    this.stepUnits(dt);
    this.resolveCombat(dt);
    this.resolveGates(dt);
    this.cleanup();
    for (const g of this.gates) this.drawGateBar(g);
    this.checkEnd();
  }

  private aiSpawn(dt: number): void {
    for (let lane = 0; lane < 3; lane++) {
      this.enemyTimers[lane]! -= dt;
      if (this.enemyTimers[lane]! <= 0 && this.enemyPool > 0) {
        const choice: UnitType[] = ['buccaneer', 'soldier', 'cavalry'];
        const type = choice[Math.floor(Math.random() * choice.length)]!;
        const cost = UNIT_STATS[type].cost;
        if (this.enemyPool >= cost) {
          this.enemyPool -= cost;
          this.spawnUnit('enemy', type, lane);
          this.refreshLabels();
        }
        this.enemyTimers[lane] = 3000 + Math.random() * 2500;
      }
    }
  }

  private stepUnits(dt: number): void {
    for (const u of this.units) {
      if (u.cooldown > 0) {
        u.cooldown -= dt;
        continue;
      }
      const enemiesAhead = this.units.some(
        (o) => o.side !== u.side && o.lane === u.lane && Math.abs(o.rect.x - u.rect.x) < 22,
      );
      if (!enemiesAhead) {
        u.rect.x += (u.side === 'player' ? 1 : -1) * u.speed * dt;
      }
    }
  }

  private resolveCombat(dt: number): void {
    for (const a of this.units) {
      for (const b of this.units) {
        if (a === b || a.side === b.side || a.lane !== b.lane) continue;
        const d = Math.abs(a.rect.x - b.rect.x);
        if (d < 22) {
          const rps = this.rps(a.type, b.type);
          const aDmg = 0.006 * dt * (rps === 'win' ? 2 : rps === 'tie' ? 1 : 0.5);
          const bDmg = 0.006 * dt * (rps === 'lose' ? 2 : rps === 'tie' ? 1 : 0.5);
          a.hp -= bDmg;
          b.hp -= aDmg;
          a.cooldown = 200;
          b.cooldown = 200;
        }
      }
    }
  }

  private resolveGates(dt: number): void {
    for (const u of this.units) {
      const targetSide: Side = u.side === 'player' ? 'enemy' : 'player';
      const gate = this.gates.find((g) => g.side === targetSide && g.lane === u.lane);
      if (!gate) continue;
      const d = Math.abs(gate.x - u.rect.x);
      if (d < 14) {
        gate.hp -= 0.02 * dt;
        u.hp -= 0.01 * dt;
        if (u.side === 'player') vibrate('light');
      }
    }
  }

  private cleanup(): void {
    const survivors: Unit[] = [];
    for (const u of this.units) {
      if (u.hp <= 0) {
        u.rect.destroy();
      } else {
        survivors.push(u);
      }
    }
    this.units = survivors;
  }

  private rps(a: UnitType, b: UnitType): 'win' | 'lose' | 'tie' {
    if (a === b) return 'tie';
    if ((a === 'buccaneer' && b === 'cavalry') || (a === 'cavalry' && b === 'soldier') || (a === 'soldier' && b === 'buccaneer')) {
      return 'win';
    }
    return 'lose';
  }

  private checkEnd(): void {
    const enemyGatesDown = this.gates.filter((g) => g.side === 'enemy').every((g) => g.hp <= 0);
    const playerGatesDown = this.gates.filter((g) => g.side === 'player').every((g) => g.hp <= 0);
    const playerFieldEmpty = this.units.filter((u) => u.side === 'player').length === 0;
    const enemyFieldEmpty = this.units.filter((u) => u.side === 'enemy').length === 0;

    if (enemyGatesDown) return this.finish('victory');
    if (playerGatesDown) return this.finish('defeat');
    if (this.elapsed > MATCH_MAX) {
      const enemyGateSum = this.gates.filter((g) => g.side === 'enemy').reduce((s, g) => s + g.hp, 0);
      const playerGateSum = this.gates.filter((g) => g.side === 'player').reduce((s, g) => s + g.hp, 0);
      return this.finish(enemyGateSum < playerGateSum ? 'victory' : 'defeat');
    }
    if (this.playerPool <= 0 && playerFieldEmpty && this.enemyPool > 0) return this.finish('defeat');
    if (this.enemyPool <= 0 && enemyFieldEmpty && this.playerPool > 0) {
      // Ha nincs több védő, a megmaradt erőkkel lassan beletörjük a kapukat — gyorsítjuk a győzelmet
      for (const g of this.gates.filter((gg) => gg.side === 'enemy')) g.hp -= 0.05 * 16;
    }
  }

  private finish(outcome: 'victory' | 'defeat'): void {
    if (this.ended) return;
    this.ended = true;
    const g = useGame.getState();
    if (outcome === 'victory') {
      const loot = 600 + Math.floor(Math.random() * 800);
      g.addGold(loot);
      g.unlockAchievement('city-conqueror');
      g.adjustMorale(+15);
      g.recordSiege();
      checkQuestCompletion(useGame.getState(), (_id, title, reward) =>
        bus.emit('toast', { message: `Cél teljesült: ${title} (+${reward}g)`, kind: 'good' }),
      );
      this.flashEndBanner('DIADAL! +' + loot + ' arany', 0x2d5a2d);
    } else {
      g.adjustMorale(-12);
      g.damageShip(0, 0, Math.min(8, g.ship.crew - 1));
      this.flashEndBanner('VISSZAVERTEK', 0x7a2e0e);
    }
    this.time.delayedCall(1800, () => {
      bus.emit('land:end', { outcome });
      this.scene.start('World');
    });
  }

  private flashEndBanner(text: string, color: number): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const bg = this.add.rectangle(cx, cy, this.scale.width, 80, color, 0.9).setDepth(50);
    const label = this.add
      .text(cx, cy, text, {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        color: '#fbf5e3',
        stroke: '#04141a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(51);
    this.tweens.add({ targets: [bg, label], alpha: { from: 0, to: 1 }, duration: 250 });
  }
}
