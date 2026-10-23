// Studio-Panel: Skript-Editor, Beispiele, Start/Stopp, Fehleranzeige, Export; Startbildschirm für exportierte Spiele.
import { el } from '../ui.js';
import { audio } from '../core/audio.js';
import { EXAMPLES } from './examples.js';
import { buildExport, saveFile } from './export.js';

const KEY = 'forge-studio-script';
const CSS = `
#sright { right: var(--gutter-r); width: 340px; }
body:not(.studio) #sright { display: none !important; }
body.studio #cright { display: none !important; }
body.studio #cbar { right: calc(var(--gutter-r) + 352px); }
#sright .code { width: 100%; box-sizing: border-box; min-height: 300px; resize: vertical; background: #14100b; color: #ecdfc6; border: 1px solid var(--line); border-radius: 3px; padding: 8px; font: 12px/1.45 var(--font-mono); tab-size: 2; white-space: pre; overflow: auto; }
#sright .errbox { border: 1px solid var(--danger); background: rgba(220,90,48,.12); border-radius: 3px; padding: 8px 10px; font: 12px/1.4 var(--font-mono); color: #ffcdb8; display: grid; gap: 6px; }
#sright .errbox[hidden] { display: none; }
#sright .errbox pre { margin: 0; white-space: pre-wrap; word-break: break-word; font: inherit; }
#sright .logbox { max-height: 90px; overflow: auto; font: 11px/1.4 var(--font-mono); color: var(--muted); white-space: pre-wrap; }
#sright .logbox:empty { display: none; }
#sright .bigplay { width: 100%; justify-content: center; padding: 13px 16px; font-size: 13px; }
#sright input[type="text"] { width: 100%; box-sizing: border-box; background: var(--raise); border: 1px solid var(--line); border-radius: 3px; padding: 6px 8px; }
#startscreen { position: absolute; inset: 0; z-index: 9; display: none; place-content: center; justify-items: center; gap: 16px; background: radial-gradient(ellipse at center, rgba(17,13,9,.55), rgba(17,13,9,.9)); text-align: center; padding: 24px; }
body.player-only:not(.playing) #startscreen { display: grid; }
#startscreen h1 { margin: 0; font: 700 38px/1.1 var(--font-display); letter-spacing: .18em; text-transform: uppercase; }
#startscreen p { margin: 0; color: var(--muted); font: 12px/1.5 var(--font-mono); max-width: 60ch; }
body.player-only #top, body.player-only #cleft, body.player-only #cright, body.player-only #sright, body.player-only #cbar, body.player-only #dbanner, body.player-only #card, body.player-only #hint, body.player-only #touchpad, body.player-only #labels, body.player-only #left, body.player-only #right, body.player-only #bar, body.player-only #hud { display: none !important; }
body.player-only:not(.playing) #minimap-wrap { display: none; }
@media (max-width: 880px) {
  #sright { display: none; left: var(--gutter-l); right: var(--gutter-r); width: auto; top: 54px; bottom: 74px; z-index: 5; background: var(--panel-solid); }
  body.studio.p-right #sright { display: block !important; }
  body.studio #cbar { right: var(--gutter-r); }
}
`;

const load = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
const store = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* ohne Speicher weiter */ } };

export function buildStudioUI(forge, game, cm) {
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const panel = document.getElementById('sright');
  const ta = el('textarea', { class: 'code', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-label': 'Skript' });
  ta.value = load() ?? EXAMPLES[0].code;
  ta.addEventListener('input', () => store(ta.value));
  ta.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const a = ta.selectionStart, b = ta.selectionEnd;
    ta.setRangeText('  ', a, b, 'end');
    store(ta.value);
  });

  const errBox = el('div', { class: 'errbox' });
  errBox.hidden = true;
  const logBox = el('div', { class: 'logbox' });
  const errors = [];
  let lastErr = '';

  const lineOf = (e) => {
    const stk = String(e?.stack ?? '');
    const m = stk.match(/skript\.js:(\d+):(\d+)/) || stk.match(/<anonymous>:(\d+):(\d+)/) || stk.match(/Function:(\d+):(\d+)/);
    return m ? Math.max(1, +m[1] - 2) : null;
  };

  function renderErrors() {
    errBox.replaceChildren();
    if (!errors.length) { errBox.hidden = true; return; }
    errBox.hidden = false;
    const lines = ta.value.split('\n');
    const text = errors.slice(-3).map((er) => {
      const code = er.line ? '\n> ' + (lines[er.line - 1] ?? '').trim() : '';
      return `${er.soft ? 'Hinweis' : 'Fehler'} (${er.where}${er.line ? ', Zeile ' + er.line : ''}): ${er.msg}${code}`;
    }).join('\n\n');
    errBox.append(el('pre', {}, text), el('div', { class: 'btn-row' }, el('button', { class: 'mini', onclick: async (ev) => {
      const b = ev.currentTarget;
      try { await navigator.clipboard.writeText(text); b.textContent = 'Kopiert ✓'; }
      catch (x) { const t = el('textarea', {}, text); document.body.append(t); t.select(); try { document.execCommand('copy'); b.textContent = 'Kopiert ✓'; } catch (y) { b.textContent = 'Markiere den Text'; } t.remove(); }
      setTimeout(() => { b.textContent = 'Fehler kopieren'; }, 1800);
    } }, 'Fehler kopieren'), el('button', { class: 'mini', onclick: () => { errors.length = 0; renderErrors(); } }, 'Schließen')));
  }

  game.onError = (e, where = 'Skript', soft = false) => {
    const msg = e && e.name && !soft ? `${e.name}: ${e.message}` : String(e?.message ?? e);
    const key = where + msg;
    if (key === lastErr && errors.length) return;
    lastErr = key;
    const line = soft ? null : lineOf(e);
    errors.push({ where, msg, line, soft });
    if (!soft) console.error(e);
    if (game.running && game.hud) game.hud.line('err' + errors.length, '⚠ ' + (soft ? '' : 'Skriptfehler: ') + msg + (line ? ' (Zeile ' + line + ')' : ''));
    renderErrors();
  };
  game.onLog = (t) => {
    logBox.append(t + '\n');
    while (logBox.textContent.length > 1500) logBox.firstChild.remove();
    logBox.scrollTop = logBox.scrollHeight;
  };
  game.onEnd = () => { if (forge.exported) startScreen(); };

  function play() {
    audio.init();
    errors.length = 0; lastErr = ''; renderErrors();
    logBox.textContent = '';
    game.start(ta.value);
  }

  const sel = el('select', { 'aria-label': 'Beispiel' }, el('option', { value: '' }, 'Beispiel laden …'), ...EXAMPLES.map((x) => el('option', { value: x.id }, x.name)));
  sel.addEventListener('change', () => {
    const ex = EXAMPLES.find((x) => x.id === sel.value);
    if (ex && (ta.value.trim() === '' || confirm('Das Beispiel ersetzt dein aktuelles Skript. Fortfahren?'))) { ta.value = ex.code; store(ta.value); errors.length = 0; renderErrors(); }
    sel.value = '';
  });

  const title = el('input', { type: 'text', value: 'Mein Spiel', 'aria-label': 'Titel des Spiels', maxlength: 60 });
  const fileIn = el('input', { type: 'file', accept: '.js,.txt,text/javascript,text/plain', hidden: true });
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files?.[0];
    if (!f) return;
    ta.value = await f.text(); store(ta.value); fileIn.value = '';
  });

  const exportBtn = el('button', { class: 'act', onclick: async (ev) => {
    const b = ev.currentTarget;
    try {
      b.disabled = true;
      const html = buildExport({ script: ta.value, title: title.value || 'Desert Forge – Spiel', seed: cm.seed });
      await saveFile('desert-forge-spiel.html', html, 'text/html');
      b.textContent = 'Gespeichert ✓';
    } catch (e) { game.onError(e, 'Export'); }
    setTimeout(() => { b.textContent = 'Als Spiel exportieren (HTML)'; b.disabled = false; }, 2200);
  } }, 'Als Spiel exportieren (HTML)');

  panel.replaceChildren(
    el('div', { class: 'sec', style: 'padding-top:12px' },
      el('button', { class: 'act primary bigplay', onclick: play }, '▶ Spielen'),
      el('p', { class: 'note' }, 'Das Spiel startet dort, wo deine Kamera hinschaut. Esc pausiert, danach „Spiel beenden“.'),
      el('div', { class: 'ctl' }, el('label', {}, 'Skript (JavaScript)'), sel),
      ta, errBox, logBox,
      el('div', { class: 'btn-row' },
        el('button', { class: 'mini', onclick: () => saveFile('skript.js', ta.value, 'text/javascript') }, 'Skript speichern'),
        el('button', { class: 'mini', onclick: () => fileIn.click() }, 'Skript laden'), fileIn),
      el('div', { class: 'ctl' }, el('label', {}, 'Titel'), title),
      exportBtn,
      el('p', { class: 'note' }, 'Der Export ist eine einzelne HTML-Datei, die ohne Internet läuft.')));

  /* ── Startbildschirm für exportierte Spiele ── */
  let screen = null;
  function startScreen() {
    if (!screen) {
      screen = el('div', { id: 'startscreen' },
        el('h1', {}, forge.exported?.title ?? 'Spiel'),
        el('button', { class: 'act primary bigplay', style: 'width:auto', onclick: () => { audio.init(); game.start(forge.exported.script); } }, '▶ Klick zum Spielen'),
        el('p', {}, 'WASD laufen · Maus zielen · Klick feuern · Rechtsklick zielen · R nachladen · 1–9 Waffe · Shift rennen · Leertaste springen · Esc Pause'));
      document.getElementById('app').append(screen);
    }
  }

  return { play, startScreen, setScript: (t) => { ta.value = t; store(t); }, getScript: () => ta.value };
}
