// Erzeugt docs/api.json und docs/forge.d.ts aus src/studio/spec.js (eine Quelle). Aufruf: npm run docs
import { writeFileSync, mkdirSync } from 'node:fs';
import { API_VERSION, API_LEVEL, CAPS, EVENTS, EVENT_DOC, PLANNED, NS, TYPES, NS_TYPE } from '../src/studio/spec.js';

const kindOf = ([, ts, , kind]) => (ts.startsWith('(') || ts.startsWith('<') ? 'method' : kind === 'get' ? 'readonly' : 'property');

// ── api.json ──
const entries = [];
for (const [ns, list] of Object.entries(NS)) for (const m of list) entries.push({ path: ns === 'game' ? 'game.' + m[0] : 'game.' + ns + '.' + m[0], kind: kindOf(m), type: m[1], doc: m[2] });
const types = {};
for (const [name, t] of Object.entries(TYPES)) if (t.members.length) types[name] = { extends: t.extends ?? null, doc: t.doc, tested: !!t.live, members: t.members.map((m) => ({ name: m[0], kind: kindOf(m), type: m[1], doc: m[2] })) };
const json = { apiVersion: API_VERSION, apiLevel: API_LEVEL, capabilities: CAPS, events: EVENTS.map((e) => ({ name: e, payload: EVENT_DOC[e] ?? '' })), planned: PLANNED, entries, types };
mkdirSync('docs', { recursive: true });
writeFileSync('docs/api.json', JSON.stringify(json, null, 1) + '\n');

// ── forge.d.ts ──
const out = [];
const member = (m) => {
  const [name, ts, doc] = m, k = kindOf(m), c = doc ? `  /** ${doc.replace(/\*\//g, '*\\/')} */\n` : '';
  if (k === 'method') {
    const i = ts.lastIndexOf(' => '); // „(a: T) => R“ → „name(a: T): R“; bei verschachtelten Funktionstypen: das äußerste „ => “ nach der schließenden Klammer
    let depth = 0, cut = -1;
    for (let j = 0; j < ts.length; j++) { const ch = ts[j]; if (ch === '(' || ch === '<' || ch === '{' || ch === '[') depth++; else if (ch === ')' || ch === '>' || ch === '}' || ch === ']') { if (!(ch === '>' && ts[j - 1] === '=')) depth--; } else if (depth === 0 && ts.startsWith(' => ', j)) { cut = j; break; } }
    if (cut < 0) cut = i;
    return `${c}  ${name}${ts.slice(0, cut)}: ${ts.slice(cut + 4)};`;
  }
  return `${c}  ${k === 'readonly' ? 'readonly ' : ''}${name}: ${ts};`;
};
out.push(`// Desert Forge – Skript-Schnittstelle ${API_VERSION} (API-Stufe ${API_LEVEL}). GENERIERT aus src/studio/spec.js (npm run docs) – nicht von Hand ändern.`, '// Im Skript ist `game` bereits vorhanden; die Typen helfen Editor und KI.', '');
for (const [name, t] of Object.entries(TYPES)) {
  if (name === 'Game' || Object.values(NS_TYPE).includes(name)) continue;
  out.push(`${t.doc ? `/** ${t.doc} */\n` : ''}export interface ${name}${t.extends ? ' extends ' + t.extends : ''} {`, ...t.members.map(member), '}', '');
}
for (const [ns, name] of Object.entries(NS_TYPE)) out.push(`export interface ${name} {`, ...NS[ns].map(member), '}', '');
out.push('export interface Game {', ...NS.game.map(member), '}', '');
out.push('/** Ereignisse für game.on(name, fn). */', `export type GameEvent = ${EVENTS.map((e) => `'${e}'`).join(' | ')};`, '');
out.push('declare const game: Game;', 'export { game };', '');
writeFileSync('docs/forge.d.ts', out.join('\n'));
console.log('docs/api.json:', entries.length, 'Einträge,', Object.keys(types).length, 'Typen · docs/forge.d.ts geschrieben');
