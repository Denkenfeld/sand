#!/usr/bin/env node
// tools/balance.js – Bot-Balance:  node tools/balance.js
// Der Bot spielt einen festen Plan (kauft der Reihe nach, sobald das Erz reicht) und misst Tempo, Lager, Nacht und Aufträge.
// Außerdem: Amortisation jeder Forschung mit Erzwirkung (Referenzbasis: 4 voll besetzte Raffinerien mit je 2 Fließbändern).
// Der Plan steht unten in PLAN. Ändern sich Gebäude oder Forschung in data.js, hier nur bei Bedarf nachziehen.
const path = require('path');
const D0 = require(path.join(__dirname, '../zones/basis/data.js')), { createSim } = require(path.join(__dirname, '../zones/basis/sim.js'));

// b = bauen · u = Einheit ausbilden · t = erforschen · near = in die Nähe dieses Gebäudes (Fließband) · Reihenfolge fest
const PLAN = [
  { b: 'dew' }, { b: 'solar' }, { b: 'ref' }, { u: 'worker' }, { b: 'belt', near: 'ref' }, { b: 'belt', near: 'ref' }, { b: 'silo' }, { t: 'lvl2' },
  { u: 'worker' }, { b: 'ref' }, { u: 'worker' }, { u: 'worker' }, { b: 'belt', near: 'ref' }, { b: 'belt', near: 'ref' }, { b: 'silo' },
  { b: 'bar' }, { u: 'soldier' }, { u: 'soldier' }, { u: 'soldier' }, { t: 'drill' }, { b: 'ref' }, { u: 'worker' }, { u: 'worker' }, { b: 'ref' }, { u: 'worker' }, { u: 'worker' },
  { t: 'chain' }, { t: 'rapid' }, { t: 'cells' }, { b: 'silo' }, { b: 'silo' }, { t: 'over' },
];
// Der Bot ergänzt Wasser, Energie und Batterien selbst, bevor er einen neuen Verbraucher kauft (wie ein umsichtiger Spieler)
function infra(sim, p) {
  const S = sim.S, D = sim.D, m = sim.mod; let dE = 0, dW = 0;
  if (p && p.b) { const d = D.buildings[p.b]; dE = d.e < 0 ? -d.e : 0; dW = d.wa < 0 ? -d.wa : 0; if (p.b === 'dew' || p.b === 'solar' || p.b === 'battery') return null; }
  if (p && p.u === 'worker') dW = D.economy.workerWater;
  let nom = m.energy, night = m.energy, eu = dE, wc = 0, wu = dW + S.wk * D.economy.workerWater, bcap = 0;       // alles zählen, auch was noch gebaut wird
  sim.bl.forEach(b => { const d = b.def, e = d.e > 0 ? d.e + (m.bE[b.id] || 0) : d.e; if (e > 0) { nom += e; if (!d.sun) night += e; } else eu -= e; if (d.wa > 0) wc += d.wa; else wu -= d.wa; bcap += d.bat || 0; });
  const deficit = Math.max(0, eu - night);
  if (wu > wc) return 'dew'; if (eu > nom || (deficit > 0 && nom - eu < deficit * 1.15)) return 'solar';   // Überschuss am Tag lädt die Batterien
  if (deficit * D.economy.dayLen * .5 > bcap) return 'battery'; return null;
}
// Platz suchen: nahe der Mitte (oder nahe dem ersten Gebäude `near`), nur gültige Felder
function spot(sim, id, near) {
  const g = sim.grid, d = id === 'hq' ? sim.D.hq : sim.D.buildings[id]; let best = null, bd = 1e9;
  const ref = near ? sim.bl.filter(b => b.id === near && b.built) : [];
  for (let i = g.x0; i < g.x1; i++) for (let j = g.y0; j < g.y1; j++) {
    const w = sim.whyNot(id, i, j); if (w && w !== 'zu wenig Erz') continue; if (!sim.touches(id, i, j)) continue;      // muss ans Netz grenzen
    const x = (i + d.w / 2 - 5) * sim.D.grid.CS, z = (j + d.h / 2 - 5) * sim.D.grid.CS; let sc = Math.hypot(x, z);
    if (near) { const cs = sim.D.grid.CS; const adj = ref.filter(b => Math.abs(b.x - x) <= b.def.w * cs / 2 + cs / 2 + .1 && Math.abs(b.z - z) <= b.def.h * cs / 2 + cs / 2 + .1).length; sc = adj ? -adj * 100 + sc : sc + 1000; }
    if (sc < bd) { bd = sc; best = [i, j]; } }
  return best;
}
function runPlan(D, minutes, plan) {
  plan = plan || PLAN; const sim = createSim(D), S = sim.S, nt = Object.keys(D.tech).length, out = { ore: {}, qTimes: [], blackouts: 0, log: [] };
  const marks = [5, 10, 20, 30, 60], total = Math.round(minutes * 60); let idx = 0, lastQ = 0, brown = false;
  for (let t = 0; t <= total; t++) {
    for (let guard = 0; guard < 40 && idx <= plan.length; guard++) {
      const inf = infra(sim, plan[idx]); let p = inf ? { b: inf } : plan[idx], ok = false; if (!p) break;
      if (p.b) { const d = D.buildings[p.b]; if (S.ore >= d.c) { const at = spot(sim, p.b, p.near); if (at) { const r = sim.build(p.b, at[0], at[1]); if (!r.err) { ok = true; out.log.push([t, 'b:' + p.b]); } } } }
      else if (p.u) { const r = sim.train(p.u); ok = !!r.ok; if (ok) out.log.push([t, 'u:' + p.u]); }
      else if (p.t) { const r = sim.research(p.t); ok = !!r.ok; if (ok) out.log.push([t, 't:' + p.t]); }
      if (!ok) break; if (!inf) idx++;
    }
    if (out.tGoal == null && sim.goal().done) out.tGoal = t;
    if (out.allTech == null && sim.techs.size === nt) out.allTech = t / 60;
    if (idx >= plan.length && out.tPlan == null) out.tPlan = t / 60;
    if (sim.quest !== lastQ) { for (let k = lastQ; k < sim.quest; k++) out.qTimes.push(+(t / 60).toFixed(1)); lastQ = sim.quest; }
    if (S.brown && !brown) out.blackouts++; brown = S.brown;
    marks.forEach(m => { if (t === m * 60) out.ore[m] = Math.floor(S.ore); });
    sim.update(1); sim.events.length = 0;
  }
  out.done = idx >= plan.length; out.sim = sim; out.maxOre = S.cap; return out;
}

// Referenzbasis für die Amortisation: viel Lager, immer Tag, 4 Raffinerien mit Bändern, alle voll besetzt
function refBase(D, techs) {
  const D2 = JSON.parse(JSON.stringify(D)); D2.start.cap = 1e9;  D2.economy.link = false; const s = createSim(D2); s.S.ore = 1e8; s.fixLight = 1; s.L = 1; s.S.wk = 20; D2.start.wcap = 20;
  [['dew', 0, 0], ['dew', 1, 0], ['dew', 2, 0], ['dew', 3, 0], ['dew', 4, 0], ['solar', 0, 8], ['solar', 2, 8], ['ref', 0, 2], ['ref', 4, 2], ['ref', 0, 6], ['ref', 4, 6]].forEach(([id, i, j]) => { const r = s.build(id, i, j, { free: true, built: true }); if (r.err) throw new Error(id + ' ' + r.err); });
  const refs = s.bl.filter(b => b.id === 'ref');
  refs.forEach(r => { [[r.i - 1, r.j], [r.i + 2, r.j]].forEach(([i, j]) => { if (!s.whyNot('belt', i, j)) s.build('belt', i, j, { free: true, built: true }); }); });
  techs.forEach(t => s.grant(t)); s.recalc(); return s;
}
function perMin(D, techs) { const s = refBase(D, techs); s.update(5); const o = s.S.ore; s.update(60); return s.S.ore - o; }
function paybacks(D) {
  const res = {};
  Object.keys(D.tech).forEach(id => { const req = []; const go = x => { (D.tech[x].req || []).forEach(r => { go(r); req.push(r); }); }; go(id);
    const base = perMin(D, req), withT = perMin(D, req.concat(id)), delta = withT - base;
    res[id] = { delta, payback: delta > 0 ? D.tech[id].cost / delta : Infinity }; });
  return res;
}
module.exports = { runPlan, paybacks, PLAN, refBase, perMin };

if (require.main === module) {
  const r = runPlan(D0, 60), pb = paybacks(D0), S = r.sim.S;
  console.log('Missionsziel (Wasser·Energie·Erz): nach ' + r.tGoal + ' s');
  console.log('Plan komplett nach ' + (r.tPlan != null ? r.tPlan.toFixed(1) + ' min' : 'nicht erreicht') + ' · Forschungsbaum fertig nach ' + (r.allTech != null ? r.allTech.toFixed(1) + ' min' : 'nicht erreicht'));
  console.log('Erz nach min: ' + Object.keys(r.ore).map(m => m + '→' + r.ore[m]).join('  ') + '   (Lager-Obergrenze am Ende: ' + S.cap + ')');
  console.log('Stromausfälle des Bots: ' + r.blackouts + ' · überstandene Nächte: ' + r.sim.nights + ' · Aufträge fertig nach min: ' + r.qTimes.join(', '));
  console.log('\nForschung               Kosten   Mehrertrag/min   Amortisation');
  Object.keys(D0.tech).forEach(id => { const p = pb[id], t = D0.tech[id]; console.log((t.n + '                      ').slice(0, 22) + String(t.cost).padStart(7) + String(Math.round(p.delta)).padStart(16) + (p.delta > 0 ? (p.payback.toFixed(1) + ' min').padStart(15) : '   (keine Erzwirkung)')); });
}
