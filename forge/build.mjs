// Desert Forge – Build: bündelt src/main.js samt three + cannon-es in eine einzelne HTML-Datei.
//   npm run build   → index.html (Hauptordner, fertige Einzeldatei) + dist/index.html + dist/artifact.html (Fragment zum Veröffentlichen)
//   npm run dev     → gleiches Ergebnis ohne Minify (bessere Fehlermeldungen)
import { build } from 'esbuild';
import fs from 'node:fs';

const dev = process.argv.includes('--dev');
const tpl = fs.readFileSync('src/index.template.html', 'utf8');
const out = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: !dev,
  sourcemap: false,
  format: 'iife',
  target: 'es2020',
  legalComments: 'none',
  write: false,
  logLevel: 'warning',
  define: { __TEMPLATE__: JSON.stringify(tpl) }, // für den Spiel-Export im Studio
});

const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const fragment = tpl.replace('/*__BUNDLE__*/', () => js);

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/artifact.html', fragment);
const page =
  '<!doctype html><html lang="de"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' +
  fragment +
  '</body></html>';
fs.writeFileSync('dist/index.html', page);
if (!dev) fs.writeFileSync('index.html', page); // fertige Einzeldatei im Hauptordner: Doppelklick genügt
console.log(`dist/artifact.html  ${(fragment.length / 1024).toFixed(0)} KB${dev ? '  (dev)' : ''}`);
