// Beispiel-Skripte für das Studio. Jedes ist ein vollständiges Spiel in wenigen Zeilen.
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
];
