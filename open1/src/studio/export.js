// Export: die laufende Seite (Vorlage + Programmcode) plus Skript und Stadt-Seed zu einer einzigen HTML-Datei zusammensetzen.
/* global __TEMPLATE__ */
const TEMPLATE = typeof __TEMPLATE__ !== 'undefined' ? __TEMPLATE__ : null;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function buildExport({ script, title, seed, assets = [] }) {
  const bundle = document.getElementById('forge-bundle')?.textContent;
  if (!TEMPLATE || !bundle) throw new Error('Export nicht möglich: Programmcode der Seite nicht gefunden.');
  const data = JSON.stringify({ v: 2, title, seed, script, assets }).replace(/</g, '\\u003c');
  const frag = TEMPLATE.replace('/*__BUNDLE__*/', () => bundle) + `\n<script type="application/json" id="game-data">${data}</script>`;
  // <title> aus der Vorlage durch den Spieltitel ersetzen
  // Der Export macht keine Netzwerkanfragen: die Google-Fonts-Verweise der Vorlage entfallen (es gelten die Systemschriften der CSS-Liste)
  const body = frag.replace(/<title>[^<]*<\/title>/, '').replace(/<link[^>]*(fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>\s*/g, '');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head><body>${body}</body></html>`;
}

// Datei speichern: im eingebetteten Claude-Fenster über dessen Download-Schnittstelle (mit Bestätigung), sonst per Download-Link.
// Das Fenster erlaubt keine .js-Dateien, deshalb wird das Skript dort als .txt angeboten.
export async function saveFile(name, text, mime = 'text/plain') {
  try {
    const c = window.claude;
    const dl = c && typeof c.use === 'function' ? await c.use('downloads') : null;
    if (dl) {
      await dl.save({ filename: name.replace(/\.js$/i, '.txt'), data: text });
      return true;
    }
  } catch (e) {
    if (e && e.code === 'declined') return false;
    /* sonst weiter mit dem normalen Download */
  }
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  return true;
}
