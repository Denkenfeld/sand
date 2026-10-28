// Wegsuche: Raster-A* über die Stadt. Berücksichtigt Gebäude (aus den Kollisionsboxen der Stadt), Größenklassen
// und dynamische Hindernisse (Prefabs mit `solid`). Erreichbarkeit kommt aus einer Flächen-Markierung (flood fill),
// deshalb meldet `path()` unerreichbare Ziele sofort und sucht nicht ewig.
const CLASSES = [0.45, 0.9, 1.6, 2.8]; // Radien der Größenklassen (m)
const SQ2 = Math.SQRT2;
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1];

export class Nav {
  constructor(game, { cell = 2, half = 360 } = {}) {
    this.g = game; this.cell = cell; this.half = half;
    this.n = Math.ceil((2 * half) / cell);
    const N = this.n * this.n;
    this.stat = CLASSES.map(() => null);
    this.dyn = CLASSES.map(() => null);
    this.label = CLASSES.map(() => null);
    this.labelOk = CLASSES.map(() => false);
    this.dynOk = CLASSES.map(() => false);
    this.version = 0; // wächst, wenn sich dynamische Hindernisse ändern
    this.gs = new Float32Array(N); this.fs = new Float32Array(N); this.par = new Int32Array(N);
    this.openS = new Int32Array(N); this.closedS = new Int32Array(N);
    this.heap = new Int32Array(N); this.hn = 0; this.cur = 0;
    this.stats = { paths: 0, nodes: 0, ms: 0 };
  }

  cls(r) { for (let i = 0; i < CLASSES.length; i++) if (r <= CLASSES[i]) return i; return CLASSES.length - 1; }
  idx(x, z) {
    const ix = Math.floor((x + this.half) / this.cell), iz = Math.floor((z + this.half) / this.cell);
    return ix < 0 || iz < 0 || ix >= this.n || iz >= this.n ? -1 : iz * this.n + ix;
  }
  cx(i) { return ((i % this.n) + 0.5) * this.cell - this.half; }
  cz(i) { return (Math.floor(i / this.n) + 0.5) * this.cell - this.half; }

  // Hindernisse haben sich geändert (neuer Turm o. Ä.)
  invalidate() { this.dynOk.fill(false); this.labelOk.fill(false); this.version++; }

  _static(c) {
    if (this.stat[c]) return this.stat[c];
    const cm = this.g.cm, n = this.n, R = CLASSES[c], out = new Uint8Array(n * n);
    const C = cm.cell ?? 16, grid = cm.grid;
    const memo = new Map();
    const near = (x, z) => { // gibt es im 3×3-Umfeld überhaupt Hindernisse? (schneller Ausschluss für freies Gelände)
      const ix = Math.floor(x / C), iz = Math.floor(z / C), k = ix * 4096 + iz;
      let v = memo.get(k);
      if (v === undefined) { v = false; if (grid) for (let a = -1; a <= 1 && !v; a++) for (let b = -1; b <= 1; b++) if (grid.get((ix + a) * 4096 + iz + b)) { v = true; break; } memo.set(k, v); }
      return v;
    };
    for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
      const x = (ix + 0.5) * this.cell - this.half, z = (iz + 0.5) * this.cell - this.half;
      out[iz * n + ix] = x * x + z * z > 600 * 600 ? 1 : near(x, z) && cm.obstacleAt(x, z, R) ? 1 : 0;
    }
    return (this.stat[c] = out);
  }

  _dyn(c) {
    if (this.dynOk[c] && this.dyn[c]) return this.dyn[c];
    const n = this.n, out = this.dyn[c] ?? (this.dyn[c] = new Uint8Array(n * n));
    out.fill(0);
    const R = CLASSES[c];
    for (const t of this.g.things) {
      if (!(t.solid > 0) || t.removed) continue;
      const rr = t.solid + R, m = Math.ceil(rr / this.cell) + 1;
      const ix0 = Math.floor((t.x + this.half) / this.cell), iz0 = Math.floor((t.z + this.half) / this.cell);
      for (let dz = -m; dz <= m; dz++) for (let dx = -m; dx <= m; dx++) {
        const ix = ix0 + dx, iz = iz0 + dz;
        if (ix < 0 || iz < 0 || ix >= n || iz >= n) continue;
        const x = (ix + 0.5) * this.cell - this.half, z = (iz + 0.5) * this.cell - this.half;
        if ((x - t.x) ** 2 + (z - t.z) ** 2 < rr * rr) out[iz * n + ix] = 1;
      }
    }
    this.dynOk[c] = true;
    return out;
  }

  _labels(c) {
    if (this.labelOk[c] && this.label[c]) return this.label[c];
    const n = this.n, N = n * n, st = this._static(c), dy = this._dyn(c);
    const lab = this.label[c] ?? (this.label[c] = new Int32Array(N));
    lab.fill(0);
    const stack = this.heap; // wiederverwendet
    let id = 0;
    for (let s = 0; s < N; s++) {
      if (lab[s] || st[s] || dy[s]) continue;
      id++; let sp = 0; stack[sp++] = s; lab[s] = id;
      while (sp) {
        const i = stack[--sp], ix = i % n, iz = (i / n) | 0;
        if (ix > 0) { const j = i - 1; if (!lab[j] && !st[j] && !dy[j]) { lab[j] = id; stack[sp++] = j; } }
        if (ix < n - 1) { const j = i + 1; if (!lab[j] && !st[j] && !dy[j]) { lab[j] = id; stack[sp++] = j; } }
        if (iz > 0) { const j = i - n; if (!lab[j] && !st[j] && !dy[j]) { lab[j] = id; stack[sp++] = j; } }
        if (iz < n - 1) { const j = i + n; if (!lab[j] && !st[j] && !dy[j]) { lab[j] = id; stack[sp++] = j; } }
      }
    }
    this.labelOk[c] = true;
    return lab;
  }

  // nächste freie Zelle um i (Suchradius in Zellen)
  _free(c, i, maxR) {
    const st = this._static(c), dy = this._dyn(c), n = this.n;
    if (!st[i] && !dy[i]) return i;
    const ix0 = i % n, iz0 = (i / n) | 0;
    for (let r = 1; r <= maxR; r++) {
      let best = -1, bd = 1e9;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const ix = ix0 + dx, iz = iz0 + dz;
        if (ix < 0 || iz < 0 || ix >= n || iz >= n) continue;
        const j = iz * n + ix;
        if (st[j] || dy[j]) continue;
        const d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = j; }
      }
      if (best >= 0) return best;
    }
    return -1;
  }

  /* Binärer Heap über fs */
  _push(i) {
    const h = this.heap, f = this.fs;
    let k = this.hn++;
    while (k > 0) { const p = (k - 1) >> 1; if (f[h[p]] <= f[i]) break; h[k] = h[p]; k = p; }
    h[k] = i;
  }
  _pop() {
    const h = this.heap, f = this.fs, top = h[0], last = h[--this.hn];
    let k = 0; const n = this.hn;
    while (true) {
      let c = 2 * k + 1; if (c >= n) break;
      if (c + 1 < n && f[h[c + 1]] < f[h[c]]) c++;
      if (f[h[c]] >= f[last]) break;
      h[k] = h[c]; k = c;
    }
    if (n > 0) h[k] = last;
    return top;
  }

  _astar(c, s, e, cap) {
    const n = this.n, st = this._static(c), dy = this._dyn(c), stamp = ++this.cur;
    const gs = this.gs, fs = this.fs, par = this.par, os = this.openS, cs = this.closedS;
    const ex = e % n, ez = (e / n) | 0;
    const hf = (i) => { const dx = Math.abs((i % n) - ex), dz = Math.abs(((i / n) | 0) - ez); return (dx + dz) + (SQ2 - 2) * Math.min(dx, dz); };
    this.hn = 0;
    gs[s] = 0; fs[s] = hf(s); par[s] = -1; os[s] = stamp; this._push(s);
    let best = s, bestH = fs[s], count = 0;
    const free = (i) => !st[i] && !dy[i];
    while (this.hn) {
      const i = this._pop();
      if (cs[i] === stamp) continue;
      cs[i] = stamp;
      if (i === e) { best = e; break; }
      if (++count > cap) break;
      const h = fs[i] - gs[i];
      if (h < bestH) { bestH = h; best = i; }
      const ix = i % n, iz = (i / n) | 0;
      for (let d = 0; d < 8; d++) {
        const dx = DX[d], dz = DZ[d];
        const jx = ix + dx, jz = iz + dz;
        if (jx < 0 || jz < 0 || jx >= n || jz >= n) continue;
        const j = jz * n + jx;
        if (!free(j) || cs[j] === stamp) continue;
        if (dx && dz && (!free(iz * n + jx) || !free(jz * n + ix))) continue; // keine Ecken schneiden
        const tg = gs[i] + (dx && dz ? SQ2 : 1);
        if (os[j] !== stamp || tg < gs[j]) { gs[j] = tg; fs[j] = tg + hf(j); par[j] = i; os[j] = stamp; this._push(j); }
      }
    }
    this.stats.nodes += count;
    const out = [];
    for (let i = best; i >= 0; i = par[i]) out.push(i);
    out.reverse();
    return { cells: out, reached: best === e };
  }

  // Sichtlinie zwischen zwei Rasterzellen (alle berührten Zellen frei, keine Ecken schneiden). Das Raster ist schon um den Radius der Größenklasse aufgebläht.
  _los(c, a, b) {
    const n = this.n, st = this.stat[c], dy = this.dyn[c];
    let x = a % n, z = (a / n) | 0;
    const x1 = b % n, z1 = (b / n) | 0, dx = Math.abs(x1 - x), dz = Math.abs(z1 - z), sx = x < x1 ? 1 : -1, sz = z < z1 ? 1 : -1;
    let err = dx - dz;
    for (;;) {
      const i = z * n + x;
      if (st[i] || dy[i]) return false;
      if (x === x1 && z === z1) return true;
      const e2 = 2 * err, stepX = e2 > -dz, stepZ = e2 < dx;
      if (stepX && stepZ) { const p = z * n + x + sx, q = (z + sz) * n + x; if (st[p] || dy[p] || st[q] || dy[q]) return false; }
      if (stepX) { err -= dz; x += sx; }
      if (stepZ) { err += dx; z += sz; }
    }
  }

  /* ───────── öffentliche Abfragen ───────── */
  // from/to: { x, z }.  o: { radius, snap (Zellen für blockiertes Ziel), partial (Weg zum nächsten erreichbaren Punkt, wenn unerreichbar), cap }
  // Ergebnis: { ok, reached, partial, points:[{x,z}], length, reason }
  path(from, to, o = {}) {
    const t0 = performance.now();
    const r = o.radius ?? 0.45, c = this.cls(r);
    this._static(c);
    let s = this.idx(from.x, from.z), e = this.idx(to.x, to.z);
    const fail = (reason, extra = {}) => ({ ok: false, reached: false, partial: false, points: [], length: 0, reason, ...extra });
    if (s < 0) return fail('start-outside');
    if (e < 0) return fail('target-outside');
    const lab = this._labels(c);
    s = this._free(c, s, 4);
    if (s < 0) return fail('start-blocked');
    const e2 = this._free(c, e, o.snap ?? 5);
    if (e2 < 0) return fail('target-blocked');
    e = e2;
    let reached = lab[s] === lab[e];
    const res = this._astar(c, s, reached ? e : this._closest(c, s, e, lab), o.cap ?? 60000);
    const cells = res.cells;
    this.stats.paths++; this.stats.ms += performance.now() - t0;
    if (!cells.length) return fail('no-path');
    // Glätten (Fadenspannen im Raster): von jeder Stelle so weit wie möglich geradeaus
    const keep = [0];
    for (let i = 0, last = cells.length - 1; i < last;) {
      let j = last;
      while (j > i + 1 && !this._los(c, cells[i], cells[j])) j--;
      keep.push(j); i = j;
    }
    const sm = keep.map((k) => ({ x: this.cx(cells[k]), z: this.cz(cells[k]) }));
    sm[0] = { x: from.x, z: from.z };
    if (reached && res.reached && this._free(c, this.idx(to.x, to.z), 0) >= 0) sm[sm.length - 1] = { x: to.x, z: to.z };
    let len = 0; for (let k = 1; k < sm.length; k++) len += Math.hypot(sm[k].x - sm[k - 1].x, sm[k].z - sm[k - 1].z);
    if (!reached && o.partial === false) return fail('unreachable');
    return { ok: reached && res.reached, reached: reached && res.reached, partial: !(reached && res.reached), points: sm, length: len, reason: reached && res.reached ? '' : 'unreachable' };
  }

  // erreichbare Zelle in der Fläche von s, die dem Ziel e am nächsten liegt
  _closest(c, s, e, lab) {
    const n = this.n, L = lab[s], ex = e % n, ez = (e / n) | 0;
    let best = s, bd = 1e12;
    for (let i = 0; i < lab.length; i++) {
      if (lab[i] !== L) continue;
      const dx = (i % n) - ex, dz = ((i / n) | 0) - ez, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  reachable(from, to, o = {}) {
    const c = this.cls(o.radius ?? 0.45);
    const lab = this._labels(c);
    const s = this._free(c, this.idx(from.x, from.z), 4), e = this._free(c, this.idx(to.x, to.z), o.snap ?? 5);
    return s >= 0 && e >= 0 && lab[s] === lab[e];
  }

  // Ist an dieser Stelle für einen Kreis mit Radius r Platz? (Gebäude + Prefab-Hindernisse, ohne Einheiten)
  free(x, z, r = 0.45) {
    const i = this.idx(x, z);
    if (i < 0) return false;
    const c = this.cls(r);
    return !this._static(c)[i] && !this._dyn(c)[i];
  }
}
