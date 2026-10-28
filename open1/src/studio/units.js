// Einheiten-Typen für game.spawn(kind, …). Jeder Eintrag lässt sich beim Spawnen überschreiben, z. B. game.spawn('alien', { hp: 200, speed: 7 }).
//   model/params: Figur aus der Werkstatt   team: Mannschaft (nur 'npc' ist neutral)   ai: chase | guard | wander | follow | none
//   atk: { type:'ranged', dmg, rate (s), range (m), acc (0–1) } oder { type:'melee', dmg, rate, reach }
//   jitter: zufällige Größenabweichung (±)   hunt: kennt immer die Position des nächsten Gegners   flee: rennt bei Schüssen/Treffern weg   style: Sturzart (tip | flip)
export const KINDS = {
  soldier: {
    label: 'Soldat', model: 'warrior', params: { armor: 'olive', weapon: 'rifle', shield: false }, vary: {}, jitter: 0.05,
    team: 'soldiers', hp: 100, speed: 3.4, run: 5.4, ai: 'chase', sight: 70, hunt: false,
    atk: { type: 'ranged', dmg: 6, rate: 0.5, range: 42, acc: 0.8 }, score: 10, style: 'tip', color: 0x4aa0ff,
  },
  raider: {
    label: 'Plünderer', model: 'warrior', params: { armor: 'rust', weapon: 'rifle', shield: false, cape: false }, vary: {}, jitter: 0.05,
    team: 'raiders', hp: 80, speed: 3.6, run: 5.8, ai: 'chase', sight: 65, hunt: false,
    atk: { type: 'ranged', dmg: 5, rate: 0.55, range: 36, acc: 0.65 }, score: 10, style: 'tip', color: 0xff7a3a,
  },
  civilian: {
    label: 'Bewohner', model: 'wanderer', params: {}, vary: { robe: ['sand', 'umber', 'gray', 'indigo', 'olive'] }, jitter: 0.07,
    team: 'npc', hp: 50, speed: 1.6, run: 4.6, ai: 'wander', flee: true, atk: null, score: -20, style: 'tip', color: 0,
  },
  droid: {
    label: 'Droide', model: 'utilityDroid', params: {}, vary: {},
    team: 'npc', hp: 45, speed: 1.4, run: 3.2, ai: 'wander', flee: true, atk: null, score: -5, style: 'tip', color: 0,
  },
  alien: {
    label: 'Skitter', model: 'skitter', params: { eye: 'green', hue: 'dark' }, vary: { hue: ['dark', 'moss'] }, jitter: 0.1,
    team: 'aliens', hp: 45, speed: 4.6, run: 6.6, ai: 'chase', sight: 90, hunt: true,
    atk: { type: 'melee', dmg: 8, rate: 0.9, reach: 1.7 }, score: 10, style: 'flip', color: 0x7aff6a, hitR: 0.5, height: 1.05,
  },
  brute: {
    label: 'Koloss', model: 'skitter', params: { eye: 'red', hue: 'rust' }, vary: {}, scale: 2.3,
    team: 'aliens', hp: 380, speed: 3.4, run: 4.6, ai: 'chase', sight: 90, hunt: true,
    atk: { type: 'melee', dmg: 28, rate: 1.4, reach: 3.3 }, score: 50, style: 'flip', color: 0xff4a3a, hitR: 0.5, height: 1.05,
  },
};

export const TEAM_COLORS = { player: 0x62b9a8, soldiers: 0x4aa0ff, raiders: 0xff7a3a, aliens: 0x7aff6a };
