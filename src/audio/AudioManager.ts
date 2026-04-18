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
  private folkMelOsc: OscillatorNode | null = null;
  private folkDroneOsc: OscillatorNode | null = null;
  private folkMelGain: GainNode | null = null;
  private folkDroneGain: GainNode | null = null;
  private folkTimer: number | null = null;

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

  /**
   * Procedurálisan szintetizált magyar népdal-loop. Pentaton D-dallam +
   * halk duda-szerű kvint-drone. A zentai csárdához ("otthonos" érzet).
   */
  startFolkTune(): void {
    if (this.folkMelOsc) return;
    const ctx = this.ensureRunning();
    if (!ctx) return;
    const baseVol = this.musicVolume * 0.22;
    if (baseVol <= 0) return;

    // Dallam szólam — triangle, meleg
    const melOsc = ctx.createOscillator();
    melOsc.type = 'triangle';
    const melGain = ctx.createGain();
    melGain.gain.value = 0;
    melGain.gain.linearRampToValueAtTime(baseVol, ctx.currentTime + 0.5);
    melOsc.connect(melGain).connect(ctx.destination);
    melOsc.frequency.value = 440;
    melOsc.start();
    this.folkMelOsc = melOsc;
    this.folkMelGain = melGain;

    // Duda-drone — mély triangle, kvint: D3 + A3
    const droneOsc = ctx.createOscillator();
    droneOsc.type = 'triangle';
    droneOsc.frequency.value = 146.83; // D3
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    droneGain.gain.linearRampToValueAtTime(baseVol * 0.35, ctx.currentTime + 0.5);
    droneOsc.connect(droneGain).connect(ctx.destination);
    droneOsc.start();
    this.folkDroneOsc = droneOsc;
    this.folkDroneGain = droneGain;

    // Magyar pentaton-ihlet: D-moll pentaton (D F G A C) körül. 16 hangos fázis,
    // lassú giusto (~96 BPM, negyed = ~625 ms).
    const notes = [
      440, 392, 349, 392, 440, 523, 494, 440,
      349, 330, 294, 330, 349, 392, 349, 294,
    ];
    const durations = [
      380, 380, 760, 380, 380, 380, 380, 760,
      380, 380, 760, 380, 380, 380, 380, 1000,
    ];
    let i = 0;
    const step = () => {
      if (!this.folkMelOsc) return;
      const note = notes[i % notes.length]!;
      this.folkMelOsc.frequency.setValueAtTime(note, ctx.currentTime);
      const dur = durations[i % durations.length]!;
      i++;
      this.folkTimer = window.setTimeout(step, dur);
    };
    step();
  }

  stopFolkTune(): void {
    const ctx = this.ctx;
    if (this.folkTimer != null) {
      clearTimeout(this.folkTimer);
      this.folkTimer = null;
    }
    const stopNode = (osc: OscillatorNode | null, gain: GainNode | null) => {
      if (!osc || !gain || !ctx) return;
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      setTimeout(() => {
        try { osc.stop(); osc.disconnect(); } catch { /* noop */ }
      }, 350);
    };
    stopNode(this.folkMelOsc, this.folkMelGain);
    stopNode(this.folkDroneOsc, this.folkDroneGain);
    this.folkMelOsc = null;
    this.folkMelGain = null;
    this.folkDroneOsc = null;
    this.folkDroneGain = null;
  }
}

export const Audio = new AudioManagerImpl();
