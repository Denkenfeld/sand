/**
 * Fully procedural ambience (no audio files): brown-noise ocean bed, wave hiss,
 * wood creaks that follow the raft's motion, footsteps on planks, landing thumps,
 * splashes and seagull cries. Created lazily on the first user gesture.
 */
export class AudioSystem {
  constructor() {
    this.ctx = null; this.muted = false; this.master = null;
    this._creakT = 3; this._stepIdx = 0; this._lastLand = 0;
  }

  resume() {
    if (!this.ctx) this._init();
    this.ctx?.resume?.();
  }

  _noiseBuffer(kind, seconds = 4) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return buf;
  }

  _init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(ctx.destination);
    this.white = this._noiseBuffer('white', 2); this.brown = this._noiseBuffer('brown', 6);

    const loop = (buf) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
    const lfo = (freq, depth, target) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = freq; g.gain.value = depth; o.connect(g).connect(target); o.start(); };

    // deep swell
    const bed = ctx.createGain(); bed.gain.value = 0.34;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.6;
    loop(this.brown).connect(lp).connect(bed).connect(this.master);
    lfo(0.09, 0.14, bed.gain); lfo(0.07, 180, lp.frequency);
    // hiss of small waves
    const hiss = ctx.createGain(); hiss.gain.value = 0.05;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.5;
    loop(this.white).connect(bp).connect(hiss).connect(this.master);
    lfo(0.17, 0.035, hiss.gain); lfo(0.11, 600, bp.frequency);
    // wind
    const wind = ctx.createGain(); wind.gain.value = 0.05;
    const wb = ctx.createBiquadFilter(); wb.type = 'bandpass'; wb.frequency.value = 420; wb.Q.value = 0.9;
    loop(this.brown).connect(wb).connect(wind).connect(this.master);
    lfo(0.05, 0.035, wind.gain);
  }

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05); }

  _burst({ freq = 500, q = 0.7, type = 'lowpass', dur = 0.08, gain = 0.15, buf = this.white, glide = 0, tone = 0 }) {
    const ctx = this.ctx; if (!ctx || this.muted) return;
    const t0 = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (glide) f.frequency.exponentialRampToValueAtTime(Math.max(30, freq * glide), t0 + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master); src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
    if (tone) { // low thump body
      const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(tone, t0); o.frequency.exponentialRampToValueAtTime(tone * 0.5, t0 + dur);
      og.gain.setValueAtTime(gain * 0.7, t0); og.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(og).connect(this.master); o.start(t0); o.stop(t0 + dur + 0.02);
    }
  }

  footstep(run) { this._burst({ freq: run ? 650 : 480, dur: 0.07, gain: run ? 0.22 : 0.14, tone: 95 + Math.random() * 25 }); }
  land(impact) { this._burst({ freq: 400, dur: 0.18, gain: Math.min(0.5, 0.12 + impact * 0.05), tone: 70 }); }
  splash() { this._burst({ freq: 1400, q: 0.8, type: 'bandpass', dur: 0.5, gain: 0.16, glide: 0.5 }); this._burst({ freq: 3200, type: 'highpass', dur: 0.3, gain: 0.05 }); }
  creak() {
    const ctx = this.ctx; if (!ctx || this.muted) return;
    const t0 = ctx.currentTime, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; const f0 = 90 + Math.random() * 90; o.frequency.setValueAtTime(f0, t0); o.frequency.linearRampToValueAtTime(f0 * (0.6 + Math.random() * 0.7), t0 + 0.4);
    f.type = 'bandpass'; f.frequency.value = 380 + Math.random() * 300; f.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.045, t0 + 0.1); g.gain.linearRampToValueAtTime(0.0001, t0 + 0.45);
    o.connect(f).connect(g).connect(this.master); o.start(t0); o.stop(t0 + 0.5);
  }
  gull() {
    const ctx = this.ctx; if (!ctx || this.muted) return;
    const t0 = ctx.currentTime;
    for (let i = 0; i < 2 + (Math.random() * 2 | 0); i++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), v = ctx.createOscillator(), vg = ctx.createGain(), s = t0 + i * 0.3;
      o.type = 'triangle'; o.frequency.setValueAtTime(1500 + Math.random() * 300, s); o.frequency.exponentialRampToValueAtTime(850, s + 0.26);
      v.frequency.value = 38; vg.gain.value = 60; v.connect(vg).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.05, s + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.27);
      o.connect(g).connect(this.master); o.start(s); v.start(s); o.stop(s + 0.3); v.stop(s + 0.3);
    }
  }

  update(dt, t, game) {
    if (!this.ctx) return;
    const p = game.player, r = game.raft;
    // footsteps from the gait phase (one per half cycle)
    if (p.grounded && p.speed > 0.4) {
      const idx = Math.floor(game.player.anim.phase / Math.PI);
      if (idx !== this._stepIdx) { this._stepIdx = idx; this.footstep(p.speed > 2.5); }
    } else this._stepIdx = Math.floor(p.anim.phase / Math.PI);
    if (p.lastLand !== this._lastLand) { this._lastLand = p.lastLand; if (p.lastLand > 0) this.land(p.lastLand); }
    // creaks: more often the more the raft moves
    this._creakT -= dt * (0.6 + Math.abs(r.wp) * 14 + Math.abs(r.wr) * 14 + Math.abs(r.vy) * 3);
    if (this._creakT < 0) { this.creak(); this._creakT = 2.5 + Math.random() * 6; }
  }
}
