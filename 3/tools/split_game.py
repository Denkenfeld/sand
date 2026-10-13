#!/usr/bin/env python3
"""
split_game.py  –  zerlegt eine Einzeldatei-Version des Spiels (sandNN.html) in die Projektstruktur:

    game/game.html          Seite, die im Shell-iFrame läuft (lädt CSS, Level, Engine)
    game/game.css           alle Styles
    game/engine.js          komplette Spiellogik (ohne Leveldaten, ohne eigenes Startmenü)
    game/levels/levelNN.js  ein Level = eine Datei

Aufruf (im Projektordner):   python3 tools/split_game.py sand13.html
Neue Level in der Quelldatei ("const LV=[ … ]") werden automatisch zu eigenen Dateien.
Danach in js/dt-config.js beim passenden Eintrag  level:'game/levels/levelNN.js'  (und film) eintragen.
"""
import re, sys, os

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
    for left in re.findall(r'(?<![\w.])(?:main|levels|intro)\(', js):
        WARN.append('  ! Rest-Aufruf im Code: ' + left)
    open(f'{out_root}/game/engine.js', 'w', encoding='utf-8').write(js + '\n')
    open(f'{out_root}/game/game.css', 'w', encoding='utf-8').write(css.strip() + '\n')
    html = f"""<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="color-scheme" content="dark"><title>Dünenturm</title>
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<script src="../js/dt-audio.js"></script>
<script src="../js/dt-config.js"></script>
<script src="../js/dt-core.js"></script>
<link rel="stylesheet" href="game.css">
</head><body>
{body_html}
<script>
/* Level aus ?level=N · Level-Dateien laut js/dt-config.js laden */
(function(){{var n=Math.max(1,parseInt(new URLSearchParams(location.search).get('level'),10)||1);
 if(!DTX.has(n)){{DTX.toast('Level '+n+' folgt bald …');DTX.go('map');return}}
 window.DT_START=n-1;
 (DT_CONFIG.levels||[]).forEach(function(l){{if(l.level)document.write('<script src="../'+l.level+'"><\\/script>')}});
 document.write('<script src="engine.js"><\\/script>');}})();
</script>
</body></html>
"""
    open(f'{out_root}/game/game.html', 'w', encoding='utf-8').write(html)
    print(f'{len(levels)} Level-Dateien, engine.js {len(js)//1024} KB')
    for w in WARN: print(w)

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'sand12.html', sys.argv[2] if len(sys.argv) > 2 else '.')
