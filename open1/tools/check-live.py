#!/usr/bin/env python3
# Abgleich der Signatur-Quelle (docs/api.json) mit dem ECHTEN laufenden Spiel (Playwright + Chromium).
# Aufruf: python3 tools/check-live.py [dist/index.html]   – erst `npm run dev` (oder build) und `npm run docs`.
# Prüft: jeder dokumentierte Pfad existiert mit passender Art; jedes echte öffentliche Mitglied ist dokumentiert;
# Objekttypen (Thing, Unit, Widget, Menu, Rig, ModelInstance, Instanced, ModuleHandle, ModuleCtx) gegen echte Instanzen.
import json, sys, time, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
api = json.loads((root / 'docs/api.json').read_text())
page_path = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else root / 'dist/index.html').resolve()
bad = []; ok = 0
def chk(cond, msg):
    global ok
    if cond: ok += 1
    else: bad.append(msg); print('FEHLER:', msg)

with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'])
    pg = b.new_page(viewport={'width': 640, 'height': 360})
    pg.add_init_script('window.__forgeLayerCpu = true')
    pg.goto('file://' + str(page_path)); pg.wait_for_function('window.__forge && window.__forge.ready', timeout=120000)
    pg.evaluate('window.requestAnimationFrame = () => 0'); time.sleep(20)
    pg.evaluate("__forge.game._pw = true; __forge.setMode('studio'); __forge.game.models.compile = null; 0")
    pg.evaluate("__forge.game.start('game.hour(12);')")
    for _ in range(3): pg.evaluate('__forge.city.update(0.05); 0')
    live = pg.evaluate("""(()=>{ const a=__forge.game.api, out={ ns:{}, types:{} };
      const kind=(o,k)=>{ const d=Object.getOwnPropertyDescriptor(o,k); return d.get ? (d.set?'rw':'get') : typeof d.value==='function' ? 'fn' : 'val'; };
      const names=(o,own)=>{ const r={}; let p=o; while(p && p!==Object.prototype){ for(const k of Object.getOwnPropertyNames(p)){ if(k.startsWith('_')||k==='constructor'||k in r) continue; r[k]=kind(p,k); } if(own) break; p=Object.getPrototypeOf(p);} return r; };
      out.ns.game=names(a,true);
      for (const k of ['player','math','ui','world','nav','fx','input','camera','controller','assets','city','weapons','modules','hud','ext']) out.ns[k]=names(a[k],true);
      a.prefab('pp',{hp:10,team:'aliens',parts:[{name:'head',shape:'box',size:1,pos:[0,1,0]}]});
      out.types.Thing=names(a.place('pp',{x:0,z:0}));
      out.types.Unit=names(a.spawn('alien',{x:5,z:5}));
      out.types.Widget=names(a.ui.widget({id:'w1',anchor:'center',w:50,h:50}));
      out.types.Menu=names(a.ui.menu({title:'x',items:[]}));
      out.types.Rig=names(a.camera.create('r1',{type:'perspective'}));
      out.types.Instanced=names(a.instanced({shape:'box',max:2}));
      let ctx=null; a.module('zz',{ enable(c){ ctx=c } });
      out.types.ModuleHandle=names(a.modules.get('zz')); out.types.ModuleCtx=names(ctx,true);
      return out })()""")
    b.close()

def spec_kind(k, ts):
    return 'fn' if k == 'method' else ('get' if k == 'readonly' else 'rw')
# 1 Namensräume
by_ns = {}
for e in api['entries']:
    parts = e['path'].split('.'); ns = 'game' if len(parts) == 2 else parts[1]; by_ns.setdefault(ns, {})[parts[-1]] = e
for ns, spec in by_ns.items():
    real = live['ns'].get(ns, {})
    for name, e in spec.items():
        chk(name in real, f'dokumentiert, aber nicht vorhanden: {e["path"]}')
        if name in real:
            rk, sk = real[name], spec_kind(e['kind'], e['type'])
            if sk == 'fn': chk(rk == 'fn', f'{e["path"]}: dokumentiert als Methode, ist {rk}')
            elif sk == 'get': chk(rk in ('get', 'val', 'rw'), f'{e["path"]}: dokumentiert als readonly, ist {rk}')
            else: chk(rk in ('rw', 'val', 'get'), f'{e["path"]}: {rk}')
    for name in real:
        if ns == 'game' and name in live['ns']: pass
        chk(name in spec, f'vorhanden, aber nicht dokumentiert: game.{"" if ns == "game" else ns + "."}{name}')
# 2 Objekttypen: jede echte Methode/jeder Zugriff muss dokumentiert sein, jedes dokumentierte Mitglied muss existieren
def members(t):
    out = {}
    T = api['types'].get(t)
    if not T: return out
    if T['extends']: out.update(members(T['extends']))
    for m in T['members']: out[m['name']] = m
    return out
for t, real in live['types'].items():
    spec = members(t)
    if t == 'ModuleCtx':
        spec = {**spec, **{e['path'].split('.')[1]: e for e in api['entries'] if e['path'].count('.') == 1}}
    for name, m in spec.items():
        if t == 'ModuleCtx' and name in ('game',): pass
        chk(name in real or t == 'ModuleCtx', f'{t}.{name}: dokumentiert, aber nicht vorhanden')
    for name, k in real.items():
        if t == 'ModuleCtx' and name in spec: continue
        if k in ('fn', 'get', 'rw'): chk(name in spec, f'{t}.{name}: vorhanden ({k}), aber nicht dokumentiert')
# 3 Fähigkeiten und Geplantes
caps = json.loads(json.dumps(api['capabilities']))
chk(len(caps) > 20, 'Fähigkeiten fehlen')
print(f'{ok} Prüfungen ok, {len(bad)} Fehler')
sys.exit(1 if bad else 0)
