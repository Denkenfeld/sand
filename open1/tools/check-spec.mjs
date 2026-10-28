// Statische Prüfung der Signatur-Quelle (läuft ohne Browser): npm test. Der Abgleich mit dem echten Spiel steht in tools/check-live.md (Playwright-Skript).
import { NS, TYPES, NS_TYPE, CAPS, EVENTS, EVENT_DOC } from '../src/studio/spec.js';
let bad = 0; const fail = (m) => { bad++; console.error('FEHLER:', m); };
const BUILTIN = new Set(['Record', 'Promise', 'Partial', 'ArrayBuffer', 'ArrayBufferView', 'Blob', 'T', 'Game', 'ModuleCtx']);
const idents = (ts) => [...ts.matchAll(/\b([A-Z][A-Za-z0-9]+)\b/g)].map((m) => m[1]).filter((n) => !['THREE', 'TAU', 'PI'].includes(n));
const check = (where, ts) => { for (const n of idents(ts)) if (!BUILTIN.has(n) && !TYPES[n]) fail(`${where}: unbekannter Typ „${n}“ in ${ts}`); };
for (const [ns, list] of Object.entries(NS)) {
  const seen = new Set();
  for (const m of list) { if (seen.has(m[0])) fail(`doppelt: ${ns}.${m[0]}`); seen.add(m[0]); check(`${ns}.${m[0]}`, m[1]); if (!m[2]) fail(`${ns}.${m[0]}: Beschreibung fehlt`); }
}
for (const [name, t] of Object.entries(TYPES)) {
  const seen = new Set(); if (t.extends && !TYPES[t.extends]) fail(`${name}: extends ${t.extends} unbekannt`);
  for (const m of t.members) { if (seen.has(m[0])) fail(`doppelt: ${name}.${m[0]}`); seen.add(m[0]); check(`${name}.${m[0]}`, m[1]); }
}
for (const [ns, n] of Object.entries(NS_TYPE)) if (!TYPES[n]) fail(`NS_TYPE ${ns}: ${n} fehlt in TYPES`);
for (const e of EVENTS) if (!EVENT_DOC[e]) fail(`Ereignis ohne Beschreibung: ${e}`);
for (const e of Object.keys(EVENT_DOC)) if (!EVENTS.includes(e)) fail(`Beschreibung für unbekanntes Ereignis: ${e}`);
console.log(bad ? `${bad} Fehler` : `ok – ${Object.values(NS).reduce((s, l) => s + l.length, 0)} Einträge, ${Object.keys(TYPES).length} Typen, ${Object.keys(CAPS).length} Fähigkeiten, ${EVENTS.length} Ereignisse`);
process.exit(bad ? 1 : 0);
