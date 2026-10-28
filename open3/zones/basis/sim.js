// zones/basis/sim.js – Spiellogik des Aufbauspiels. REINE DATEN: kein THREE, kein DOM, kein Zeitgeber.
// Die Ansicht (zone.js) ruft sim.update(dt) auf und liest den Zustand; so lässt sich die Wirtschaft ohne Browser testen
// (tools/test.js simuliert 100 Spielminuten in Sekunden, tools/balance.js misst die Balance) und der Spielstand ist einfach serialize()/load().
//
// Koordinaten: Feld (i,j) -> Mittelpunkt x=(i+w/2-5)*CS, z=(j+h/2-5)*CS (Meter, lokale Ebene um die Zentrale).
// Ereignisse (sim.events, von der Ansicht pro Frame abgeholt): placed, built, removed, grew, income, trained{unit}, researched{id},
//   quest{step,skipped}, hint{level,step}, dusk, dawn{ok}, blackout, full.   V1: Tag/Nacht, Batterie, Lager-Obergrenze, Stellen, Aufträge, Offline-Fortschritt.
(function (root) {
  function createSim(D) {
    const { NG, OFF, CS } = D.grid, E = D.economy, TECH = D.tech || {}, UNITS = D.units, QS = (D.quests && D.quests.steps) || [], TAU = Math.PI * 2;
    const ci = (i, j) => (j + OFF) * NG + i + OFF;
    const sim = { D, time: 0, events: [], bl: [], cells: new Array(NG * NG).fill(null), grid: Object.assign({}, D.grid.start), S: null, acc: 0, techs: new Set(), q: [],
      clock: 0, netVer: 0, out: false, nbrs: null, nights: 0, night: false, quest: 0, idle: 0, hint: 0, qLast: -1, jobs: [], L: 1, fixLight: null, off: false, fullT: -99 };
    const S = sim.S = { ore: 0, wk: 0, wcap: 0, sc: 0, eu: 0, ec: 0, wu: 0, wc: 0, au: 0, ac: 0, rs: null, cap: 0, bat: 0, bcap: 0, sj: 0, st: 0, brown: false };   // rs = laufende Forschung {id,left}
    const mod = sim.mod = { energy: 0, wcap: 0, income: 0, refineryIncome: 0, beltBonus: 0, buildTime: 1, bE: {} };
    const def = id => id === 'hq' ? D.hq : D.buildings[id];
    const emit = (type, o) => sim.events.push(Object.assign({ type }, o));
    sim.ci = ci; sim.cget = (i, j) => sim.cells[ci(i, j)];
    sim.cellAt = (x, z) => { const i = Math.floor(x / CS + 5), j = Math.floor(z / CS + 5), g = sim.grid; return i < g.x0 || j < g.y0 || i >= g.x1 || j >= g.y1 ? null : [i, j]; };
    sim.has = id => sim.techs.has(id);
    const built = id => sim.bl.some(b => b.id === id && b.built);
    // ---------- Tageslauf: Phase 0..1, Sonnenhöhe = sin(2π·Phase), Licht 0..1 (gleiche Formel wie die Ansicht) ----------
    sim.phase = () => (((sim.clock / E.dayLen + E.startPhase) % 1) + 1) % 1;
    sim.sunElev = () => Math.sin(TAU * sim.phase());
    sim.lightAt = ph => { const k = Math.min(1, Math.max(0, (Math.sin(TAU * ph) + E.lightBias) / E.lightWidth)); return k * k * (3 - 2 * k); };
    sim.light = () => sim.fixLight != null ? sim.fixLight : sim.lightAt(sim.phase());
    sim.day = () => Math.floor(sim.clock / E.dayLen + E.startPhase) + 1;
    const lightStep = () => Math.round(sim.light() * 20) / 20;

    // Wirkungen aller erforschten Techs zusammenrechnen
    function applyMods() {
      Object.assign(mod, { energy: 0, wcap: 0, income: 0, refineryIncome: 0, beltBonus: 0, buildTime: 1, bE: {} });
      sim.techs.forEach(id => { const fx = (TECH[id] || {}).fx || {};
        for (const k in fx) { if (k === 'buildTime') mod.buildTime *= fx[k]; else if (k === 'bE') for (const g in fx.bE) mod.bE[g] = (mod.bE[g] || 0) + fx.bE[g]; else mod[k] = (mod[k] || 0) + fx[k]; } });
    }
    function reset() {
      sim.time = 0; sim.clock = 0; sim.nights = 0; sim.night = false; sim.quest = 0; sim.idle = 0; sim.hint = 0; sim.qLast = -1; sim.fixLight = null; sim.off = false; sim.fullT = -99; sim.acc = 0; sim.bl.length = 0; sim.cells.fill(null); sim.events.length = 0; sim.techs.clear(); sim.q.length = 0; Object.assign(sim.grid, D.grid.start);
      Object.assign(S, { ore: D.start.ore, wk: D.start.workers, sc: 0, rs: null, bat: 0, brown: false }); sim.out = false; sim.L = lightStep();
      const h = D.hq, b = { id: 'hq', def: h, i: h.i, j: h.j, x: (h.i + h.w / 2 - 5) * CS, z: (h.j + h.h / 2 - 5) * CS, built: true, t0: 0 };
      sim.bl.push(b); for (let a = 0; a < h.w; a++) for (let c = 0; c < h.h; c++) sim.cells[ci(h.i + a, h.j + c)] = b;
      sim.hq = b; sim.recalc();
    }
    // Besetzung: Arbeiter (ohne die in Ausbildung) besetzen die Stellen fertiger Gebäude der Reihe nach
    sim.frac = b => b.def.st ? (b.sw || 0) / b.def.st : 1;
    sim.eff = b => b.built && sim.powered(b) ? sim.frac(b) : 0;
    const inb = (i, j) => i >= -OFF && j >= -OFF && i < NG - OFF && j < NG - OFF;
    // Nachbarn über eine Kante (Felder links/rechts/oben/unten der Grundfläche), ohne Ecken
    function edgeCells(i, j, w, h) { const o = []; for (let a = 0; a < w; a++) { o.push([i + a, j - 1], [i + a, j + h]); } for (let c = 0; c < h; c++) { o.push([i - 1, j + c], [i + w, j + c]); } return o.filter(([x, y]) => inb(x, y)); }
    // Ist die Grundfläche an ein (nicht im Abriss befindliches) Gebäude angrenzend? Für die Vorschau beim Platzieren.
    sim.touches = (id, i, j) => { if (!E.link) return true; const d = def(id); return edgeCells(i, j, d.w, d.h).some(([x, y]) => { const o = sim.cells[ci(x, y)]; return o && !o.dying; }); };
    // Netz: Gebäude sind verbunden, wenn sich ihre Grundflächen berühren (Fließbänder überbrücken Lücken). Nur fertige Gebäude leiten. b.link, b.dist (Schritte vom Quartier), sim.nbrs
    function network() {
      const L = sim.bl.filter(b => b.built && !b.dying), set = new Set(L), nb = new Map(); L.forEach(b => nb.set(b, new Set()));
      L.forEach(b => edgeCells(b.i, b.j, b.def.w, b.def.h).forEach(([x, y]) => { const o = sim.cells[ci(x, y)]; if (o && o !== b && set.has(o)) { nb.get(b).add(o); nb.get(o).add(b); } }));
      sim.bl.forEach(b => { b.link = !E.link; b.dist = 99; }); sim.nbrs = nb; if (!E.link) return;
      const q = [sim.hq]; sim.hq.link = true; sim.hq.dist = 0;
      for (let k = 0; k < q.length; k++) nb.get(q[k]).forEach(o => { if (!o.link) { o.link = true; o.dist = q[k].dist + 1; q.push(o); } });
    }
    function staff() {
      let left = Math.max(0, S.wk - sim.queuedPop('wk')); sim.jobs.length = 0; S.st = 0;
      sim.bl.forEach(b => { b.sw = 0; const st = b.def.st || 0; if (!b.built || b.dying || !st || !b.link) return; S.st += st; b.sw = Math.min(st, left); left -= b.sw; for (let k = 0; k < b.sw; k++) sim.jobs.push(b); });
      S.sj = sim.jobs.length;
    }
    // Versorgung: Erzeuger zählen nur, wenn sie laufen. Verbraucher werden in Baureihenfolge versorgt, die zuletzt gebauten schalten zuerst ab (b.on, b.off = 'link'|'water'|'energy'|'ammo').
    function supply() {
      const lt = sim.L, act = sim.bl.filter(b => b.built && !b.dying && b.link), wk = S.wk * E.workerWater; let ec = 0, wc = 0, ac = 0, pass = 0, again = true;
      sim.bl.forEach(b => { b.on = false; b.off = b.built && !b.dying ? 'link' : null; }); act.forEach(b => { b.on = true; b.off = null; });
      S.eu = S.wu = S.au = 0; S.euOn = 0;
      while (again && pass++ < 4) { again = false; ec = mod.energy; wc = 0; ac = 0;
        act.forEach(b => { if (!b.on) return; const d = b.def; if (d.e > 0) ec += (d.e + (mod.bE[b.id] || 0)) * (d.sun ? lt : 1); if (d.wa > 0) wc += d.wa; if (d.am > 0) ac += d.am * sim.frac(b); });
        let rE = S.bat > 0 && !sim.out ? Infinity : ec, rW = wc - wk, rA = ac; S.eu = 0; S.wu = wk; S.au = 0; S.euOn = 0;
        act.forEach(b => { const d = b.def, nE = d.e < 0 ? -d.e : 0, nW = d.wa < 0 ? -d.wa : 0, nA = d.am < 0 ? -d.am : 0; S.eu += nE; S.wu += nW; S.au += nA;
          const why = nW > 0 && nW > rW + 1e-9 ? 'water' : nE > 0 && nE > rE + 1e-9 ? 'energy' : nA > 0 && nA > rA + 1e-9 ? 'ammo' : null;
          if (why) { if (b.on && (d.e > 0 || d.wa > 0 || d.am > 0)) again = true; b.on = false; b.off = why; } else { b.on = true; b.off = null; rE -= nE; rW -= nW; rA -= nA; S.euOn += nE; } });
      }
      S.ec = ec; S.wc = wc; S.ac = ac; S.offL = sim.bl.filter(b => b.built && !b.dying && b.off === 'link').length;
      S.offE = act.filter(b => b.off === 'energy').length; S.offW = act.filter(b => b.off === 'water').length; S.offA = act.filter(b => b.off === 'ammo').length;
    }
    // Bilanz, Lager, Speicher und Unterkünfte aus fertigen, verbundenen Gebäuden und Forschung
    sim.recalc = () => {
      applyMods(); network(); staff(); S.wcap = D.start.wcap + mod.wcap; S.cap = D.start.cap; S.bcap = 0;
      sim.bl.forEach(b => { if (b.built && !b.dying && b.link) { S.cap += b.def.cap || 0; S.bcap += b.def.bat || 0; } });
      S.bat = Math.min(S.bat, S.bcap); supply(); sim.netVer++;
    };
    sim.energyOk = () => S.offE === 0;
    sim.powered = b => !!b.on;
    // Erz einlagern: über der Obergrenze verfällt es (bereits vorhandener Überschuss bleibt)
    const add = n => { const t = S.ore + n; if (t > S.cap) { S.ore = Math.max(S.ore, S.cap); if (sim.time - sim.fullT > 40 && !sim.off) { sim.fullT = sim.time; emit('full', {}); } } else S.ore = t; };
    sim.buildTime = () => E.buildTime * mod.buildTime;
    // Warum geht das nicht? '' = geht. blocked(i,j,def) darf die Ansicht liefern (z. B. „Fahrzeug steht im Weg“)
    sim.whyNot = (id, i, j, blocked) => {
      const d = def(id), g = sim.grid; if (i < g.x0 || j < g.y0 || i + d.w > g.x1 || j + d.h > g.y1) return 'außerhalb des Rasters';
      for (let a = 0; a < d.w; a++) for (let b = 0; b < d.h; b++) if (sim.cget(i + a, j + b)) return 'Feld belegt';
      if (d.needs && !sim.has(d.needs)) return 'Forschung fehlt: ' + (TECH[d.needs] ? TECH[d.needs].n : d.needs);
      const w = blocked && blocked(i, j, d); if (w) return w;
      return S.ore < d.c ? 'zu wenig Erz' : '';
    };
    // Raster wächst, wenn am Rand gebaut wird. Liefert true, wenn es gewachsen ist.
    function grow(i, j, w, h) {
      const g = sim.grid, n = D.grid.grow, lim = NG - OFF; let gr = false;
      if (i <= g.x0 && g.x0 > -OFF) { g.x0 = Math.max(-OFF, g.x0 - n); gr = true; } if (i + w >= g.x1 && g.x1 < lim) { g.x1 = Math.min(lim, g.x1 + n); gr = true; }
      if (j <= g.y0 && g.y0 > -OFF) { g.y0 = Math.max(-OFF, g.y0 - n); gr = true; } if (j + h >= g.y1 && g.y1 < lim) { g.y1 = Math.min(lim, g.y1 + n); gr = true; }
      return gr;
    }
    // Bauen (kostet Erz). opt.free/opt.built/opt.prog für Spielstand-Laden.
    sim.build = (id, i, j, opt) => {
      opt = opt || {}; const d = def(id);
      if (!opt.free) { const w = sim.whyNot(id, i, j, opt.blocked); if (w) return { err: w }; }
      const b = { id, def: d, i, j, x: (i + d.w / 2 - 5) * CS, z: (j + d.h / 2 - 5) * CS, built: !!opt.built, t0: sim.time - (opt.prog || 0), rot: opt.rot || 0 };
      for (let a = 0; a < d.w; a++) for (let c = 0; c < d.h; c++) sim.cells[ci(i + a, j + c)] = b;
      sim.bl.push(b); if (!opt.free) { S.ore -= d.c; sim.idle = 0; }
      const grew = opt.free ? false : grow(i, j, d.w, d.h); if (b.built) sim.recalc();
      emit('placed', { b }); if (grew) emit('grew', {});
      return { b };
    };
    sim.remove = b => {
      if (b === sim.hq) return false; for (let k = 0; k < sim.cells.length; k++) if (sim.cells[k] === b) sim.cells[k] = null;
      sim.bl.splice(sim.bl.indexOf(b), 1); sim.recalc(); add(Math.floor(b.def.c * E.refund)); sim.idle = 0; emit('removed', { b }); return true;
    };
    // Abriss dauert E.demoTime; das Gebäude steht still (aus dem Netz), danach Erstattung. Die Ansicht spielt „rückwärts bauen“ + Staub ab.
    sim.demolish = b => { if (b === sim.hq || b.dying) return false; b.dying = true; b.dem = sim.time; sim.idle = 0; sim.recalc(); emit('demolish', { b }); return true; };
    sim.demoProgress = b => b.dying ? Math.min(1, (sim.time - b.dem) / E.demoTime) : 0;
    sim.rotate = b => { b.rot = ((b.rot || 0) + 1) % 4; return b.rot; };
    sim.progress = b => b.built ? 1 : Math.min(1, Math.max(0, (sim.time - b.t0) / sim.buildTime()));

    // ---------- Einheiten (nur Zahlen; wie die Figuren herumlaufen, entscheidet die Ansicht) ----------
    sim.queued = uid => sim.q.filter(x => x.u === uid).length;
    sim.queuedPop = pop => sim.q.filter(x => UNITS[x.u].pop === pop).length;
    sim.train = uid => {
      const u = UNITS[uid]; if (!u) return { err: 'Unbekannte Einheit' };
      if (S[u.pop] >= (u.cap === 'wcap' ? S.wcap : u.cap)) return { err: u.full }; if (!built(u.at)) return { err: 'Gebäude fehlt: ' + def(u.at).n };
      if (S.ore < u.cost) return { err: 'Zu wenig Erz' };
      S.ore -= u.cost; S[u.pop]++; sim.idle = 0; if (u.time > 0) sim.q.push({ u: uid, left: u.time }); else emit('trained', { unit: uid });
      sim.recalc();
      return { ok: 1 };
    };
    sim.trainWorker = () => sim.train('worker'); sim.trainSoldier = () => sim.train('soldier');

    // ---------- Forschung (eine zur Zeit) ----------
    sim.canResearch = id => {
      const t = TECH[id]; if (!t) return 'Unbekannt'; if (sim.has(id)) return 'Schon erforscht'; if (S.rs) return 'Forschung läuft: ' + TECH[S.rs.id].n;
      const miss = (t.req || []).find(r => !sim.has(r)); if (miss) return 'Voraussetzung: ' + TECH[miss].n;
      if (t.at && !built(t.at)) return 'Gebäude fehlt: ' + def(t.at).n; return S.ore < t.cost ? 'Zu wenig Erz' : '';
    };
    function finish(id) { sim.techs.add(id); S.rs = null; sim.recalc(); emit('researched', { id }); }
    sim.research = id => { const w = sim.canResearch(id); if (w) return { err: w }; S.ore -= TECH[id].cost; sim.idle = 0; if (TECH[id].time > 0) S.rs = { id, left: TECH[id].time }; else finish(id); return { ok: 1 }; };
    sim.grant = id => { if (sim.has(id)) return; (TECH[id].req || []).forEach(sim.grant); sim.techs.add(id); sim.recalc(); };   // ohne Kosten (Tests, Spielstand)

    sim.goal = () => { const n = D.goal.filter(built).length; return { n, of: D.goal.length, done: n === D.goal.length }; };
    // Raffinerien neben Fließbändern liefern mehr
    const beltsAt = b => sim.bl.filter(x => x.id === 'belt' && x.built && x.link && !x.dying && Math.abs(x.x - b.x) <= b.def.w * CS / 2 + CS / 2 + .1 && Math.abs(x.z - b.z) <= b.def.h * CS / 2 + CS / 2 + .1).length;
    // ---------- Aufträge (Hauptauftrag): Zustandsziele, keine Handgriff-Reihenfolge ----------
    const condVal = c => {
      if (c.k === 'built') return [sim.bl.filter(b => b.id === c.id && b.built).length, c.n];
      if (c.k === 'full') return [sim.bl.filter(b => b.id === c.id && b.built && sim.frac(b) >= 1).length, c.n];
      if (c.k === 'pop') return [S[c.pop], c.n]; if (c.k === 'tech') return [sim.has(c.id) ? 1 : 0, 1];
      if (c.k === 'cap') return [S.cap, c.n]; if (c.k === 'nights') return [sim.nights, c.n]; return [0, 1];
    };
    sim.step = () => QS[sim.quest] || null;
    sim.qProg = q => { let n = 0, of = 0; ((q && q.c) || []).forEach(c => { const [v, m] = condVal(c); n += Math.min(v, m); of += m; }); return { n, of, done: n >= of }; };
    sim.questB = () => { const q = QS[sim.quest]; if (!q) return null; const c = (q.c || []).find(x => x.k === 'built' && condVal(x)[0] < x.n); return c ? c.id : (q.b || null); };
    sim.unlocked = id => { const a = D.buildings[id] && D.buildings[id].after; if (!a) return true; const i = QS.findIndex(x => x.id === a); return i < 0 || sim.quest > i; };
    function checkQuest() {
      const from = sim.quest; while (sim.quest < QS.length && sim.qProg(QS[sim.quest]).done) sim.quest++;
      if (sim.quest !== from) { sim.idle = 0; sim.hint = 0; sim.qLast = -1; emit('quest', { step: QS[sim.quest] || null, i: sim.quest, skipped: sim.quest - from - 1 }); }
      const cur = QS[sim.quest]; if (!cur) return; const p = sim.qProg(cur).n; if (p !== sim.qLast) { if (sim.qLast >= 0) { sim.idle = 0; sim.hint = 0; } sim.qLast = p; }
      if (!sim.off) { if (sim.hint < 1 && sim.idle >= E.hint1) { sim.hint = 1; emit('hint', { level: 1, step: cur }); } if (sim.hint < 2 && sim.idle >= E.hint2) { sim.hint = 2; emit('hint', { level: 2, step: cur }); } }
    }
    // Tag/Nacht: Übergänge mit Hysterese; die Nacht zählt nur ohne Stromausfall
    function dayNight() {
      const L = sim.light();
      if (!sim.night && L < .12) { sim.night = true; S.brown = false; emit('dusk', {}); }
      else if (sim.night && L > .3) { sim.night = false; const ok = !S.brown; if (ok) sim.nights++; emit('dawn', { ok }); }
    }
    // Zeit vorspulen: am Tag bis zum Abend, in der Nacht bis zum Morgen (zählt nicht als überstandene Nacht)
    sim.skip = () => {
      const tgt = sim.phase() >= .5 ? .03 : .52, d = (((tgt - sim.phase()) % 1) + 1) % 1; sim.clock += d * E.dayLen; sim.night = tgt > .4; if (sim.night) { S.brown = false; emit('dusk', {}); } sim.L = -1; return sim.night;
    };
    // Ein Takt: Licht, Bauzeit, Ausbildung, Forschung, Batterie, Wirtschaft, Aufträge. dt in Sekunden (beliebig groß, wird in Schritte à ≤ 0,25 s zerlegt).
    sim.update = dt => {
      const rate = sim.off ? E.offlineRate : 1;
      while (dt > 0) { const h = Math.min(dt, .25); dt -= h; sim.time += h; sim.clock += h;
        const lt = lightStep(); if (lt !== sim.L) { sim.L = lt; sim.recalc(); } dayNight();
        const bt = sim.buildTime(); sim.bl.forEach(b => { if (!b.built && sim.time - b.t0 >= bt) { b.built = true; sim.recalc(); emit('built', { b }); } });
        for (let k = sim.q.length - 1; k >= 0; k--) { const x = sim.q[k]; if ((x.left -= h) <= 0) { sim.q.splice(k, 1); sim.recalc(); emit('trained', { unit: x.u }); } }
        if (S.rs && (S.rs.left -= h) <= 0) finish(S.rs.id);
        for (let k = sim.bl.length - 1; k >= 0; k--) { const x = sim.bl[k]; if (x.dying && sim.time - x.dem >= E.demoTime) sim.remove(x); }      // Abriss fertig
        S.bat = Math.min(S.bcap, Math.max(0, S.bat + (S.ec - S.euOn) * h));
        if (!sim.out && S.bat <= 0 && S.eu > S.ec) { sim.out = true; S.brown = true; if (!sim.off) emit('blackout', {}); sim.recalc(); }
        else if (sim.out && (S.eu <= S.ec || (S.bcap > 0 && S.bat >= Math.min(S.bcap, Math.max(10, .35 * S.bcap))))) { sim.out = false; sim.recalc(); }      // Wiederanlauf erst bei halbvoller Batterie
        if (sim.out) S.brown = true;
        sim.acc += h; if (sim.acc >= E.tick) { sim.acc = 0; add((E.baseIncome + mod.income) * rate);
          sim.bl.forEach(b => { if (b.id === 'ref' && b.built && sim.powered(b)) { const f = sim.frac(b); if (f <= 0) return;
            const gain = (E.refineryIncome + mod.refineryIncome + (E.beltBonus + mod.beltBonus) * beltsAt(b)) * f * rate; add(gain); emit('income', { b, gain: Math.round(gain * 10) / 10 }); } }); }
        sim.idle += h; checkQuest();
      }
    };
    // Offline-Fortschritt: bis zu 2 h mit halber Rate, immer Tageslicht, keine Hinweise. Liefert das gewonnene Erz.
    sim.offline = sec => {
      const t = Math.min(Math.max(0, sec), E.offlineMax); if (t < 30) return 0; const o = S.ore; sim.off = true; sim.fixLight = 1; sim.update(t); sim.off = false; sim.fixLight = null;
      sim.events.length = 0; sim.L = lightStep(); sim.recalc(); return Math.floor(S.ore - o);
    };

    // ---------- Spielstand (v3; v1 und v2 werden übernommen) ----------
    sim.serialize = () => ({ v: 3, time: sim.time, clock: sim.clock, nights: sim.nights, quest: sim.quest, S: { ore: S.ore, wk: S.wk, sc: S.sc, bat: S.bat }, tech: [...sim.techs], rs: S.rs ? { id: S.rs.id, left: S.rs.left } : null, q: sim.q.map(x => ({ u: x.u, left: x.left })), grid: Object.assign({}, sim.grid),
      b: sim.bl.filter(b => b !== sim.hq).map(b => ({ id: b.id, i: b.i, j: b.j, rot: b.rot || 0, built: b.built, prog: b.built ? 0 : +(sim.time - b.t0).toFixed(2), dem: b.dying ? +(sim.time - b.dem).toFixed(2) : -1 })) });
    sim.load = s => {
      reset(); if (!s || (s.v !== 1 && s.v !== 2 && s.v !== 3)) return false;
      sim.time = s.time || 0; sim.clock = s.clock != null ? s.clock : sim.time; sim.nights = s.nights || 0; sim.quest = s.quest || 0; Object.assign(S, { ore: s.S.ore, wk: s.S.wk, sc: s.S.sc, bat: 0 }); Object.assign(sim.grid, s.grid);
      const tech = s.v === 1 ? (s.S.lvl2 ? ['lvl2'] : []) : (s.tech || []); tech.forEach(id => { if (TECH[id]) sim.techs.add(id); });
      if (s.rs && TECH[s.rs.id]) S.rs = { id: s.rs.id, left: s.rs.left }; (s.q || []).forEach(x => { if (UNITS[x.u]) sim.q.push({ u: x.u, left: x.left }); });
      s.b.forEach(o => { if (D.buildings[o.id]) { const r = sim.build(o.id, o.i, o.j, { free: true, built: o.built, prog: o.prog, rot: o.rot }); if (r.b && o.dem >= 0) { r.b.dying = true; r.b.dem = sim.time - o.dem; } } });
      sim.L = lightStep(); sim.night = sim.light() < .2; sim.recalc(); S.bat = Math.min(s.S.bat || 0, S.bcap); checkQuest(); sim.idle = 0; sim.events.length = 0; return true;
    };
    sim.reset = reset; reset(); return sim;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createSim }; else root.BasisSim = { createSim };
})(typeof window !== 'undefined' ? window : globalThis);
