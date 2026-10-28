// Beispiel-Skripte für das Studio. Jedes ist ein vollständiges Spiel in wenigen Zeilen; größere liegen als Textdatei in games/.
import TORWACHT from './games/torwacht.fgs';
export const EXAMPLES = [
  {
    id: 'waves',
    name: 'Wellen-Überleben (Aliens)',
    code: `// Aliens greifen in immer größeren Wellen an. Überlebe sechs Wellen.
game.hour(21); // Abend: die Stadt leuchtet
game.player.loadout(['pistol', 'rifle', 'shotgun', 'launcher']);

let wave = 0;
function nextWave() {
  wave++;
  game.hud.message('Welle ' + wave, 3);
  game.hud.set('wave', 'Welle ' + wave + ' von 6');
  game.spawnWave('alien', 2 + wave * 2);
  if (wave % 3 === 0) game.spawn('brute'); // alle drei Wellen ein Koloss
}

game.on('kill', () => {
  if (game.count('aliens') > 0) return;
  if (wave >= 6) return game.win('Alle Wellen überstanden!');
  game.hud.message('Welle geschafft – kurz durchatmen', 3);
  const p = game.city.randomOpenPoint({ min: 5, max: 14 });
  if (p) { game.pickup('health', p.x, p.z); game.pickup('ammo', p.x + 2, p.z); }
  game.after(6, nextWave);
});

game.after(2, nextWave);
`,
  },
  {
    id: 'team',
    name: 'Teamkampf (Trupp gegen Plünderer)',
    code: `// Du führst einen Trupp aus fünf Soldaten gegen drei Wellen Plünderer.
game.hour(15);
game.player.loadout(['rifle', 'shotgun', 'pistol']);

for (let i = 0; i < 5; i++) {
  game.spawn('soldier', { team: 'player', ai: 'follow', near: game.player, minR: 4, maxR: 10, name: 'Trupp' });
}

let wave = 0;
function nextWave() {
  wave++;
  game.hud.message('Plünderer greifen an – Welle ' + wave, 3);
  game.spawnWave('raider', 4 + wave * 2, { minR: 45, maxR: 80, hunt: true });
}

game.every(1, () => game.hud.set('trupp', 'Trupp: ' + game.count('player') + ' Soldaten · Welle ' + wave + ' von 3'));

game.on('kill', () => {
  if (game.count('raiders') > 0) return;
  if (wave >= 3) return game.win('Plünderer geschlagen!');
  game.hud.message('Nächste Welle in 6 Sekunden', 3);
  game.pickup('health', game.player.x + 3, game.player.z);
  game.after(6, nextWave);
});

game.after(2, nextWave);
`,
  },
  {
    id: 'mission',
    name: 'Solo-Mission (erreiche das Ziel)',
    code: `// Erreiche den grünen Ring. Unterwegs lauern Skitter in den Gassen.
game.hour(18);
game.player.loadout(['rifle', 'pistol']);

const goal = game.city.randomOpenPoint({ min: 90, max: 140 }) || { x: game.player.x + 100, z: game.player.z };
game.zone({ x: goal.x, z: goal.z, r: 7, name: 'Ziel', color: 0x7be08a, onEnter: () => game.win('Ziel erreicht!') });

// Hinterhalte: ruhende Skitter, die erst angreifen, wenn sie dich sehen
for (let i = 0; i < 8; i++) {
  const p = game.city.randomOpenPoint({ min: 30, max: 120 });
  if (p) game.spawn('alien', { x: p.x, z: p.z, ai: 'guard', sight: 40 });
}
// Hilfe am Weg
for (let i = 0; i < 3; i++) {
  const p = game.city.randomOpenPoint({ min: 20, max: 80 });
  if (p) game.pickup(i === 0 ? 'health' : 'ammo', p.x, p.z);
}

game.every(0.5, () => {
  const d = Math.round(Math.hypot(goal.x - game.player.x, goal.z - game.player.z));
  game.hud.set('ziel', 'Ziel: ' + d + ' m entfernt');
});
`,
  },
  {
    id: 'sandbox',
    name: 'Bewohner-Sandbox (lebendige Stadt)',
    code: `// Keine Aufgabe, nur eine lebendige Stadt: Bewohner und Droiden laufen umher, Wachen stehen Posten.
// Schieß in die Luft – die Bewohner flüchten bei Schüssen.
game.hour(12);
game.player.loadout(['pistol', 'rifle']);
game.setHostile('soldiers', 'player', false); // Wachen sind freundlich

for (let i = 0; i < 26; i++) game.spawn('civilian', { near: game.player, minR: 8, maxR: 150 });
for (let i = 0; i < 6; i++) game.spawn('droid', { near: game.player, minR: 8, maxR: 130 });
for (let i = 0; i < 4; i++) game.spawn('soldier', { ai: 'guard', near: game.player, minR: 15, maxR: 110 });

game.pickup('weapon', game.player.x + 4, game.player.z, { weapon: 'shotgun' });
game.pickup('weapon', game.player.x - 4, game.player.z, { weapon: 'launcher' });
game.pickup('health', game.player.x, game.player.z + 5, { respawn: 20 });

// Neugierig? Lass nach 30 Sekunden einen Skitter-Trupp auftauchen:
game.after(30, () => { game.hud.message('Aliens!', 3); game.spawnWave('alien', 5); });
`,
  },
  {
    id: 'ui',
    name: 'Radar & eigene Anzeigen (UI-Ebene)',
    code: `// Die UI-Ebene (game.ui) kann alles anzeigen. Radar und Kompass sind fertige Vorlagen,
// der Gegner-Ring unten ist ein eigenes Widget, nur mit Zeichenbefehlen gebaut.
game.hour(22);
game.player.loadout(['pistol', 'rifle', 'shotgun']);

const total = 10;
game.spawnWave('alien', total, { minR: 40, maxR: 90 });

// Ziel: ein Medipack weiter weg – auf Radar und Kompass als blaue Raute markiert
const ziel = game.city.randomOpenPoint({ min: 70, max: 130 }) ?? { x: 60, z: 60 };
game.pickup('health', ziel.x, ziel.z);
const marker = () => [{ x: ziel.x, z: ziel.z, icon: 'diamond', color: '#6ec6ff', size: 11 }];

game.ui.radar({ anchor: 'right', range: 80, markers: marker });
game.ui.compass({ markers: marker });

// Eigene Anzeige: Ring mit Rest-Gegnern
game.ui.widget({
  id: 'gegner-ring', anchor: 'bottom', size: 96, margin: 90,
  draw(g) {
    const n = game.count('aliens'), mid = g.w / 2;
    g.circle(mid, mid, 44, { fill: 'rgba(0,0,0,.5)' });
    g.ring(mid, mid, 38, { stroke: 'rgba(255,255,255,.15)', width: 5 });
    g.arc(mid, mid, 38, 0, Math.PI * 2 * Math.min(1, n / total), { stroke: n > 3 ? '#f0c040' : '#58e08a', width: 5 });
    g.text(String(n), mid, mid - 2, { size: 28, align: 'center', baseline: 'middle' });
    g.text('GEGNER', mid, mid + 22, { size: 9, align: 'center', baseline: 'middle', color: '#cdbd9c' });
  },
});

game.on('kill', () => { if (game.count('aliens') === 0) game.win('Alle Aliens erledigt!'); });
`,
  },
  {
    id: 'td',
    name: 'Mini Tower Defense (Menü, Prefabs, Wegsuche)',
    code: `// Aliens kommen durch das Südtor und laufen zum Reaktor. Mit B öffnest du das Bau-Menü (Spiel pausiert), dann setzt du Türme mit Linksklick,
// Rechtsklick bricht ab. Tab wechselt in die Vogelperspektive: dort klickst du den Bauplatz direkt an (Mausrad zoomen, WASD verschieben).
// Überstehe 5 Wellen. Zeigt: Menü + Pause, Kamerawechsel, Prefabs mit drehbarem Kopf, Wegsuche durchs Tor, Projektile, Effekte, Speichern.
game.hour(19);
game.player.loadout([]);
const SPAWN = { x: -8, z: 285 };
const CORE = game.city.randomOpenPoint({ near: { x: 0, z: 0 }, min: 10, max: 30 }) ?? { x: 0, z: 20 };
game.player.teleport(CORE.x + 6, CORE.z + 6);
let gold = 150, wave = 0, placing = null, ghost = null, ghostRing = null, lastCell = '';
const OBEN = { x: CORE.x, z: CORE.z - 6, dist: 55, pitch: 58, minDist: 15, maxDist: 140 };

// ── Prefabs ──
game.prefab('reaktor', {
  solid: 2.4, hp: 400, team: 'player', explode: 1.6,
  parts: [
    { shape: 'cylinder', size: [4.4, 0.7, 4.4], pos: [0, 0.35, 0], color: '#58524a' },
    { shape: 'cylinder', size: [2.4, 2.2, 2.4], pos: [0, 1.8, 0], color: '#3a4650', metal: 0.5 },
    { name: 'kern', shape: 'sphere', size: 1.6, pos: [0, 3.4, 0], color: '#7ae8ff', emissive: '#3ac8ff', glow: 2 },
  ],
  update(t) { t.parts.kern.y = 3.4 + Math.sin(game.time * 2) * 0.12; },
});
game.prefab('turm', {
  solid: 1.0, hp: 90, team: 'player',
  parts: [
    { shape: 'cylinder', size: [1.7, 1.0, 1.7], pos: [0, 0.5, 0], color: '#6b6358' },
    { name: 'head', shape: 'box', size: [1.2, 0.6, 1.3], pos: [0, 1.3, 0], color: '#8a7f6e', children: [
      { shape: 'sphere', size: [0.7, 0.5, 0.7], pos: [0, 0.35, -0.1], color: '#a89a82' },
      { name: 'barrel', pos: [0, 0.05, 0.45], muzzle: [0, 0, 1.4], children: [
        { shape: 'box', size: [0.22, 0.22, 1.4], anchor: [0, 0, -0.5], color: '#2c2c30', metal: 0.6 },
      ] },
    ] },
  ],
});
// fliegender Gegner aus einem Prefab (Ballon)
game.prefab('ballon', { parts: [
  { shape: 'sphere', size: [1.1, 1.4, 1.1], pos: [0, 0.8, 0], color: '#d85a4a' },
  { name: 'ring', shape: 'cylinder', size: [1.3, 0.12, 1.3], pos: [0, 0.8, 0], color: '#f4ead4' },
  { shape: 'box', size: [0.4, 0.3, 0.4], pos: [0, -0.2, 0], color: '#4a3a2a' },
] });
game.defineKind('ballon', { prefab: 'ballon', team: 'aliens', hp: 30, speed: 3.4, run: 3.4, fly: 3.2, hitR: 0.8, height: 1.8, score: 5, animate: (p, c) => { p.ring.yaw = c.t * 3; } });

const reaktor = game.place('reaktor', { x: CORE.x, z: CORE.z });
const hud = () => game.hud.set('td', 'Gold ' + gold + '  ·  Welle ' + wave + ' / 5  ·  B = Bauen  ·  Tab = Ansicht');
hud();

// ── Bau-Menü ──
const shop = game.ui.menu({
  title: 'Bauen', anchor: 'center', w: 380,
  items: () => [
    { label: 'Kanonenturm', detail: '60 Gold', disabled: gold < 60, reason: 'zu wenig Gold', onSelect() { startPlacing(60); } },
    { label: 'Reaktor reparieren (+100)', detail: '40 Gold', disabled: gold < 40 || reaktor.hp >= reaktor.maxHp, reason: gold < 40 ? 'zu wenig Gold' : 'unbeschädigt', onSelect() { gold -= 40; reaktor.heal(100); hud(); } },
    { label: 'Spiel speichern', onSelect() { game.save('td', { gold, wave, view: game.controller.active }); game.hud.message('Gespeichert', 1.5); } },
    { label: 'Spiel laden', disabled: !game.hasSave('td'), reason: 'kein Spielstand', onSelect() { game.load('td'); } },
  ],
});
game.on('key', (e) => {
  if (e.code === 'KeyB') (shop.isOpen ? shop.close() : shop.open());
  if (e.code === 'Tab') game.controller.toggle('ego', 'topdown', OBEN);
});

// ── Turm setzen: Geist am Fadenkreuz, grün = frei, rot = nicht erlaubt ──
function startPlacing(cost) {
  placing = { cost };
  ghost = game.place('turm', { ghost: true, opacity: 0.55 });
  ghostRing = game.fx.ring(0, 0, 28, { color: '#7ae8ff', opacity: 0.35 });
  game.hud.set('place', 'Linksklick: bauen · Rechtsklick: abbrechen');
}
function stopPlacing() { placing = null; ghost?.remove(); ghostRing?.remove(); ghost = ghostRing = null; game.hud.clear('place'); }
function spot() {
  const hit = game.camera.pick(); // unter dem Mauszeiger (in der Ich-Ansicht: Fadenkreuz)
  if ((hit.type !== 'ground' && hit.type !== 'world') || hit.dist > (game.controller.active === 'ego' ? 45 : 400)) return null;
  const p = game.world.snap(hit.x, hit.z, 2);
  return { ...p, check: game.world.canBuild(p.x, p.z, 1.4, { keepPath: { from: SPAWN, to: CORE, radius: 0.9 } }) };
}
game.on('click', (e) => {
  if (!placing) return;
  if (e.button === 2) return stopPlacing();
  const s = spot();
  if (!s || !s.check.ok || gold < placing.cost) { game.sound('empty'); return; }
  gold -= placing.cost;
  game.place('turm', { x: s.x, z: s.z, yaw: Math.PI - Math.atan2(CORE.x - s.x, -(CORE.z - s.z)) });
  game.fx.burst(s.x, 0.6, s.z, { count: 16, color: '#cdbd9c', soft: true, speed: 3 });
  stopPlacing(); hud();
});

// ── Türme zielen und schießen ──
game.on('update', ({ dt }) => {
  if (ghost) {
    const s = spot();
    ghost.visible = !!s; ghostRing.set({ visible: !!s });
    if (s) {
      ghost.set({ x: s.x, z: s.z });
      ghostRing.set({ x: s.x, z: s.z });
      ghost.tint(s.check.ok && gold >= placing.cost ? '#40ff70' : '#ff4a3a');
    }
  }
  for (const t of game.things('turm')) {
    t.data.cd = (t.data.cd ?? 0) - dt;
    let best = null, bd = 30;
    for (const u of game.units('aliens')) {
      const d = game.math.dist(t, u);
      if (d < bd && game.world.los({ x: t.x, y: 1.6, z: t.z }, { x: u.x, y: u.y + 0.8, z: u.z })) { bd = d; best = u; }
    }
    if (!best) continue;
    const a = t.aimAt(best, { yawPart: 'head', pitchPart: 'barrel', rate: 8 });
    if (a.aligned && t.data.cd <= 0) {
      t.data.cd = 0.55;
      const m = t.muzzle('barrel');
      game.fx.muzzle(m.x, m.y, m.z, { dir: { x: m.dx, y: m.dy, z: m.dz } });
      game.shoot({ from: m, target: best, speed: 50, damage: 16, color: '#7ae8ff', shape: 'bolt', owner: t, team: 'player' });
      game.sound('laser', 0.4);
    }
  }
});

// ── Wellen ──
function nextWave() {
  wave++; hud();
  game.hud.message('Welle ' + wave, 2.5);
  const n = 3 + wave * 2;
  for (let i = 0; i < n; i++) {
    game.after(i * 0.8, () => {
      const kind = wave >= 3 && i % 4 === 3 ? 'ballon' : 'alien';
      const u = game.spawn(kind, { x: SPAWN.x + game.random(-9, 9), z: SPAWN.z + game.random(-6, 6) });
      if (!u) return;
      if (kind === 'alien') u.emerge(0.8);
      u.goTo(CORE.x, CORE.z, { fight: true, reach: 3.4, direct: kind === 'ballon' });
    });
  }
  if (wave < 5) game.after(28, nextWave);
}
game.after(6, nextWave);
game.on('arrive', ({ unit }) => { if (unit.kind === 'ballon') { game.explode(unit.x, 1, unit.z, { radius: 5, damage: 45, team: 'aliens' }); unit.kill(); } });
game.on('kill', ({ unit }) => { if (unit.team === 'aliens') { gold += unit.kind === 'ballon' ? 8 : 12; hud(); } });
game.on('unreachable', () => game.hud.message('Gegner finden keinen Weg!', 2));
game.on('thingDestroyed', ({ thing }) => { if (thing.prefab === 'reaktor') game.lose('Der Reaktor ist zerstört'); });
game.every(2, () => { if (wave >= 5 && game.count('aliens') === 0) game.win('Alle Wellen abgewehrt!'); });
game.on('load', (e) => {
  gold = e.extra?.gold ?? gold; wave = e.extra?.wave ?? wave; hud();
  if (e.extra?.view && e.extra.view !== game.controller.active) game.controller.use(e.extra.view, OBEN);
  for (const u of game.units('aliens')) u.goTo(CORE.x, CORE.z, { fight: true, reach: 3.4, direct: u.kind === 'ballon' });
});
`,
  },
  {
    id: 'kamera',
    name: 'Kamera-Modul (Ich-Ansicht ↔ Vogelperspektive)',
    code: `// Kamera-Modul: Tab wechselt zwischen Ich-Ansicht und Vogelperspektive über dem Südtor.
// Oben: WASD verschieben · Mausrad zoomen · Q/E drehen · Rechtsklick ziehen = drehen/kippen · Linksklick markiert einen Punkt am Boden.
// Zeigt: game.module, ctx.input.action, game.controller (ego/topdown), Klick mit Bodenpunkt, Zustand im Spielstand (K speichern · L laden).
game.hour(11);
const TOR = { x: -8, z: 238 };
game.player.teleport(TOR.x, TOR.z + 14);

function anwenden(ctx) {
  if (ctx.state.ansicht === 'oben') ctx.controller.use('topdown', { x: TOR.x, z: TOR.z, dist: 60, pitch: 55, minDist: 15, maxDist: 160 });
  else ctx.controller.use('ego');
}

game.module('kamera', {
  doc: 'Tab: Ich-Ansicht ↔ Vogelperspektive',
  state: { ansicht: 'ego', marken: 0 },
  enable(ctx) {
    ctx.input.action('ansicht', { keys: ['Tab'] });
    ctx.own(() => { if (ctx.controller.active !== 'ego') ctx.controller.use('ego'); }); // beim Abschalten zurück zur Ich-Ansicht
    ctx.on('update', () => {
      if (!ctx.input.pressed('ansicht')) return;
      ctx.state.ansicht = ctx.controller.active === 'ego' ? 'oben' : 'ego';
      anwenden(ctx);
    });
    ctx.on('click', (e) => {
      if (ctx.controller.active !== 'topdown' || e.button !== 0 || !e.ground) return;
      ctx.fx.ring(e.ground.x, e.ground.z, 2.5, { color: '#7ae8ff', sec: 1 });
      ctx.state.marken++;
    });
    ctx.on('key', (e) => { if (e.code === 'KeyK') game.save('kamera'); if (e.code === 'KeyL') game.load('kamera'); });
    ctx.every(0.5, () => ctx.hudSet('kamera', 'Tab = ' + (ctx.state.ansicht === 'ego' ? 'Vogelperspektive' : 'Ich-Ansicht') + '  ·  Markierungen ' + ctx.state.marken + '  ·  K speichern, L laden'));
    anwenden(ctx);
  },
  load(ctx, data) { Object.assign(ctx.state, data); anwenden(ctx); },
});
`,
  },
  {
    id: 'wurm',
    name: 'Eigenes Wesen: Sandwurm mit Trefferzonen',
    code: `// Ein eigenes Wesen: Sandwurm aus sieben Kugeln mit eigenen Trefferzonen (Kopf zählt dreifach), eigener Bewegung und Spur.
// Zeigt: game.prefab mit build / hits / update / save / load, Thing.walk (stoppt an Gebäuden), ctx.place (gehört dem Modul), Zustand im Spielstand.
// Erlege drei Würmer. Zielen auf den roten Kopf lohnt sich. K speichern · L laden.
game.hour(16);

game.prefab('wurm', {
  hp: 120, team: 'aliens', height: 1.4, radius: 0.9, explode: 0.9,
  build(t, { THREE }) {
    const g = new THREE.Group(), geo = new THREE.SphereGeometry(0.5, 12, 8);
    const haut = new THREE.MeshStandardMaterial({ color: '#8a6a4a', roughness: 0.9 }), kopf = new THREE.MeshStandardMaterial({ color: '#b04a3a', roughness: 0.7 });
    t.seg = []; t.trail = [];
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(geo, i === 0 ? kopf : haut);
      m.scale.setScalar(1.5 - i * 0.12); m.position.set(0, 0.6, -i * 0.9); m.castShadow = true;
      g.add(m); t.seg.push(m);
    }
    return g;
  },
  // eine Trefferzone pro Kugel; sie folgen der Kugel, auch wenn der Wurm sich windet
  hits: Array.from({ length: 7 }, (_, i) => ({ name: i === 0 ? 'kopf' : 'koerper' + i, r: 0.75 - i * 0.07, mult: i === 0 ? 3 : 1, follow: (t) => t.seg[i] })),
  update(t, dt) {
    const P = game.player, dx = P.x - t.x, dz = P.z - t.z, d = Math.hypot(dx, dz) || 1;
    if (d > 2.2) t.walk((dx / d) * 3.2 * dt, (dz / d) * 3.2 * dt, { radius: 0.8 }); // läuft auf den Spieler zu, Gebäude blockieren
    else { t.data.biss = (t.data.biss ?? 0) - dt; if (t.data.biss <= 0) { game.player.damage(12); t.data.biss = 1.2; } }
    const last = t.trail[0];
    if (!last || Math.hypot(t.x - last.x, t.z - last.z) >= 0.9) { t.trail.unshift({ x: t.x, z: t.z }); t.trail.length = Math.min(t.trail.length, 7); }
    t.seg.forEach((m, i) => {
      const q = i === 0 ? t : t.trail[i] ?? t.trail[t.trail.length - 1] ?? t;
      m.position.set(q.x - t.x, 0.6 + Math.sin(game.time * 6 - i) * 0.08, q.z - t.z);
    });
  },
  save: (t) => ({ trail: t.trail }),
  load: (t, d) => { t.trail = d.trail ?? []; },
});

game.module('wurm', {
  doc: 'Sandwürmer erscheinen in der Nähe, bis drei erlegt sind',
  state: { erlegt: 0 },
  enable(ctx) {
    const neu = () => {
      if (ctx.state.erlegt >= 3 || game.things('wurm').length) return;
      const q = game.city.randomOpenPoint({ near: { x: game.player.x, z: game.player.z }, min: 25, max: 45 });
      if (q) ctx.place('wurm', { x: q.x, z: q.z });
    };
    neu();
    ctx.on('thingDestroyed', ({ thing }) => {
      if (thing.prefab !== 'wurm') return;
      ctx.state.erlegt++;
      if (ctx.state.erlegt >= 3) game.win('Alle Würmer erlegt!'); else ctx.after(3, neu);
    });
    ctx.on('key', (e) => { if (e.code === 'KeyK') game.save('wurm'); if (e.code === 'KeyL') game.load('wurm'); });
    ctx.every(0.5, () => ctx.hudSet('wurm', 'Würmer erlegt: ' + ctx.state.erlegt + ' / 3  ·  Kopftreffer zählen dreifach  ·  K speichern, L laden'));
  },
});
`,
  },
  {
    id: 'npc',
    name: 'NPC mit Gesprächsbaum (gespeicherte Entscheidung)',
    code: `// NPC mit Gesprächsbaum aus Daten: Geh zu Salma und drücke E. Deine Antworten ändern die Geschichte und werden gespeichert.
// Zeigt: datengesteuerten Dialog (die Gesprächsdaten stehen oben, die Logik ist allgemein), ctx.ui.menu mit Fließtext,
// Zustand im Spielstand (kein erneuter Lohn nach dem Laden), Module besitzen ihre Objekte. K speichern · L laden.
game.hour(10);
const DIALOG = {
  start:    { text: 'Hey, Fremder! Unser Brunnen ist leer und die Leute werden unruhig. Kannst du mir helfen?',
              choices: [{ label: 'Was soll ich tun?', next: 'auftrag' }, { label: 'Keine Zeit.', next: 'tschuess' }] },
  auftrag:  { text: 'Such drei blaue Wasserkanister hier in der Gegend und bring sie mir. Ich revanchiere mich.',
              choices: [{ label: 'Mache ich.', next: 'los', set: { quest: 'aktiv' }, tun: 'kanister' }, { label: 'Zu gefährlich.', next: 'tschuess', set: { quest: 'abgelehnt' } }] },
  los:      { text: 'Danke! Sie müssten nicht weit weg sein.', choices: [{ label: 'Bis gleich.' }] },
  tschuess: { text: 'Schade. Mein Angebot steht, falls du es dir anders überlegst.', choices: [{ label: 'Gut.' }] },
  nochmal:  { text: 'Na, doch bereit zu helfen?', choices: [{ label: 'Ja, ich suche die Kanister.', next: 'los', set: { quest: 'aktiv' }, tun: 'kanister' }, { label: 'Nein.', next: 'tschuess' }] },
  warten:   { text: 'Noch nicht alle drei da. Such weiter!', choices: [{ label: 'Mache ich.' }] },
  fertig:   { text: 'Alle drei! Du hast der Stadt geholfen. Nimm das hier.', choices: [{ label: 'Gern geschehen.', set: { quest: 'erledigt' }, tun: 'belohnung' }] },
  danke:    { text: 'Schon wieder du, Held des Brunnens! Hier ist alles ruhig.', choices: [{ label: 'Bis dann.' }] },
};
// Aktionen, auf die die Gesprächsdaten mit „tun“ verweisen
const TUN = {
  kanister(ctx) {
    ctx.state.kanister = 0;
    const n = game.things('npc')[0];
    for (let i = 0; i < 3; i++) { const q = game.city.randomOpenPoint({ near: { x: n.x, z: n.z }, min: 10, max: 30 }); if (q) ctx.place('kanister', { x: q.x, z: q.z }); }
  },
  belohnung() { game.player.heal(100); game.hud.message('Belohnung: +100 Leben', 2.5); },
};
const einstieg = (st) => (st.quest === 'aktiv' ? (game.things('kanister').length === 0 ? 'fertig' : 'warten') : { offen: 'start', abgelehnt: 'nochmal', erledigt: 'danke' }[st.quest]);

game.prefab('npc', { height: 1.8, radius: 0.5, solid: 0.5, team: 'player', // ohne hp: unverwundbar
  parts: [
    { shape: 'cylinder', size: [0.7, 1.0, 0.7], pos: [0, 0.5, 0], color: '#a8643a' },
    { shape: 'sphere', size: 0.5, pos: [0, 1.35, 0], color: '#e0b48a' },
    { shape: 'box', size: [0.9, 0.12, 0.9], pos: [0, 1.62, 0], color: '#3a2a1a' },
  ],
  update(t) { if (game.math.dist(t, game.player) < 9) t.face(game.player.x, game.player.z); },
});
game.prefab('kanister', { parts: [{ shape: 'cylinder', size: [0.4, 0.6, 0.4], pos: [0, 0.3, 0], color: '#3a7ad8', emissive: '#2a5ab0', glow: 0.6 }] });

game.module('npc', {
  doc: 'Salma: Gesprächsbaum, Auftrag, gespeicherte Entscheidung',
  state: { quest: 'offen', kanister: 0, gespraeche: 0 },
  enable(ctx) {
    const p = game.city.randomOpenPoint({ near: { x: game.player.x, z: game.player.z }, min: 6, max: 14 }) ?? { x: game.player.x + 6, z: game.player.z };
    ctx.place('npc', { x: p.x, z: p.z });
    let knoten = 'start';
    const dlg = ctx.ui.menu({
      id: 'dialog', title: 'Salma', anchor: 'bottom', w: 520, closeOnSelect: false, hint: '1–9 oder Klick · Esc beendet',
      text: () => DIALOG[knoten]?.text ?? '',
      items: () => (DIALOG[knoten]?.choices ?? []).map((c) => ({ label: c.label, onSelect() {
        if (c.set) Object.assign(ctx.state, c.set);   // die Entscheidung landet im Zustand und damit im Spielstand
        if (c.tun) TUN[c.tun](ctx);
        if (c.next) knoten = c.next; else dlg.close();
      } })),
    });
    ctx.on('use', () => {
      const n = game.things('npc')[0];
      if (!n || game.math.dist(n, game.player) > 4) return;
      ctx.state.gespraeche++;
      knoten = einstieg(ctx.state);
      dlg.open();
    });
    ctx.on('update', () => {
      for (const k of game.things('kanister')) {
        if (game.math.dist(k, game.player) > 1.8) continue;
        game.fx.burst(k.x, 0.6, k.z, { count: 12, color: '#7ab8ff', speed: 3 });
        k.remove(); ctx.state.kanister++;
      }
    });
    ctx.on('key', (e) => { if (e.code === 'KeyK') game.save('npc'); if (e.code === 'KeyL') game.load('npc'); });
    ctx.every(0.5, () => {
      const q = ctx.state.quest, n = game.things('npc')[0], nah = n && game.math.dist(n, game.player) <= 4;
      ctx.hudSet('npc', (q === 'aktiv' ? 'Kanister: ' + ctx.state.kanister + ' / 3' : q === 'erledigt' ? 'Auftrag erledigt' : 'Sprich mit Salma') + (nah ? '  ·  E = reden' : '') + '  ·  K speichern, L laden');
    });
  },
});
`,
  },
  {
    id: 'torwacht',
    name: 'Torwacht – Tower Defense (Grafiktest)',
    code: TORWACHT,
  },
];
