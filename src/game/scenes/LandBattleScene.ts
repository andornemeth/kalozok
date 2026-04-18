import Phaser from 'phaser';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { vibrate } from '@/utils/haptics';
import { Audio } from '@/audio/AudioManager';
import { Particles } from '@/game/systems/Particles';
import { checkQuestCompletion } from '@/game/systems/QuestSystem';

type UnitType = 'buccaneer' | 'soldier' | 'cavalry' | 'cannon';
type Side = 'player' | 'enemy';

interface Unit {
  group: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  hpBar: Phaser.GameObjects.Graphics;
  side: Side;
  type: UnitType;
  hp: number;
  hpMax: number;
  speed: number;
  lane: number;
  cooldown: number;
  fireT: number;
}

interface Gate {
  side: Side;
  lane: number;
  hp: number;
  hpMax: number;
  x: number;
  y: number;
  bar: Phaser.GameObjects.Graphics;
  sprite: Phaser.GameObjects.Image;
}

const UNIT_LABEL: Record<UnitType, string> = {
  buccaneer: 'HAJDÚ', soldier: 'KATONA', cavalry: 'HUSZÁR', cannon: 'ÁGYÚ',
};
const UNIT_TEX: Record<UnitType, string> = {
  buccaneer: 'unit-buccaneer', soldier: 'unit-soldier', cavalry: 'unit-cavalry', cannon: 'unit-cannon',
};
const UNIT_STATS: Record<UnitType, { hp: number; speed: number; cost: number; range: number; damage: number; reload: number }> = {
  buccaneer: { hp: 26, speed: 0.060, cost: 1, range: 22, damage: 8, reload: 600 },
  soldier:   { hp: 32, speed: 0.040, cost: 1, range: 90, damage: 6, reload: 1100 },
  cavalry:   { hp: 22, speed: 0.090, cost: 2, range: 18, damage: 11, reload: 700 },
  cannon:    { hp: 28, speed: 0.018, cost: 3, range: 220, damage: 18, reload: 1900 },
};

const GATE_MAX_HP = 80;
const MATCH_MAX_MS = 130000;
const STARTING_POOL = 36;

export class LandBattleScene extends Phaser.Scene {
  private units: Unit[] = [];
  private gates: Gate[] = [];
  private selected: UnitType = 'buccaneer';
  private playerPool = STARTING_POOL;
  private enemyPool = STARTING_POOL;
  private enemyTimers: number[] = [2400, 4500, 6500];
  private elapsed = 0;
  private ended = false;
  private poolLabel!: Phaser.GameObjects.Text;
  private enemyLabel!: Phaser.GameObjects.Text;
  private statusLabel!: Phaser.GameObjects.Text;
  private timerLabel!: Phaser.GameObjects.Text;
  private unitButtons: Phaser.GameObjects.Container[] = [];
  private laneHeight = 0;
  private leftX = 70;
  private rightX = 0;
  private topOffset = 92;

  constructor() {
    super('Land');
  }

  create(): void {
    bus.emit('scene:changed', { key: 'land' });
    this.input.removeAllListeners();
    this.cameras.main.fadeIn(380, 4, 20, 26);
    this.ended = false;
    this.units = [];
    this.gates = [];
    this.unitButtons = [];
    this.playerPool = STARTING_POOL;
    this.enemyPool = STARTING_POOL;
    this.enemyTimers = [2400, 4500, 6500];
    this.elapsed = 0;
    this.rightX = this.scale.width - 70;

    this.drawBackground();
    this.createLanes();
    this.createGates();
    this.createKeeps();
    this.createHud();
    this.createControls();
    this.scale.on('resize', () => this.layoutHud());
    this.layoutHud();
    Audio.boom();
  }

  private drawBackground(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const g = this.add.graphics();
    // Föld - dzsungel padlóval
    g.fillStyle(0x355833, 1);
    g.fillRect(0, 0, w, h);
    // Tengerpart bal oldalon (rendezett kalóz partraszállás)
    g.fillStyle(0x1a7f86, 1);
    g.fillRect(0, 0, 18, h);
    g.fillStyle(0xe8d28a, 1);
    g.fillRect(18, 0, 28, h);
    // Város köveiken jobb oldalon
    g.fillStyle(0x6a5a48, 1);
    g.fillRect(w - 32, 0, 32, h);
    // Pálma-pontok véletlenszerűen
    for (let i = 0; i < 22; i++) {
      const px = 70 + Math.random() * (w - 140);
      const py = 30 + Math.random() * (h - 100);
      this.add.image(px, py, Math.random() < 0.4 ? 'palm-large' : 'palm').setDepth(2).setAlpha(0.55);
    }
  }

  private createLanes(): void {
    const usable = this.scale.height - this.topOffset - 130;
    this.laneHeight = usable / 3;
    const g = this.add.graphics();
    for (let i = 0; i < 3; i++) {
      const y = this.topOffset + i * this.laneHeight;
      g.fillStyle(i % 2 === 0 ? 0x2f5a2f : 0x346434, 1);
      g.fillRect(20, y + 2, this.scale.width - 40, this.laneHeight - 4);
      g.fillStyle(0x5a4a2a, 0.35);
      g.fillRect(50, y + this.laneHeight / 2 - 4, this.scale.width - 100, 8);
      // Apró fűcsomók
      for (let j = 0; j < 5; j++) {
        const fx = 70 + Math.random() * (this.scale.width - 140);
        const fy = y + 6 + Math.random() * (this.laneHeight - 12);
        g.fillStyle(0x6b8f3d, 0.6);
        g.fillCircle(fx, fy, 2);
      }
    }
  }

  private createGates(): void {
    for (let i = 0; i < 3; i++) {
      const y = this.topOffset + i * this.laneHeight + this.laneHeight / 2;
      this.gates.push(this.makeGate('player', i, this.leftX - 10, y));
      this.gates.push(this.makeGate('enemy', i, this.rightX + 10, y));
    }
  }

  private makeGate(side: Side, lane: number, x: number, y: number): Gate {
    const sprite = this.add.image(x, y, 'fort-gate').setOrigin(0.5).setDepth(4);
    if (side === 'player') sprite.setFlipX(true);
    const bar = this.add.graphics().setDepth(5);
    const gate: Gate = { side, lane, hp: GATE_MAX_HP, hpMax: GATE_MAX_HP, x, y, bar, sprite };
    this.drawGateBar(gate);
    return gate;
  }

  private createKeeps(): void {
    // Hátsó keep mindkét oldalon
    const w = this.scale.width;
    const playerKeep = this.add.image(20, this.scale.height / 2, 'fort-keep').setOrigin(0.5).setDepth(3).setScale(0.85);
    playerKeep.setFlipX(true);
    void playerKeep;
    this.add.image(w - 20, this.scale.height / 2, 'fort-keep').setOrigin(0.5).setDepth(3).setScale(0.85);
  }

  private drawGateBar(gate: Gate): void {
    gate.bar.clear();
    const w = 36;
    const x = gate.x - w / 2;
    const y = gate.y - 50;
    gate.bar.fillStyle(0x04141a, 0.85);
    gate.bar.fillRect(x - 1, y - 1, w + 2, 5);
    gate.bar.fillStyle(gate.side === 'player' ? 0xe0b24f : 0xc0392b, 1);
    gate.bar.fillRect(x, y, Math.max(0, (gate.hp / gate.hpMax) * w), 3);
    if (gate.hp <= 0) gate.sprite.setTexture('fort-gate-broken');
  }

  private createHud(): void {
    this.add
      .text(this.scale.width / 2, 8, 'VÁROSOSTROM', {
        fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#fbf5e3',
        stroke: '#04141a', strokeThickness: 4,
      })
      .setOrigin(0.5, 0).setDepth(10);
    this.poolLabel = this.add
      .text(16, 38, '', { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#e0b24f' })
      .setDepth(10);
    this.enemyLabel = this.add
      .text(this.scale.width - 16, 38, '', { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c0392b' })
      .setOrigin(1, 0).setDepth(10);
    this.statusLabel = this.add
      .text(this.scale.width / 2, 38, '', { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fbf5e3' })
      .setOrigin(0.5, 0).setDepth(10);
    this.timerLabel = this.add
      .text(this.scale.width / 2, 60, '', { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#88e07b' })
      .setOrigin(0.5, 0).setDepth(10);
    this.refreshLabels();
  }

  private createControls(): void {
    const units: UnitType[] = ['buccaneer', 'soldier', 'cavalry', 'cannon'];
    units.forEach((u, i) => {
      const x = 60 + i * 90;
      const y = this.scale.height - 60;
      const stats = UNIT_STATS[u];
      const btn = this.button(x, y, 84, 50, 0x145f65, `${UNIT_LABEL[u]}\n${stats.cost}fő`, () => {
        this.selected = u;
        this.refreshUnitButtons();
        vibrate('light');
      });
      btn.setData('unit', u);
      this.unitButtons.push(btn);
    });
    this.refreshUnitButtons();

    for (let i = 0; i < 3; i++) {
      const y = this.topOffset + i * this.laneHeight + this.laneHeight / 2;
      this.button(this.scale.width / 2, y, 84, 32, 0x7a2e0e, 'KÜLD', () => this.deploy(i));
    }
  }

  private button(x: number, y: number, w: number, h: number, color: number, text: string, onTap: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(11);
    const bg = this.add.rectangle(0, 0, w, h, color, 0.95).setStrokeStyle(2, 0xfbf5e3);
    const label = this.add.text(0, 0, text, {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fbf5e3', align: 'center',
    }).setOrigin(0.5);
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
    this.rightX = this.scale.width - 70;
    this.refreshLabels();
  }

  private refreshLabels(): void {
    this.poolLabel.setText(`Sereged: ${this.playerPool}`);
    this.enemyLabel.setText(`Védők: ${this.enemyPool}`);
    const remain = Math.max(0, MATCH_MAX_MS - this.elapsed) / 1000;
    this.timerLabel.setText(`Idő: ${remain.toFixed(0)}s`);
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
    Audio.click();
    if (this.selected === 'cavalry' && Math.random() < 0.5) this.flashStatus('Huszárok, rajta!');
    else if (this.selected === 'buccaneer' && Math.random() < 0.5) this.flashStatus('Hajdúk, most!');
  }

  private spawnUnit(side: Side, type: UnitType, lane: number): void {
    const y = this.topOffset + lane * this.laneHeight + this.laneHeight / 2 + (Math.random() - 0.5) * 14;
    const x = side === 'player' ? this.leftX : this.rightX;
    const group = this.add.container(x, y).setDepth(7);
    const body = this.add.image(0, 0, UNIT_TEX[type]).setOrigin(0.5, 0.7);
    if ((side === 'enemy' && type !== 'cannon') || (side === 'enemy' && type === 'cannon')) {
      body.setFlipX(true);
    }
    if (side === 'player' && type === 'cannon') body.setFlipX(false);
    const hpBar = this.add.graphics();
    group.add([body, hpBar]);
    const stat = UNIT_STATS[type];
    this.units.push({
      group, body, hpBar, side, type,
      hp: stat.hp, hpMax: stat.hp,
      speed: stat.speed, lane, cooldown: 0, fireT: 0,
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
    this.resolveAttacks(dt);
    this.cleanup();
    for (const g of this.gates) this.drawGateBar(g);
    this.refreshLabels();
    this.checkEnd();
  }

  private aiSpawn(dt: number): void {
    for (let lane = 0; lane < 3; lane++) {
      this.enemyTimers[lane]! -= dt;
      if (this.enemyTimers[lane]! <= 0 && this.enemyPool > 0) {
        const r = Math.random();
        const type: UnitType = r < 0.45 ? 'soldier' : r < 0.75 ? 'buccaneer' : r < 0.9 ? 'cavalry' : 'cannon';
        const cost = UNIT_STATS[type].cost;
        if (this.enemyPool >= cost) {
          this.enemyPool -= cost;
          this.spawnUnit('enemy', type, lane);
        }
        this.enemyTimers[lane] = 2400 + Math.random() * 2200;
      }
    }
  }

  private stepUnits(dt: number): void {
    for (const u of this.units) {
      if (u.cooldown > 0) u.cooldown -= dt;
      const stat = UNIT_STATS[u.type];
      // Keressen célt: ellenfél ugyanazon lane-en, vagy azon lane kapuja
      const target = this.findClosestEnemy(u, stat.range);
      const targetGate = this.gates.find((g) => g.side !== u.side && g.lane === u.lane && g.hp > 0);
      const targetGateDist = targetGate ? Math.abs(targetGate.x - u.group.x) : Infinity;
      // Ha közelharci és van célpont közel — álljon meg
      if (target && Math.abs(target.group.x - u.group.x) < stat.range && stat.range < 50) {
        // állj és üss
      } else if (targetGate && targetGateDist < stat.range && stat.range < 50) {
        // áll a kapunál
      } else if (target && stat.range > 80) {
        // tüzér — megáll a hatótávolságon belül
        if (Math.abs(target.group.x - u.group.x) > stat.range * 0.85) {
          u.group.x += (u.side === 'player' ? 1 : -1) * stat.speed * dt;
        }
      } else if (targetGate && stat.range > 80 && targetGateDist > stat.range * 0.85) {
        u.group.x += (u.side === 'player' ? 1 : -1) * stat.speed * dt;
      } else if (!target) {
        u.group.x += (u.side === 'player' ? 1 : -1) * stat.speed * dt;
      }
      // Apró bólogatás
      u.body.setY(Math.sin((this.elapsed + u.group.x * 13) * 0.005) * 1);
      this.drawUnitBar(u);
    }
  }

  private findClosestEnemy(u: Unit, range: number): Unit | null {
    let best: Unit | null = null;
    let bestDist = range;
    for (const o of this.units) {
      if (o.side === u.side || o.lane !== u.lane) continue;
      const d = Math.abs(o.group.x - u.group.x);
      if (d < bestDist) {
        best = o;
        bestDist = d;
      }
    }
    return best;
  }

  private drawUnitBar(u: Unit): void {
    u.hpBar.clear();
    const w = 14;
    const x = -w / 2;
    const y = -22;
    u.hpBar.fillStyle(0x04141a, 0.9);
    u.hpBar.fillRect(x - 1, y - 1, w + 2, 3);
    u.hpBar.fillStyle(u.side === 'player' ? 0xe0b24f : 0xc0392b, 1);
    u.hpBar.fillRect(x, y, (u.hp / u.hpMax) * w, 1);
  }

  private resolveAttacks(dt: number): void {
    for (const u of this.units) {
      if (u.cooldown > 0) continue;
      const stat = UNIT_STATS[u.type];
      const target = this.findClosestEnemy(u, stat.range);
      if (target) {
        // Sebzés
        target.hp -= stat.damage;
        u.cooldown = stat.reload;
        if (stat.range > 80) {
          // Lövésvonal animáció
          this.fireProjectile(u, target, stat.damage);
        } else {
          Particles.sparks(this, target.group.x, target.group.y - 6, 5, 9);
        }
        if (u.side === 'player') vibrate('light');
        continue;
      }
      // Kapu támadás
      const gate = this.gates.find((g) => g.side !== u.side && g.lane === u.lane && g.hp > 0);
      if (gate && Math.abs(gate.x - u.group.x) < stat.range + 12) {
        gate.hp -= stat.damage * 0.5;
        u.cooldown = stat.reload;
        if (stat.range > 80) {
          this.fireProjectileToPoint(u, gate.x, gate.y, stat.damage);
        } else {
          Particles.sparks(this, gate.x, gate.y, 4, 9);
        }
        u.hp -= 0.6;
      }
      void dt;
    }
  }

  private fireProjectile(u: Unit, target: Unit, _damage: number): void {
    Audio.cannon();
    const tex = u.type === 'cannon' ? 'cannonball-round' : 'cannonball-grape';
    const ball = this.add.image(u.group.x, u.group.y - 4, tex).setDepth(10);
    Particles.flash(this, u.group.x + (u.side === 'player' ? 14 : -14), u.group.y - 6);
    Particles.smoke(this, u.group.x, u.group.y - 6, { count: 3 });
    this.tweens.add({
      targets: ball,
      x: target.group.x, y: target.group.y - 4,
      duration: 360, ease: 'Quad.easeOut',
      onComplete: () => {
        ball.destroy();
        Particles.explosion(this, target.group.x, target.group.y - 4, 12);
      },
    });
  }

  private fireProjectileToPoint(u: Unit, tx: number, ty: number, _damage: number): void {
    Audio.cannon();
    const tex = u.type === 'cannon' ? 'cannonball-round' : 'cannonball-grape';
    const ball = this.add.image(u.group.x, u.group.y - 4, tex).setDepth(10);
    Particles.flash(this, u.group.x + (u.side === 'player' ? 14 : -14), u.group.y - 6);
    this.tweens.add({
      targets: ball,
      x: tx, y: ty,
      duration: 380, ease: 'Quad.easeOut',
      onComplete: () => {
        ball.destroy();
        Particles.explosion(this, tx, ty, 12);
      },
    });
  }

  private cleanup(): void {
    const survivors: Unit[] = [];
    for (const u of this.units) {
      if (u.hp <= 0) {
        Particles.sparks(this, u.group.x, u.group.y, 4, 9);
        u.group.destroy();
      } else {
        survivors.push(u);
      }
    }
    this.units = survivors;
  }

  private checkEnd(): void {
    const enemyGatesDown = this.gates.filter((g) => g.side === 'enemy').every((g) => g.hp <= 0);
    const playerGatesDown = this.gates.filter((g) => g.side === 'player').every((g) => g.hp <= 0);
    const playerFieldEmpty = this.units.filter((u) => u.side === 'player').length === 0;
    const enemyFieldEmpty = this.units.filter((u) => u.side === 'enemy').length === 0;

    if (enemyGatesDown) return this.finish('victory');
    if (playerGatesDown) return this.finish('defeat');
    if (this.elapsed > MATCH_MAX_MS) {
      const enemyGateSum = this.gates.filter((g) => g.side === 'enemy').reduce((s, g) => s + g.hp, 0);
      const playerGateSum = this.gates.filter((g) => g.side === 'player').reduce((s, g) => s + g.hp, 0);
      return this.finish(enemyGateSum < playerGateSum ? 'victory' : 'defeat');
    }
    if (this.playerPool <= 0 && playerFieldEmpty && this.enemyPool > 0) return this.finish('defeat');
    if (this.enemyPool <= 0 && enemyFieldEmpty) {
      // Maradék erőkkel zárás — gyorsított kapu-rombolás
      for (const g of this.gates.filter((gg) => gg.side === 'enemy')) g.hp -= 0.06 * 16;
    }
  }

  private finish(outcome: 'victory' | 'defeat'): void {
    if (this.ended) return;
    this.ended = true;
    const g = useGame.getState();
    if (outcome === 'victory') {
      const loot = 700 + Math.floor(Math.random() * 900);
      g.addGold(loot);
      g.unlockAchievement('city-conqueror');
      g.adjustMorale(+15);
      g.recordSiege();
      checkQuestCompletion(useGame.getState(), (_id, title, reward) =>
        bus.emit('toast', { message: `Cél teljesült: ${title} (+${reward}g)`, kind: 'good' }),
      );
      this.flashEndBanner('DIADAL! +' + loot + ' arany', 0x2d5a2d, '„Tudtam hogy menni fog. Gyere haza. — Anikó"');
      Audio.success();
    } else {
      g.adjustMorale(-12);
      g.damageShip(0, 0, Math.min(8, g.ship.crew - 1));
      this.flashEndBanner('VISSZAVERTEK', 0x7a2e0e);
      Audio.failure();
    }
    this.time.delayedCall(2400, () => {
      bus.emit('land:end', { outcome });
      this.scene.start('World');
    });
  }

  private flashEndBanner(text: string, color: number, subtitle?: string): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const bg = this.add.rectangle(cx, cy, this.scale.width, subtitle ? 140 : 90, color, 0.92).setDepth(50);
    const label = this.add
      .text(cx, subtitle ? cy - 20 : cy, text, {
        fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#fbf5e3',
        stroke: '#04141a', strokeThickness: 5,
      })
      .setOrigin(0.5).setDepth(51);
    const targets: Phaser.GameObjects.GameObject[] = [bg, label];
    if (subtitle) {
      const sub = this.add
        .text(cx, cy + 24, subtitle, {
          fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: '#fbf5e3',
          fontStyle: 'italic', align: 'center', wordWrap: { width: this.scale.width - 60 },
        })
        .setOrigin(0.5).setDepth(51);
      targets.push(sub);
    }
    this.tweens.add({ targets, alpha: { from: 0, to: 1 }, duration: 280 });
  }
}
