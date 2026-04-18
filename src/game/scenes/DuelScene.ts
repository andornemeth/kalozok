import Phaser from 'phaser';
import { bus } from '@/game/EventBus';
import { useGame } from '@/state/gameStore';
import { vibrate } from '@/utils/haptics';
import { Audio } from '@/audio/AudioManager';
import { Particles } from '@/game/systems/Particles';
import { Joystick } from '@/game/ui/Joystick';

type Stance = 'high' | 'middle' | 'low';
type DuelistState = 'idle' | 'attacking' | 'parrying' | 'dodging' | 'stunned';

interface Duelist {
  hp: number;
  hpMax: number;
  posX: number;
  stance: Stance;
  facing: 1 | -1;
  state: DuelistState;
  actionT: number;          // aktuális akció eltelt ms
  dodgeCooldown: number;    // hátralévő dodge cooldown (ms)
  stunT: number;            // stun hátralévő ms
  counterPending: boolean;  // a következő swing 2× damage-et ad
  // AI-only
  aiDecisionT: number;      // hátralévő idő új döntésig
  aiPendingAttack: boolean; // épp telegrafál támadást
  aiTelegraphT: number;     // telegráf-idő hátra
  aiReactionTime: number;   // mennyit telegrafál (easy = hosszabb)
  // megjelenítés
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  hpBar: Phaser.GameObjects.Graphics;
  stanceLabel: Phaser.GameObjects.Text;
  intentLabel: Phaser.GameObjects.Text;
}

// Tuning konstansok
const MOVE_SPEED = 0.12;              // px/ms
const ATTACK_DURATION = 260;
const ATTACK_HIT_AT = 130;
const ATTACK_RECOVERY = 160;          // ATTACK_DURATION után
const DODGE_DURATION = 320;
const DODGE_COOLDOWN = 800;
const DODGE_BACKSTEP = 50;
const PUSH_ON_HIT = 26;
const PUSH_ON_PARRY = 36;
const STUN_AFTER_HIT = 220;

export class DuelScene extends Phaser.Scene {
  private player!: Duelist;
  private enemy!: Duelist;
  private joystick!: Joystick;
  private attackBtn!: Phaser.GameObjects.Container;
  private parryBtn!: Phaser.GameObjects.Container;
  private dodgeBtn!: Phaser.GameObjects.Container;
  private bgFar!: Phaser.GameObjects.Graphics;
  private deckLine!: Phaser.GameObjects.Graphics;
  private edgeMarkers!: Phaser.GameObjects.Graphics;
  private bannerTxt!: Phaser.GameObjects.Text;
  private counterPrompt!: Phaser.GameObjects.Text;
  private arenaLeft = 100;
  private arenaRight = 1000;
  private ended = false;
  private defenderMode = false;
  private counterWindow = 0;          // ms, ha > 0 akkor counter-ablak aktív
  private startupGrace = 0;           // ms, ez alatt nincs pozicionális KO

  constructor() {
    super('Duel');
  }

  init(data: { enemyCrew?: number; enemyKind?: string; defender?: boolean }): void {
    this.ended = false;
    this.defenderMode = !!data.defender;
    this.counterWindow = 0;
    // Scene reuse: reset minden referenciát + timeScale-t, hogy az új duel
    // tiszta állapotból induljon
    this.player = undefined as unknown as Duelist;
    this.enemy = undefined as unknown as Duelist;
    this.time.timeScale = 1;
    void data.enemyCrew;
    void data.enemyKind;
  }

  create(): void {
    bus.emit('scene:changed', { key: 'duel' });
    this.input.removeAllListeners();
    this.cameras.main.fadeIn(380, 4, 20, 26);
    this.cameras.main.setBackgroundColor('#0e2630');

    // Aréna szélek: keskenyebb képernyőkön is maradjon normális játéktér
    const W = this.scale.width;
    this.arenaLeft = Math.max(50, Math.min(100, W * 0.1));
    this.arenaRight = W - this.arenaLeft;

    this.drawBackground();
    this.drawDeck();

    const cy = this.scale.height / 2 + 40;
    // Duelisták mindig biztonságosan az arénán belül spawnolnak
    const safePad = 60;
    const midX = W / 2;
    const maxOffset = Math.max(80, midX - this.arenaLeft - safePad);
    const startOffset = Math.min(140, maxOffset);
    const playerX = midX - startOffset;
    const enemyX = midX + startOffset;
    this.player = this.makeDuelist(playerX, cy, 'duelist-player', 80, +1, 0);
    this.enemy = this.makeDuelist(enemyX, cy, 'duelist-enemy', 60 + Math.floor(Math.random() * 40), -1, 500);
    // Startup grace: 800 ms-ig nem fut a checkEnd pozicionális vége, hogy
    // bármilyen kezdeti clamp-bug miatt ne érjen véget a csata azonnal
    this.startupGrace = 800;

    this.createBanner();
    this.createControls();
    this.setupInput();
    this.scale.on('resize', () => this.layout());
    this.layout();

    // UI pause (tutorial) support
    const pauseHandler = ({ paused }: { paused: boolean }) => {
      if (paused) this.scene.pause();
      else this.scene.resume();
    };
    bus.on('ui:pause', pauseHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => bus.off('ui:pause', pauseHandler));
  }

  // --- Setup ---------------------------------------------------------

  private drawBackground(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.bgFar = this.add.graphics().setDepth(0);
    // Égbolt
    this.bgFar.fillStyle(0x14213a, 1);
    this.bgFar.fillRect(0, 0, w, h);
    // Fedélzet
    this.bgFar.fillStyle(0x6b3e1f, 1);
    this.bgFar.fillRect(0, h * 0.55, w, h * 0.45);
    this.bgFar.fillStyle(0x4a2e1a, 1);
    for (let x = 0; x < w; x += 18) {
      this.bgFar.fillRect(x, h * 0.55, 1, h * 0.45);
    }
    // Korlát
    this.bgFar.fillStyle(0x2a1a0a, 1);
    this.bgFar.fillRect(0, h * 0.55 - 8, w, 4);
    for (let x = 8; x < w; x += 22) {
      this.bgFar.fillRect(x, h * 0.55 - 22, 3, 18);
    }
    // Hold
    this.bgFar.fillStyle(0xfbf5e3, 0.18);
    this.bgFar.fillCircle(w * 0.78, h * 0.18, 26);
    // Felhők
    this.bgFar.fillStyle(0x4a4238, 0.5);
    this.bgFar.fillCircle(w * 0.2, h * 0.15, 28);
    this.bgFar.fillCircle(w * 0.28, h * 0.18, 22);
  }

  private drawDeck(): void {
    this.deckLine = this.add.graphics().setDepth(1);
    this.edgeMarkers = this.add.graphics().setDepth(1);
    this.refreshDeck();
  }

  private refreshDeck(): void {
    const y = this.scale.height / 2 + 68;
    this.deckLine.clear();
    this.deckLine.lineStyle(1, 0xfbf5e3, 0.18);
    this.deckLine.lineBetween(this.arenaLeft, y, this.arenaRight, y);

    // Edge markers — piros szaggatott vonal mindkét szélen
    this.edgeMarkers.clear();
    const drawEdge = (x: number, label: string) => {
      this.edgeMarkers.lineStyle(2, 0xc0392b, 0.55);
      for (let yy = y - 100; yy < y + 30; yy += 8) {
        this.edgeMarkers.lineBetween(x, yy, x, yy + 4);
      }
      void label;
    };
    drawEdge(this.arenaLeft, '← KIESÉS');
    drawEdge(this.arenaRight, 'KIESÉS →');
  }

  private makeDuelist(x: number, y: number, tex: string, hp: number, facing: 1 | -1, aiReactionTime: number): Duelist {
    const shadow = this.add.ellipse(x, y + 28, 50, 14, 0x04141a, 0.6).setDepth(2);
    const sprite = this.add.image(x, y, tex).setOrigin(0.5, 1).setScale(2).setDepth(5);
    if (facing === -1) sprite.setFlipX(true);
    const hpBar = this.add.graphics().setDepth(8);
    const stanceLabel = this.add.text(x, y - 130, 'KÖZÉP', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#fbf5e3',
      stroke: '#04141a', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(8);
    // Nagy, látványos telegráf-címke — villog a támadás előtt, hogy az
    // ellenfél stance-e tisztán látszódjon
    const intentLabel = this.add.text(x, y - 118, '', {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ff8a3d',
      stroke: '#04141a', strokeThickness: 4,
      backgroundColor: 'rgba(4,20,26,0.6)', padding: { x: 4, y: 3 },
    }).setOrigin(0.5).setDepth(12);
    const d: Duelist = {
      hp, hpMax: hp, posX: x, stance: 'middle', facing,
      state: 'idle', actionT: 0, dodgeCooldown: 0, stunT: 0,
      counterPending: false,
      aiDecisionT: 500 + Math.random() * 500,
      aiPendingAttack: false, aiTelegraphT: 0, aiReactionTime,
      sprite, shadow, hpBar, stanceLabel, intentLabel,
    };
    this.drawHpBar(d);
    return d;
  }

  private drawHpBar(d: Duelist): void {
    d.hpBar.clear();
    const w = 120;
    const x = d.posX - w / 2;
    const y = d.sprite.y - 148;
    d.hpBar.fillStyle(0x04141a, 0.85);
    d.hpBar.fillRoundedRect(x - 2, y - 2, w + 4, 10, 2);
    d.hpBar.fillStyle(d === this.player ? 0xe0b24f : 0xc0392b, 1);
    d.hpBar.fillRect(x, y, Math.max(0, (d.hp / d.hpMax) * w), 6);
  }

  private createBanner(): void {
    this.bannerTxt = this.add.text(this.scale.width / 2, 18, 'PÁRBAJ', {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#e0b24f',
      stroke: '#04141a', strokeThickness: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(30);
  }

  // --- Kontrollok ----------------------------------------------------

  private createControls(): void {
    this.joystick = new Joystick(this, 120, this.scale.height - 140, 80, 28);

    const mkBtn = (label: string, w: number, h: number, color: number, fontSize: string) => {
      const c = this.add.container(0, 0).setScrollFactor(0).setDepth(30);
      const bg = this.add.rectangle(0, 0, w, h, color, 0.92).setStrokeStyle(2, 0xfbf5e3);
      const txt = this.add.text(0, 0, label, {
        fontFamily: '"Press Start 2P"', fontSize, color: '#fbf5e3', align: 'center',
      }).setOrigin(0.5);
      c.add([bg, txt]);
      c.setSize(w, h);
      c.setInteractive({ useHandCursor: true });
      return c;
    };

    // Nagy TÁMADÁS gomb — a fő input
    this.attackBtn = mkBtn('TÁMADÁS', 150, 98, 0x7a2e0e, '14px');
    this.attackBtn.on('pointerdown', () => {
      const bg = this.attackBtn.list[0] as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(0x7a2e0e, 0.7);
      this.tryAttack();
    });
    this.attackBtn.on('pointerup', () => {
      const bg = this.attackBtn.list[0] as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(0x7a2e0e, 0.92);
    });
    this.attackBtn.on('pointerout', () => {
      const bg = this.attackBtn.list[0] as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(0x7a2e0e, 0.92);
    });

    // KITÉR — másodlagos, kisebb
    this.dodgeBtn = mkBtn('KITÉR', 108, 58, 0x4a4238, '11px');
    this.dodgeBtn.on('pointerup', () => this.tryDodge());
    this.dodgeBtn.on('pointerdown', () => {
      const bg = this.dodgeBtn.list[0] as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(0x4a4238, 0.7);
    });
    this.dodgeBtn.on('pointerout', () => {
      const bg = this.dodgeBtn.list[0] as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(0x4a4238, 0.92);
    });

    // HÁRÍTÁS helyett: auto-parry a joystick állásával
    // Kezdetben nem hozunk létre parryBtn-t — a referencia csak a layout miatt maradt
    this.parryBtn = mkBtn('', 0, 0, 0x000000, '8px');
    this.parryBtn.setVisible(false);

    // Counter-prompt — nagy, villogó
    this.counterPrompt = this.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#ff8a3d',
      stroke: '#04141a', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(40).setVisible(false);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.joystick.handlePointerDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.joystick.handlePointerMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.joystick.handlePointerUp(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.joystick.handlePointerUp(p));
  }

  private layout(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    this.arenaLeft = 100;
    this.arenaRight = W - 100;
    this.refreshDeck();

    this.bannerTxt?.setPosition(W / 2, 18);
    this.counterPrompt?.setPosition(W / 2, H / 2 - 130);

    this.joystick?.reposition(120, H - 140);

    const rightX = W - 90;
    this.attackBtn?.setPosition(rightX, H - 90);
    this.dodgeBtn?.setPosition(rightX - 150, H - 60);
  }

  // --- Akciók --------------------------------------------------------

  private tryAttack(): void {
    if (this.ended) return;
    if (!this.canAct(this.player)) return;
    const isCounter = this.counterWindow > 0;
    if (isCounter) {
      this.player.counterPending = true;
      this.counterWindow = 0;
      this.counterPrompt.setVisible(false);
      this.cameras.main.flash(120, 224, 178, 79);
    }
    this.startAttack(this.player);
    vibrate(isCounter ? 'medium' : 'light');
  }

  private tryDodge(): void {
    if (this.ended) return;
    if (!this.canAct(this.player)) return;
    if (this.player.dodgeCooldown > 0) return;
    this.startDodge(this.player);
    vibrate('light');
  }

  private canAct(d: Duelist): boolean {
    return d.state === 'idle' || d.state === 'parrying';
  }

  private startAttack(d: Duelist): void {
    d.state = 'attacking';
    d.actionT = 0;
    this.spawnSwordTrail(d);
    Audio.swordClang();
  }

  private startDodge(d: Duelist): void {
    d.state = 'dodging';
    d.actionT = 0;
    d.dodgeCooldown = DODGE_COOLDOWN;
    // Hátralép — a facing ellentétes irányba
    d.posX -= d.facing * DODGE_BACKSTEP;
    this.clampPosX(d);
  }

  private clampPosX(d: Duelist): void {
    d.posX = Phaser.Math.Clamp(d.posX, this.arenaLeft - 20, this.arenaRight + 20);
  }

  private spawnSwordTrail(attacker: Duelist): void {
    // Kardív görbe: a duelist előtt egy vastag szaggatott ív, fade-out 300 ms alatt
    const startY = attacker.sprite.y - 60;
    const endY = attacker.stance === 'high' ? startY - 40 : attacker.stance === 'low' ? startY + 40 : startY;
    const x = attacker.posX + attacker.facing * 34;
    const g = this.add.graphics().setDepth(9);
    g.lineStyle(4, 0xfbf5e3, 0.9);
    g.beginPath();
    g.moveTo(x, startY - 20 * attacker.facing);
    g.lineTo(x + 10 * attacker.facing, (startY + endY) / 2);
    g.lineTo(x, endY + 20 * attacker.facing);
    g.strokePath();
    this.tweens.add({
      targets: g, alpha: 0, duration: 300, ease: 'Quad.easeIn',
      onComplete: () => g.destroy(),
    });
  }

  // --- Update --------------------------------------------------------

  update(_t: number, dt: number): void {
    if (!this.player || !this.enemy) return;
    if (this.startupGrace > 0) this.startupGrace = Math.max(0, this.startupGrace - dt);
    this.updatePlayerInput(dt);
    this.tickDuelist(this.player, dt);
    this.tickDuelist(this.enemy, dt);
    this.updateAI(this.enemy, dt);
    this.updateSprites();
    this.checkEnd();
  }

  private updatePlayerInput(dt: number): void {
    if (this.ended) return;
    const p = this.player;
    if (p.state === 'stunned' || p.state === 'dodging') return;

    // Counter-window ticking
    if (this.counterWindow > 0) {
      this.counterWindow = Math.max(0, this.counterWindow - dt);
      if (this.counterWindow === 0) this.counterPrompt.setVisible(false);
    }

    // Joystick y → stance, x → mozgás
    if (this.joystick.active) {
      const mag = this.joystick.magnitude;
      if (mag > 0.1) {
        const sin = Math.sin(this.joystick.angle);
        const newStance: Stance = sin < -0.35 ? 'high' : sin > 0.35 ? 'low' : 'middle';
        if (newStance !== p.stance) {
          p.stance = newStance;
          p.stanceLabel.setText(this.stanceLabelText(newStance));
        }
        const cos = Math.cos(this.joystick.angle);
        if (Math.abs(cos) > 0.25 && p.state !== 'attacking') {
          const dir = cos > 0 ? 1 : -1;
          p.posX += dir * MOVE_SPEED * mag * dt;
          this.clampPosX(p);
        }
      }
    }

    // Auto-parry: amíg idle, a jelenlegi stance aktív parry-ként funkcionál,
    // ha az ellenfél épp támad és a stance egyezik. Ezt a resolveSwing
    // döntési logikája veszi észre.
    void dt;
  }

  private tickDuelist(d: Duelist, dt: number): void {
    if (d.dodgeCooldown > 0) d.dodgeCooldown = Math.max(0, d.dodgeCooldown - dt);
    if (d.stunT > 0) {
      d.stunT = Math.max(0, d.stunT - dt);
      if (d.stunT === 0 && d.state === 'stunned') d.state = 'idle';
    }

    if (d.state === 'attacking') {
      const wasBeforeHit = d.actionT < ATTACK_HIT_AT;
      d.actionT += dt;
      const afterHit = d.actionT >= ATTACK_HIT_AT;
      // A swing csúcsán ellenőrizzük a sebzést
      if (wasBeforeHit && afterHit) {
        this.resolveSwing(d);
      }
      if (d.actionT >= ATTACK_DURATION + ATTACK_RECOVERY) {
        d.state = 'idle';
        d.actionT = 0;
      }
    } else if (d.state === 'dodging') {
      d.actionT += dt;
      if (d.actionT >= DODGE_DURATION) {
        d.state = 'idle';
        d.actionT = 0;
      }
    }
  }

  private resolveSwing(attacker: Duelist): void {
    const target = attacker === this.player ? this.enemy : this.player;
    const dist = Math.abs(attacker.posX - target.posX);
    if (dist > 115) {
      // Nem ért el
      return;
    }
    // Dodge-ban sebezhetetlen
    if (target.state === 'dodging') {
      Particles.sparks(this, (attacker.posX + target.posX) / 2, attacker.sprite.y - 40, 6, 12);
      return;
    }
    // AUTO-PARRY: ha a célpont idle állapotban van (nem támad) és a stance-e
    // megegyezik a támadóval → tökéletes parry. A célpont egy counter-ablakot
    // kap: 600 ms-en belül ha tapol TÁMADÁST, bónusz damage-t kap.
    if (target.state === 'idle' && target.stance === attacker.stance) {
      // Tökéletes parry
      attacker.posX -= attacker.facing * PUSH_ON_PARRY;
      this.clampPosX(attacker);
      attacker.state = 'stunned';
      attacker.stunT = STUN_AFTER_HIT;
      Audio.swordClang();
      Particles.sparks(this, (attacker.posX + target.posX) / 2, attacker.sprite.y - 40, 16, 22);
      this.cameras.main.shake(160, 0.008);
      vibrate('medium');
      // Counter-ablak csak a játékosnak
      if (target === this.player) {
        this.counterWindow = 600;
        this.counterPrompt.setText('HÁRÍTOTTAD! COUNTER!').setVisible(true).setAlpha(1);
        this.tweens.add({
          targets: this.counterPrompt,
          alpha: { from: 1, to: 0.4 }, yoyo: true, repeat: 2, duration: 150,
        });
      }
      return;
    }

    // Sima találat
    const stanceMatch = target.stance === attacker.stance;
    let dmg = this.damageFor(attacker) + (stanceMatch ? 4 : 0);
    let pushBonus = stanceMatch ? 1.2 : 1.0;
    if (attacker.counterPending) {
      dmg = Math.round(dmg * 2);
      pushBonus *= 1.4;
      attacker.counterPending = false;
      this.showBanner('COUNTER!', '#ff8a3d');
    }
    this.applyDamage(target, dmg, attacker, true, pushBonus);
  }

  private damageFor(_attacker: Duelist): number {
    return 10 + Math.floor(Math.random() * 6);
  }

  private applyDamage(target: Duelist, dmg: number, attacker: Duelist, fullPush: boolean, pushMult = 1.0): void {
    target.hp = Math.max(0, target.hp - dmg);
    this.flash(target.sprite, 0xff8080);
    Particles.sparks(this, target.posX, target.sprite.y - 40, 8, 14);
    this.spawnBloodSpray(target.posX, target.sprite.y - 40);
    Audio.swordClang();
    this.cameras.main.shake(160, 0.01);
    vibrate('warn');
    if (fullPush) {
      target.posX += attacker.facing * PUSH_ON_HIT * pushMult;
      this.clampPosX(target);
    }
    if (dmg >= 12) {
      target.state = 'stunned';
      target.stunT = STUN_AFTER_HIT;
    }
    this.drawHpBar(target);
  }

  private spawnBloodSpray(x: number, y: number): void {
    const g = this.add.graphics().setDepth(10);
    g.fillStyle(0xa62028, 1);
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 10;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      g.fillCircle(px, py, 1 + Math.random() * 2);
    }
    this.tweens.add({
      targets: g, alpha: 0, duration: 500, ease: 'Quad.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  private flash(s: Phaser.GameObjects.Image, tint: number): void {
    s.setTint(tint);
    this.time.delayedCall(120, () => s.clearTint());
  }

  private stanceLabelText(s: Stance): string {
    return s === 'high' ? 'MAGAS' : s === 'middle' ? 'KÖZÉP' : 'ALACS.';
  }

  // --- AI ------------------------------------------------------------

  private updateAI(d: Duelist, dt: number): void {
    if (this.ended) return;
    if (d.state === 'stunned' || d.state === 'attacking' || d.state === 'dodging') {
      // Várunk amíg az akció lezajlik
      if (d.aiPendingAttack && d.state === 'attacking') d.aiPendingAttack = false;
      return;
    }

    const player = this.player;
    const dist = Math.abs(d.posX - player.posX);

    // Telegráf: ha épp támadni készül, számoljuk le az időt
    if (d.aiPendingAttack) {
      d.aiTelegraphT -= dt;
      d.intentLabel.setText(`⚔ ${this.stanceLabelText(d.stance)}`);
      d.intentLabel.setAlpha(0.4 + 0.4 * Math.sin(this.time.now * 0.02));
      if (d.aiTelegraphT <= 0) {
        d.aiPendingAttack = false;
        d.intentLabel.setText('');
        this.startAttack(d);
      }
      return;
    } else {
      d.intentLabel.setText('');
    }

    d.aiDecisionT -= dt;
    if (d.aiDecisionT > 0) {
      // Közben mozog: közeledik vagy hátrál attól, hogy messze/közel van-e
      const idealDist = 95;
      if (dist > idealDist + 30) {
        // Közeledik
        d.posX += d.facing * MOVE_SPEED * 0.7 * dt;
        this.clampPosX(d);
      } else if (dist < idealDist - 30) {
        d.posX -= d.facing * MOVE_SPEED * 0.4 * dt;
        this.clampPosX(d);
      }
      return;
    }
    d.aiDecisionT = 400 + Math.random() * 500;

    const hpRatio = d.hp / d.hpMax;

    // Kis eséllyel dodge reakció ha a player épp támad
    if (player.state === 'attacking' && d.dodgeCooldown <= 0 && hpRatio < 0.55 && Math.random() < 0.25) {
      this.startDodge(d);
      return;
    }
    // Parry szándék ha a player közelít és támadhat
    if (dist < 110 && player.state !== 'attacking' && Math.random() < 0.18) {
      d.state = 'parrying';
      this.time.delayedCall(400 + Math.random() * 300, () => {
        if (d.state === 'parrying') d.state = 'idle';
      });
      return;
    }
    // Támadás telegráf — ha megfelelő távolságban van
    if (dist < 115) {
      // Válasszon stance-et, telegrafáljon
      const stances: Stance[] = ['high', 'middle', 'low'];
      d.stance = stances[Math.floor(Math.random() * 3)]!;
      d.stanceLabel.setText(this.stanceLabelText(d.stance));
      d.aiPendingAttack = true;
      d.aiTelegraphT = d.aiReactionTime;
      return;
    }
  }

  // --- Sprite update -------------------------------------------------

  private updateSprites(): void {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const smooth = 0.22;
    for (const d of [this.player, this.enemy]) {
      const targetX = d.posX;
      const x = lerp(d.sprite.x, targetX, smooth);
      d.sprite.setPosition(x, d.sprite.y);
      d.shadow.setPosition(x, d.shadow.y);
      d.hpBar.setPosition(0, 0);
      this.drawHpBar(d);
      d.stanceLabel.setPosition(x, d.sprite.y - 130);
      d.intentLabel.setPosition(x, d.sprite.y - 116);

      // Enyhe lendület-animáció támadáskor
      if (d.state === 'attacking') {
        const t = d.actionT / ATTACK_DURATION;
        const phase = Math.sin(Math.PI * t);
        d.sprite.setX(x + d.facing * 18 * phase);
      }
      // Parry pose: enyhe előrehajlás
      if (d.state === 'parrying') {
        d.sprite.setRotation(d.facing * 0.05);
      } else {
        d.sprite.setRotation(0);
      }
      // Dodge: enyhe átlátszóság
      if (d.state === 'dodging') {
        d.sprite.setAlpha(0.55);
      } else {
        d.sprite.setAlpha(1);
      }
    }
  }

  // --- Befejezés -----------------------------------------------------

  private checkEnd(): void {
    if (this.ended) return;
    if (this.player.hp <= 0) return this.finish('defeat');
    if (this.enemy.hp <= 0) return this.finish('victory');
    // Pozícionális KO — a startup grace alatt nem triggerel (kezdeti clamp
    // vagy keskeny képernyő ne zárja le a csatát azonnal)
    if (this.startupGrace > 0) return;
    if (this.player.posX <= this.arenaLeft) return this.finish('defeat', 'KIESTÉL!');
    if (this.enemy.posX >= this.arenaRight) return this.finish('victory', 'KIDOBTAD!');
  }

  private finish(outcome: 'victory' | 'defeat', reason?: string): void {
    if (this.ended) return;
    this.ended = true;
    // Slow-mo finiss
    this.time.timeScale = 0.3;
    this.cameras.main.zoomTo(1.2, 500);
    this.showBanner(outcome === 'victory' ? (reason ?? 'GYŐZELEM!') : (reason ?? 'VERESÉG'), outcome === 'victory' ? '#88e07b' : '#ff8070');
    this.time.delayedCall(700, () => {
      this.time.timeScale = 1;
      const g = useGame.getState();
      if (outcome === 'victory') {
        const loot = 250 + Math.floor(Math.random() * 450);
        g.addGold(loot);
        g.adjustMorale(+15);
        g.unlockAchievement('duel-victor');
        bus.emit('toast', { message: `Kardpárbaj sikere! +${loot} arany`, kind: 'good' });
        Audio.success();
      } else {
        g.addGold(-Math.floor(g.career.gold * 0.25));
        g.damageShip(8, 8, 4);
        g.adjustMorale(-12);
        bus.emit('toast', { message: this.defenderMode ? 'Elveszítetted a hajódat!' : 'A bordázás kudarcot vallott!', kind: 'bad' });
        Audio.failure();
      }
      bus.emit('duel:end', { outcome });
      this.time.delayedCall(800, () => this.scene.start('World'));
    });
  }

  private showBanner(text: string, color: string): void {
    const banner = this.add.text(this.scale.width / 2, this.scale.height / 2, text, {
      fontFamily: '"Press Start 2P"', fontSize: '28px', color,
      stroke: '#04141a', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(50).setAlpha(0);
    this.tweens.add({
      targets: banner, alpha: { from: 0, to: 1 },
      scale: { from: 0.6, to: 1.15 }, duration: 250, yoyo: true, hold: 400,
      onComplete: () => banner.destroy(),
    });
  }
}
