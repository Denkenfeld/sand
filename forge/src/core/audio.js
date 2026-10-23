// Kleine synthetische Geräusche (WebAudio): Explosion, Blech-Klang, dumpfer Aufprall.
// Der Browser erlaubt Ton erst nach einem Klick, deshalb init() beim ersten Eingabe-Ereignis.
export const audio = {
  ctx: null,
  enabled: true,
  _last: 0,
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const n = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  },
  _ok() { return this.enabled && this.ctx && this.ctx.state === 'running'; },
  boom(scale = 1) {
    if (!this._ok()) return;
    const c = this.ctx, t = c.currentTime, dur = 1.6 + scale * 0.8;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2400, t);
    lp.frequency.exponentialRampToValueAtTime(70, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.0, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur);
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(24, t + dur * 0.8);
    const og = c.createGain();
    og.gain.setValueAtTime(0.9, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8);
    o.connect(og); og.connect(this.master);
    o.start(t); o.stop(t + dur);
  },
  clank(vol = 0.5) {
    if (!this._ok()) return;
    const now = performance.now();
    if (now - this._last < 55) return;
    this._last = now;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'triangle';
    const f = 380 + Math.random() * 900;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.2);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.min(0.5, vol) * 0.4, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.25);
  },
  // Waffen- und Spielgeräusche (rein synthetisch)
  _noise(dur, f0, f1, gain, type = 'lowpass', q = 0.7) {
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random()); src.stop(t + dur + 0.02);
  },
  _tone(type, f0, f1, dur, gain) {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  // name: pistol | rifle | shotgun | rocket | laser | hit | headshot | hurt | reload | pickup | empty | step
  play(name, vol = 1) {
    if (!this._ok()) return;
    const now = performance.now();
    if (name === 'rifle' || name === 'laser') { if (now - (this._lastShot ?? 0) < 45) return; this._lastShot = now; }
    switch (name) {
      case 'pistol': this._noise(0.16, 3600, 400, 0.7 * vol); this._tone('square', 220, 70, 0.1, 0.25 * vol); break;
      case 'rifle': this._noise(0.12, 4200, 500, 0.6 * vol); this._tone('sawtooth', 160, 60, 0.08, 0.22 * vol); break;
      case 'shotgun': this._noise(0.38, 2800, 160, 1.0 * vol); this._tone('square', 120, 40, 0.25, 0.4 * vol); break;
      case 'rocket': this._noise(0.5, 1800, 120, 0.7 * vol); this._tone('sawtooth', 90, 30, 0.4, 0.4 * vol); break;
      case 'laser': this._tone('sawtooth', 1500, 280, 0.16, 0.2 * vol); break;
      case 'hit': this._tone('triangle', 1100, 700, 0.06, 0.25 * vol); break;
      case 'headshot': this._tone('triangle', 1700, 1000, 0.09, 0.32 * vol); this._tone('sine', 700, 500, 0.12, 0.2 * vol); break;
      case 'hurt': this._noise(0.18, 500, 120, 0.7 * vol); this._tone('sine', 120, 60, 0.2, 0.35 * vol); break;
      case 'reload': this._tone('square', 420, 300, 0.05, 0.14 * vol); setTimeout(() => this._ok() && this._tone('square', 300, 520, 0.06, 0.14 * vol), 280); break;
      case 'pickup': this._tone('sine', 520, 1040, 0.14, 0.25 * vol); break;
      case 'empty': this._tone('square', 900, 700, 0.03, 0.12 * vol); break;
      case 'enemyshot': this._noise(0.1, 2400, 400, 0.22 * vol); break;
      case 'win': this._tone('triangle', 520, 780, 0.35, 0.3 * vol); setTimeout(() => this._ok() && this._tone('triangle', 780, 1040, 0.4, 0.3 * vol), 220); break;
      case 'lose': this._tone('sawtooth', 300, 70, 0.9, 0.3 * vol); break;
      default: break;
    }
  },
  thud(vol = 0.5) {
    if (!this._ok()) return;
    const now = performance.now();
    if (now - this._last < 55) return;
    this._last = now;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    const g = c.createGain();
    g.gain.setValueAtTime(Math.min(0.8, vol) * 0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t, Math.random()); src.stop(t + 0.3);
  },
};
