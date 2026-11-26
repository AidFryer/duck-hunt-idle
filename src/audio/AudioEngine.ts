/**
 * Procedural audio: every sound is synthesized with the Web Audio API, so
 * the game ships with no sound files. Three buses (music, ambience,
 * effects) feed a master gain. Nothing starts until the player's first tap
 * (browser autoplay rules), and everything pauses when the tab is hidden.
 */

export type Sfx =
  | 'click' | 'decoy' | 'call' | 'pop' | 'splash' | 'coin' | 'feather'
  | 'problem' | 'fix' | 'buy' | 'levelUp' | 'chime' | 'season' | 'nope';

export interface AudioLevels {
  music: number;
  ambience: number;
  effects: number;
  muted: boolean;
}

export interface Environment {
  wind: number;
  /** 0 day … 1 night */
  darkness: number;
  /** Duck activity 0–1 */
  activity: number;
  rain: boolean;
  /** Clock hour, for the music's mood. */
  hour: number;
}

/** Major pentatonic (semitones) — cozy, never dissonant. */
const PENTA = [0, 2, 4, 7, 9];

const MIN_GAP: Partial<Record<Sfx, number>> = {
  coin: 0.12, feather: 0.1, splash: 0.08, pop: 0.12, call: 0.25, click: 0.03, decoy: 0.08, problem: 0.3,
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses!: Record<'music' | 'ambience' | 'effects', GainNode>;
  private noise!: AudioBuffer;
  private levels: AudioLevels = { music: 0.35, ambience: 0.55, effects: 0.7, muted: false };
  private env: Environment = { wind: 0.3, darkness: 0, activity: 0.5, rain: false, hour: 7 };
  private last: Partial<Record<Sfx, number>> = {};
  private windGain!: GainNode;
  private windFilter!: BiquadFilterNode;
  private waterGain!: GainNode;
  private rainGain!: GainNode;
  private timers: number[] = [];
  started = false;

  /** Call from a user gesture. Safe to call repeatedly. */
  start(): void {
    if (this.started) {
      void this.ctx?.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    const c = this.ctx;
    this.master = c.createGain();
    this.master.connect(c.destination);
    this.buses = { music: c.createGain(), ambience: c.createGain(), effects: c.createGain() };
    for (const b of Object.values(this.buses)) b.connect(this.master);
    this.noise = this.makeNoise(2);
    this.started = true;
    this.applyLevels();
    this.startAmbience();
    this.startMusic();
  }

  setLevels(l: AudioLevels): void {
    this.levels = { ...l };
    if (this.started) this.applyLevels();
  }

  setEnvironment(e: Environment): void {
    this.env = e;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(0.015 + e.wind * 0.07, t, 1.5);
    this.windFilter.frequency.setTargetAtTime(350 + e.wind * 700, t, 2);
    this.rainGain.gain.setTargetAtTime(e.rain ? 0.05 : 0, t, 2);
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    if (this.started) void this.ctx?.resume();
  }

  private applyLevels(): void {
    const t = this.ctx!.currentTime;
    this.master.gain.setTargetAtTime(this.levels.muted ? 0 : 0.9, t, 0.05);
    this.buses.music.gain.setTargetAtTime(this.levels.music * 0.5, t, 0.05);
    this.buses.ambience.gain.setTargetAtTime(this.levels.ambience, t, 0.05);
    this.buses.effects.gain.setTargetAtTime(this.levels.effects, t, 0.05);
  }

  private makeNoise(seconds: number): AudioBuffer {
    const c = this.ctx!;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private noiseSource(loop = false): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = loop;
    return s;
  }

  // ---------------------------------------------------------------- ambience

  private startAmbience(): void {
    const c = this.ctx!;
    const bus = this.buses.ambience;
    // Wind: band-passed noise that breathes with the sim's wind.
    const wind = this.noiseSource(true);
    this.windFilter = c.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.Q.value = 0.7;
    this.windGain = c.createGain();
    this.windGain.gain.value = 0.03;
    wind.connect(this.windFilter).connect(this.windGain).connect(bus);
    wind.start();
    // Water lapping: low noise with a slow swell.
    const water = this.noiseSource(true);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    this.waterGain = c.createGain();
    this.waterGain.gain.value = 0.035;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.18;
    const lfoAmt = c.createGain();
    lfoAmt.gain.value = 0.025;
    lfo.connect(lfoAmt).connect(this.waterGain.gain);
    lfo.start();
    water.connect(lp).connect(this.waterGain).connect(bus);
    water.start(0, 0.7);
    // Rain: bright hiss, off unless drizzling.
    const rain = this.noiseSource(true);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    this.rainGain = c.createGain();
    this.rainGain.gain.value = 0;
    rain.connect(hp).connect(this.rainGain).connect(bus);
    rain.start(0, 1.3);

    // Crickets at night, distant quacks by day.
    this.loop(() => {
      if (this.env.darkness > 0.4) this.cricket();
      return 0.4 + Math.random() * 1.4;
    });
    this.loop(() => {
      if (Math.random() < this.env.activity * 0.8 + 0.05) this.quack(this.buses.ambience, 0.05 + Math.random() * 0.04, 0.9 + Math.random() * 0.25, true, 1 + Math.floor(Math.random() * 3));
      return 5 + Math.random() * 12;
    });
  }

  private loop(fn: () => number): void {
    const tick = () => {
      const next = this.ctx && this.ctx.state === 'running' ? fn() : 2;
      this.timers.push(window.setTimeout(tick, next * 1000));
    };
    this.timers.push(window.setTimeout(tick, 1500 + Math.random() * 2000));
  }

  private cricket(): void {
    const c = this.ctx!;
    const t = c.currentTime;
    const osc = c.createOscillator();
    osc.frequency.value = 4300 + Math.random() * 400;
    const g = c.createGain();
    g.gain.value = 0;
    const chirps = 2 + Math.floor(Math.random() * 3);
    const vol = 0.012 * this.env.darkness;
    for (let i = 0; i < chirps; i++) {
      const s = t + i * 0.07;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(vol, s + 0.01);
      g.gain.linearRampToValueAtTime(0, s + 0.045);
    }
    const pan = c.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    osc.connect(g).connect(pan).connect(this.buses.ambience);
    osc.start(t);
    osc.stop(t + chirps * 0.07 + 0.05);
  }

  // ---------------------------------------------------------------- music

  private startMusic(): void {
    this.loop(() => {
      this.musicNote();
      return 1.8 + Math.random() * 2.6;
    });
    this.loop(() => {
      this.musicPad();
      return 14 + Math.random() * 8;
    });
  }

  private musicRoot(): number {
    const h = this.env.hour;
    // Dawn & day in a bright key, dusk & night a fourth lower and softer.
    return h >= 5 && h < 18 ? 60 : 55;
  }

  private musicNote(): void {
    const c = this.ctx!;
    const t = c.currentTime;
    const midi = this.musicRoot() + PENTA[Math.floor(Math.random() * PENTA.length)]! + (Math.random() < 0.3 ? 12 : 0);
    this.pluck(this.buses.music, midiToHz(midi), t, 0.09, 2.2);
    if (Math.random() < 0.35) this.pluck(this.buses.music, midiToHz(midi + PENTA[2]! ), t + 0.22, 0.05, 1.8);
  }

  private musicPad(): void {
    const c = this.ctx!;
    const t = c.currentTime;
    const root = this.musicRoot() - 12;
    for (const st of [0, 7, 16]) {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = midiToHz(root + st);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.035, t + 3);
      g.gain.linearRampToValueAtTime(0, t + 9);
      o.connect(g).connect(this.buses.music);
      o.start(t);
      o.stop(t + 9.2);
    }
  }

  private pluck(bus: GainNode, hz: number, t: number, vol: number, decay: number): void {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = hz;
    const o2 = c.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = hz * 2;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const g2 = c.createGain();
    g2.gain.value = 0.25;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(bus);
    o.start(t);
    o2.start(t);
    o.stop(t + decay + 0.05);
    o2.stop(t + decay + 0.05);
  }

  // ---------------------------------------------------------------- effects

  /** Play a one-shot effect (throttled so busy crews don't turn into noise). */
  play(name: Sfx): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const gap = MIN_GAP[name] ?? 0.05;
    if ((this.last[name] ?? -1) > now - gap) return;
    this.last[name] = now;
    const fx = this.buses.effects;
    switch (name) {
      case 'click':
        this.woodClick(fx, 0.08);
        break;
      case 'nope':
        this.tone(fx, 180, now, 0.05, 0.12, 'triangle', 140);
        break;
      case 'decoy':
        this.woodClick(fx, 0.05);
        this.splash(0.05, 0.12);
        break;
      case 'call':
        this.quack(fx, 0.09, 1, false, 3);
        break;
      case 'pop':
        this.pop();
        break;
      case 'splash':
        this.splash(0.07, 0.3);
        break;
      case 'coin':
        this.bell(fx, 1318, now, 0.035);
        this.bell(fx, 1760, now + 0.06, 0.025);
        break;
      case 'feather':
        this.tone(fx, 2200, now, 0.012, 0.08, 'sine', 2600);
        break;
      case 'problem':
        this.tone(fx, 330, now, 0.05, 0.22, 'triangle', 220);
        this.tone(fx, 247, now + 0.12, 0.04, 0.25, 'triangle', 196);
        break;
      case 'fix':
        [880, 1109, 1319, 1760].forEach((f, i) => this.bell(fx, f, now + i * 0.06, 0.03));
        break;
      case 'buy':
        this.woodClick(fx, 0.08);
        this.bell(fx, 988, now + 0.04, 0.03);
        break;
      case 'levelUp':
        [523, 659, 784, 1047].forEach((f, i) => this.bell(fx, f, now + i * 0.08, 0.035));
        break;
      case 'chime':
        // A little music-box phrase for new species and patches.
        [784, 988, 1175, 1568, 1319].forEach((f, i) => this.bell(fx, f, now + i * 0.12, 0.04));
        break;
      case 'season':
        for (const [f, d] of [[262, 0], [330, 0.15], [392, 0.3], [523, 0.45], [659, 0.6]] as const) this.bell(fx, f, now + d, 0.05);
        this.musicPad();
        break;
    }
  }

  private tone(bus: GainNode, hz: number, t: number, vol: number, dur: number, type: OscillatorType, toHz?: number): void {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(hz, t);
    if (toHz) o.frequency.exponentialRampToValueAtTime(toHz, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private bell(bus: GainNode, hz: number, t: number, vol: number): void {
    this.tone(bus, hz, t, vol, 0.9, 'sine');
    this.tone(bus, hz * 2.76, t, vol * 0.25, 0.35, 'sine');
  }

  private woodClick(bus: GainNode, vol: number): void {
    const c = this.ctx!;
    const t = c.currentTime;
    this.tone(bus, 1100 + Math.random() * 200, t, vol, 0.05, 'triangle', 700);
    const n = this.noiseSource();
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2500;
    const g = c.createGain();
    g.gain.setValueAtTime(vol * 0.6, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    n.connect(bp).connect(g).connect(bus);
    n.start(t, Math.random());
    n.stop(t + 0.04);
  }

  /** A soft, distant "pop" — muffled, never sharp. */
  private pop(): void {
    const c = this.ctx!;
    const t = c.currentTime;
    const n = this.noiseSource();
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.25);
    const g = c.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    n.connect(lp).connect(g).connect(this.buses.effects);
    n.start(t, Math.random());
    n.stop(t + 0.32);
    this.tone(this.buses.effects, 110, t, 0.05, 0.18, 'sine', 60);
  }

  private splash(vol: number, dur: number): void {
    const c = this.ctx!;
    const t = c.currentTime;
    const n = this.noiseSource();
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(1800, t);
    bp.frequency.exponentialRampToValueAtTime(450, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp).connect(g).connect(this.buses.effects);
    n.start(t, Math.random());
    n.stop(t + dur + 0.02);
  }

  /** A synthesized quack: nasal buzz through a formant filter, pitch falling. */
  private quack(bus: GainNode, vol: number, pitch: number, distant: boolean, count: number): void {
    const c = this.ctx!;
    let t = c.currentTime + (distant ? Math.random() * 0.3 : 0);
    for (let i = 0; i < count; i++) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      const f0 = (300 + Math.random() * 40) * pitch * (i === 0 ? 1.05 : 1);
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.72, t + 0.16);
      const formant = c.createBiquadFilter();
      formant.type = 'bandpass';
      formant.frequency.value = 1150 * pitch;
      formant.Q.value = 3.5;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = distant ? 1400 : 3500;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(formant).connect(lp).connect(g).connect(bus);
      o.start(t);
      o.stop(t + 0.2);
      t += 0.17 + Math.random() * 0.06;
    }
  }
}

function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export const audio = new AudioEngine();
