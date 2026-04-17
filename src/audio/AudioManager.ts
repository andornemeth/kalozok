import { useSettings } from '@/state/settingsStore';

/**
 * Proceduralis hang-SFX Web Audio API-val — nem kell binárisat szállítani.
 * iOS Safari unlock: első user gesture-ön inicializálódik.
 */
class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private musicNode: OscillatorNode | null = null;
  private waveTimer: number | null = null;

  init(): void {
    if (this.ctx) return;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.ctx.destination);
    } catch {
      /* no audio */
    }
  }

  private get sfxVolume(): number {
    return useSettings.getState().sfx;
  }

  private get musicVolume(): number {
    return useSettings.getState().music;
  }

  private ensureRunning(): AudioContext | null {
    this.init();
    if (!this.ctx) return null;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private tone(opts: {
    type: OscillatorType;
    freq: number;
    freq2?: number;
    duration: number;
    volume?: number;
    attack?: number;
    sweepTo?: number;
    sweepTime?: number;
  }): void {
    const ctx = this.ensureRunning();
    if (!ctx) return;
    const vol = (opts.volume ?? 0.3) * this.sfxVolume;
    if (vol <= 0) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type;
    osc.frequency.value = opts.freq;
    if (opts.sweepTo != null) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, opts.sweepTo),
        ctx.currentTime + (opts.sweepTime ?? opts.duration),
      );
    }
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + (opts.attack ?? 0.01));
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + opts.duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + opts.duration + 0.05);
  }

  private noise(duration: number, volume = 0.3, filterFreq = 1200): void {
    const ctx = this.ensureRunning();
    if (!ctx) return;
    const vol = volume * this.sfxVolume;
    if (vol <= 0) return;
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + duration + 0.05);
  }

  // --- Specifikus hangok ---
  cannon(): void {
    this.noise(0.18, 0.55, 700);
    this.tone({ type: 'sawtooth', freq: 90, sweepTo: 40, duration: 0.22, volume: 0.35 });
  }
  cannonHit(): void {
    this.noise(0.2, 0.5, 500);
    this.tone({ type: 'triangle', freq: 180, sweepTo: 60, duration: 0.18, volume: 0.25 });
  }
  splash(): void {
    this.noise(0.12, 0.25, 3000);
  }
  swordClang(): void {
    this.tone({ type: 'square', freq: 900, sweepTo: 600, duration: 0.08, volume: 0.2 });
    this.tone({ type: 'triangle', freq: 1200, sweepTo: 800, duration: 0.1, volume: 0.15 });
  }
  coin(): void {
    this.tone({ type: 'triangle', freq: 880, duration: 0.08, volume: 0.2 });
    setTimeout(() => this.tone({ type: 'triangle', freq: 1320, duration: 0.12, volume: 0.2 }), 70);
  }
  click(): void {
    this.tone({ type: 'square', freq: 520, duration: 0.04, volume: 0.15 });
  }
  uiOpen(): void {
    this.tone({ type: 'triangle', freq: 440, sweepTo: 660, duration: 0.12, volume: 0.18 });
  }
  success(): void {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => this.tone({ type: 'triangle', freq: f, duration: 0.15, volume: 0.22 }), i * 80),
    );
  }
  failure(): void {
    [440, 330, 220].forEach((f, i) =>
      setTimeout(() => this.tone({ type: 'sawtooth', freq: f, duration: 0.18, volume: 0.2 }), i * 90),
    );
  }
  wave(): void {
    this.noise(0.5, 0.08, 500);
  }
  wind(): void {
    this.noise(0.8, 0.05, 300);
  }
  boom(): void {
    this.noise(0.35, 0.7, 350);
    this.tone({ type: 'sawtooth', freq: 60, sweepTo: 20, duration: 0.35, volume: 0.4 });
  }

  /** Halk ambient hullám-ütem a World scene-hez. */
  startAmbient(): void {
    if (this.waveTimer != null) return;
    const play = () => {
      this.wave();
      this.waveTimer = window.setTimeout(play, 3500 + Math.random() * 2500);
    };
    play();
  }

  stopAmbient(): void {
    if (this.waveTimer != null) {
      clearTimeout(this.waveTimer);
      this.waveTimer = null;
    }
  }

  /** Egyszerű chiptune hurok a menühöz — egy-két hang változik periódikusan. */
  startMenuMusic(): void {
    const ctx = this.ensureRunning();
    if (!ctx || this.musicNode) return;
    const vol = this.musicVolume * 0.2;
    if (vol <= 0) return;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 220;
    const gain = this.musicGain!;
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.4);
    osc.connect(gain);
    osc.start();
    this.musicNode = osc;
    const notes = [220, 277, 330, 294, 220, 196, 247, 277];
    let i = 0;
    const step = () => {
      if (!this.musicNode) return;
      this.musicNode.frequency.linearRampToValueAtTime(notes[i % notes.length]!, ctx.currentTime + 0.05);
      i++;
      setTimeout(step, 500);
    };
    step();
  }

  stopMenuMusic(): void {
    if (!this.ctx || !this.musicNode || !this.musicGain) return;
    this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    const node = this.musicNode;
    setTimeout(() => {
      try {
        node.stop();
        node.disconnect();
      } catch {
        /* noop */
      }
    }, 350);
    this.musicNode = null;
  }
}

export const Audio = new AudioManagerImpl();
