#!/usr/bin/env python3
"""
split_game.py  –  zerlegt eine Einzeldatei-Version des Spiels (sandNN.html) in die Projektstruktur:

    game/game.html          Seite, die im Shell-iFrame läuft (lädt CSS, Level, Engine – mit Cache-Version)
    game/game.css           alle Styles
    game/engine.js          komplette Spiellogik (ohne Leveldaten, ohne eigenes Startmenü,
                            MIT Nachtlevel-/Fackelturm-Erweiterung aus tools/night_patch.py)
    game/levels/levelNN.js  ein Level = eine Datei

Aufruf (im Projektordner):   python3 tools/split_game.py sand12.html
ACHTUNG: überschreibt engine.js, game.css, game.html und die Level-Dateien, die in der Quelle stehen (Level 1–2).
Level 03+ (eigene Dateien) bleiben unberührt. Danach in js/dt-config.js beim Level  ready:true  setzen.
"""
import re, sys, os

DT_VER_FALLBACK = '20261014c'

def span_end(s, i):
    depth = 0; q = None
    while i < len(s):
        c = s[i]
        if q:
            if c == '\\': i += 2; continue
            if c == q: q = None
        else:
            if c in '\'"`': q = c
            elif c == '/' and s[i+1:i+2] == '/': i = s.index('\n', i); continue
            elif c in '[{(': depth += 1
            elif c in ']})':
                depth -= 1
                if depth == 0: return i
        i += 1
    raise ValueError('Klammer nicht geschlossen')

def split_top(inner):
    out = []; depth = 0; q = None; cur = ''; i = 0
    while i < len(inner):
        c = inner[i]
        if q:
            cur += c
            if c == '\\': cur += inner[i+1]; i += 2; continue
            if c == q: q = None
        else:
            if c in '\'"`': q = c; cur += c
            elif c in '[{(': depth += 1; cur += c
            elif c in ']})': depth -= 1; cur += c
            elif c == ',' and depth == 0: out.append(cur.strip()); cur = ''
            else: cur += c
        i += 1
    if cur.strip(): out.append(cur.strip())
    return out

WARN = []
def patch(s, pattern, repl, name, regex=False, required=True, count=1):
    if regex:
        n = len(re.findall(pattern, s, flags=re.S))
        if n: s = re.sub(pattern, lambda m: repl, s, count=count, flags=re.S)
    else:
        n = s.count(pattern)
        if n: s = s.replace(pattern, repl, count)
    if not n and required: WARN.append('  ! Patch nicht angewendet: ' + name)
    return s

def main(src_file, out_root='.'):
    s = open(src_file, encoding='utf-8').read()
    last_style = s.rfind('</style>')
    css = re.findall(r'<style>(.*?)</style>', s, re.S)[-1]
    body_html = s[last_style + 8: s.find('<script>', last_style)].strip()
    js_start = s.find('<script>', last_style) + 8
    js = s[js_start:s.rfind('</script>')].strip('\n')

    m = re.search(r'const LV=\[', js)
    a = m.end() - 1; b = span_end(js, a)
    levels = split_top(js[a + 1:b])
    js = js[:m.start()] + 'const LV=window.DTLV||[]' + js[b + 1:]
    os.makedirs(f'{out_root}/game/levels', exist_ok=True)
    for i, lv in enumerate(levels):
        nm = re.search(r"n:'([^']*)'", lv)
        open(f'{out_root}/game/levels/level{i+1:02d}.js', 'w', encoding='utf-8').write(
            f"/* Level {i+1} · {nm.group(1) if nm else ''}\n   Eigene Datei pro Level – wird von game.html anhand js/dt-config.js geladen. */\n"
            f"(window.DTLV=window.DTLV||[])[{i}]={lv};\n")

    js = patch(js, "rs();start(Math.min(SV.best,LV.length-1));paused=true;UI.main();requestAnimationFrame(loop);",
      "rs();start(Math.min(window.DT_START||0,LV.length-1));paused=false;\n"
      "try{AU.init();AU.resume();AU.loadMusic()}catch(_){}\n"
      "if(tutW())toast('👆 Tippe unten auf „Arbeiter“ – dein Quartier holt den ersten Arbeiter.',1);\n"
      "requestAnimationFrame(loop);", 'Start ohne Menü')
    js = patch(js, r"\n *function main\(\)\{.*?\n(?= *const medalsOf_)", "\n", 'main() entfernen', regex=True)
    js = patch(js, r"\n *function levels\(\)\{.*?\n(?= *function intro)", "\n", 'levels() entfernen', regex=True)
    js = patch(js, r"\n *function intro\(i\)\{.*?\n(?= *function help)", "\n", 'intro() entfernen', regex=True)
    js = patch(js, "btn(menuFrom=='pause'?'pause':'main'", "btn('pause'", 'Zurück-Buttons', count=10)
    js = patch(js, "if(a=='intro')intro(i);else if(a=='lock')", "if(a=='lock')", 'intro-Aktion')
    js = patch(js, "else if(a=='levels')levels();", "else if(a=='levels'||a=='main'||a=='map')toMap();", 'levels-Aktion')
    js = patch(js, "else if(a=='main')main();", "", 'main-Aktion')
    js = patch(js, "toast('Fortschritt gelöscht',1);levels()", "toast('Fortschritt gelöscht',1);try{DTX.resetAll()}catch(_){}settings()", 'Reset')
    js = patch(js, "return{reset,banner,sheet,hud,end:endP,main,pause,pick,disarm,openInfo,setMode,intro,", "return{reset,banner,sheet,hud,end:endP,pause,pick,disarm,openInfo,setMode,", 'UI-Export')
    js = patch(js, r"\$\{last\?btn\('go','Level '\+\(li\+1\)\+' nochmal','pri','data-i=\"'\+li\+'\"'\):btn\('go','Weiter zu Level '\+\(li\+2\),'pri','data-i=\"'\+\(li\+1\)\+'\"'\)\}\$\{last\?'':btn\('go','↺ Nochmal für mehr Sterne','','data-i=\"'\+li\+'\"'\)\}\$\{btn\('levels','Levelwahl'\)\}\$\{btn\('main','Hauptmenü'\)\}",
      "${btn('map','Weiter ▸ zur Karte','pri')}${btn('go','↺ Nochmal für mehr Sterne','','data-i=\"'+li+'\"')}", 'Siegerfenster', regex=True)
    js = patch(js, "${btn('go','Nochmal versuchen','pri','data-i=\"'+li+'\"')}${btn('levels','Levelwahl')}${btn('main','Hauptmenü')}",
      "${btn('go','Nochmal versuchen','pri','data-i=\"'+li+'\"')}${btn('map','Zur Karte')}", 'Niederlagefenster')
    js = patch(js, "${btn('levels','Levelwahl')}${btn('settings','Einstellungen')}${btn('help','So funktioniert’s')}${btn('main','Hauptmenü')}",
      "${btn('settings','Einstellungen')}${btn('help','So funktioniert’s')}${btn('map','Zur Karte')}", 'Pausenmenü')
    js = patch(js, "function pause(){menuFrom='pause';", "function pause(){menuFrom='pause';curP=pause;", 'pause() curP')
    js = patch(js, " – wechseln unter Levelwahl, gilt ab Neustart</small>", " – gilt ab Neustart des Levels</small>${dfBar()}", 'Schwierigkeit im Pausenmenü')
    if 'Level ${li+1} · ${L.n}' not in js:
        js = patch(js, "${btn('resume','▶ Weiterspielen','pri')}",
          "${btn('resume',`▶ Weiterspielen<small style=\"display:block;font-size:11.5px;font-weight:500;opacity:.8;letter-spacing:.02em;margin-top:2px\">Level ${li+1} · ${L.n} · ${DFI[L.df]} ${DFN[L.df]}</small>`,'pri')}", 'Weiterspielen-Beschriftung')
    js = patch(js, "if(li+1>SV.best)SV.best=li+1;persist()}", "if(li+1>SV.best)SV.best=li+1;persist();try{DTX.complete(li+1)}catch(_){}}", 'Fortschritt speichern')
    js = patch(js, "const W=7,$=id=>document.getElementById(id)", "const toMap=()=>{if(window.DTX)DTX.go('map');else location.href='../index.html#map'};\nconst W=7,$=id=>document.getElementById(id)", 'toMap')
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from night_patch import night_features
        js = night_features(js, WARN)
    except ImportError:
        WARN.append('  ! tools/night_patch.py fehlt – Nachtlevel/Fackelturm nicht eingebaut')
    for left in re.findall(r'(?<![\w.])(?:main|levels|intro)\(', js):
        WARN.append('  ! Rest-Aufruf im Code: ' + left)
    open(f'{out_root}/game/engine.js', 'w', encoding='utf-8').write(js + '\n')
    open(f'{out_root}/game/game.css', 'w', encoding='utf-8').write(css.strip() + '\n')
    V = DT_VER_FALLBACK
    html = f"""<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="color-scheme" content="dark"><title>Dünenturm</title>
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<script src="../js/dt-audio.js?v={V}"></script>
<script src="../js/dt-config.js?v={V}"></script>
<script src="../js/dt-core.js?v={V}"></script>
<link rel="stylesheet" href="game.css?v={V}">
<style>
/* Spielfeld (Canvas) liegt IMMER unter Menü, Ressourcenleiste (Strom/Wasser/Munition…), Hinweisen und Baumenü – auch bei Nachtlevels */
canvas#c{{z-index:0}}
#hud{{z-index:4}}
#hint,#toast{{z-index:6}}
</style>
</head><body>
{body_html}
<script>
/* A) Level aus ?level=N bestimmen und alle fertigen Level-Dateien (ready:true) laden – mit ?v=VERSION gegen den Cache */
var DT_V='?v='+((function(){{try{{return parent.DT_VER}}catch(e){{}}}})()||'{V}');
(function(){{var n=Math.max(1,parseInt(new URLSearchParams(location.search).get('level'),10)||1);
 window.DT_START=n-1;
 if(!DTX.has(n)){{DTX.toast('Level '+n+' folgt bald …');DTX.go('map');return}}
 ((DTX.cfg&&DTX.cfg.levels)||[]).forEach(function(l){{if(l.ready&&l.level)document.write('<script src="../'+l.level+DT_V+'"><\\/script>')}});}})();
</script>
<script>
/* B) Prüfen, ob die Datei des gewählten Levels wirklich geladen wurde – sonst NICHT still ein anderes Level starten */
(function(){{var n=(window.DT_START||0)+1;
 if(!DTX.has(n))return;
 if(!(window.DTLV&&window.DTLV[n-1])){{
  var L=(DTX.cfg.levels||[])[n-1]||{{}};
  DTX.toast('Level-Datei fehlt: '+(L.level||('level'+n+'.js'))+' – bitte hochladen');DTX.go('map');return}}
 document.write('<script src="engine.js'+DT_V+'"><\\/script>');}})();
</script>
</body></html>
"""
    open(f'{out_root}/game/game.html', 'w', encoding='utf-8').write(html)
    print(f'{len(levels)} Level-Dateien, engine.js {len(js)//1024} KB')
    for w in WARN: print(w)

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'sand12.html', sys.argv[2] if len(sys.argv) > 2 else '.')
