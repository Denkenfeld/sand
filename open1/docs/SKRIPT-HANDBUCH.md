# Desert Forge – Skript-Handbuch (Studio)

Stand: API-Stufe 4, Version 0.4.0 (`game.version`, `game.apiLevel`). Was diese Version kann, steht im Kapitel „Fähigkeiten“; was es **noch nicht** gibt, in „Grenzen“ und `game.planned`.
Dieses Handbuch ist die kompakte Ebene für KI und Einsteiger. Für Verträge und Ausnahmen: `docs/EXPERTEN-REFERENZ.md`. Maschinenlesbar (alle Signaturen, ohne erfundene Methoden): `docs/api.json` und `docs/forge.d.ts` (erzeugt mit `npm run docs`, gegen das laufende Spiel geprüft).

Für neue Chats: diese Datei zusammen mit dem Spielwunsch einfügen. Ein Skript ist reines JavaScript, das im Studio (Tab „Studio“, rechts) in das Skriptfeld kommt. `game` ist die einzige Schnittstelle, es gibt keine Imports.
Das Skript läuft **einmal beim Start**. Danach passiert alles über Ereignisse (`game.on`), Zeitgeber (`game.every`, `game.after`) und die KI der Einheiten.

Koordinaten in Metern: Norden = −z, Osten = +x. Die Stadt hat etwa 230 m Radius innerhalb der Mauer, spielbar bis ca. 600 m.

## Schnellstart

```js
game.hour(20);                                   // Tageszeit
game.player.loadout(['rifle', 'shotgun']);       // Waffen des Spielers
game.spawnWave('alien', 6);                      // 6 Aliens rund um den Spieler
game.on('kill', () => {
  if (game.count('aliens') === 0) game.win('Geschafft!');
});
```

## Steuerung im Spiel

WASD laufen · Maus zielen · Linksklick feuern · Rechtsklick zielen (Zoom) · R nachladen · 1–9 oder Mausrad Waffe wechseln · Q letzte Waffe · Shift rennen · Leertaste springen · E löst das Ereignis `use` aus · Esc Pause.
Läuft das Spiel in einem eingebetteten Fenster, das die Maus nicht fangen darf: zum Umsehen die rechte Maustaste halten und ziehen.

## game – Überblick

| Aufruf | Bedeutung |
|---|---|
| `game.spawn(kind, opts)` | Einheit erzeugen, gibt die Einheit zurück (oder `null`) |
| `game.spawnWave(kind, n, opts)` | `n` Einheiten rund um den Spieler (Standard 30–70 m Abstand), gibt Liste zurück |
| `game.units(team?)` / `game.count(team?)` | lebende Einheiten als Liste / Anzahl, optional nur ein Team |
| `game.kinds()` | Namen aller Einheitentypen |
| `game.pickup(type, x, z, opts)` | Aufsammelbares: `'health'`, `'ammo'`, `'weapon'`, `'upgrade'` |
| `game.zone({x,z,r,name,color,onEnter,onLeave,who})` | Zone mit Ring am Boden; `who`: `'player'` (Standard), `'any'` oder Teamname |
| `game.on(name, fn)` | Ereignis abonnieren (siehe unten) |
| `game.every(sec, fn)` / `game.after(sec, fn)` | Zeitgeber in Spielzeit; geben ein Objekt mit `.cancel()` zurück |
| `game.win(text)` / `game.lose(text)` / `game.restart()` | Spielende mit Bildschirm / Neustart |
| `game.score`, `game.addScore(n)`, `game.kills`, `game.time` | Punkte, Abschüsse, Spielzeit in Sekunden |
| `game.hud.set(key, text)` / `.clear(key)` / `.message(text, sec)` | Textzeilen links oben / große Meldung |
| `game.setHostile(teamA, teamB, true/false)` | Feindschaft zwischen Teams festlegen |
| `game.teamColor(team, '#ff8800')` | Markierungsfarbe über den Köpfen und in der Minimap (ohne Farbe: Farbe abfragen) |
| `game.ui.widget(opts)`, `.radar()`, `.bar()`, `.compass()` | eigene Anzeigen und fertige Vorlagen auf der UI-Ebene (siehe „Die UI-Ebene“) |
| `game.math.*`, `game.isHostile(a, b)` | Richtungs- und Abstandshelfer (siehe „Konventionen“) |
| `game.hour(h)` | Tageszeit setzen (0–24; 12 = Mittag, 22 = Nacht) |
| `game.sound(name)` | Ton: `pistol rifle shotgun rocket laser hit headshot hurt reload pickup empty win lose` |
| `game.random(a, b)` | Zufallszahl |
| `game.log(...)` | Text in die Protokollzeile unter dem Skriptfeld |
| `game.weapons.define(id, spec)` / `.list()` | eigene Waffe festlegen / alle Waffen auflisten |
| `game.has(name)`, `game.capabilities`, `game.version`, `game.apiLevel` | Fähigkeiten abfragen (siehe „Fähigkeiten“) |
| `game.pause()` / `game.resume()` / `game.paused` | Spielpause, UI läuft weiter (siehe „Pause und Maus“) |
| `game.prefab(name, def)` / `game.place(name, opts)` / `game.things(name?)` | eigene mehrteilige 3D-Objekte (siehe „Prefabs“) |
| `game.defineKind(id, spec)` | eigener Einheitentyp, auch aus einem Prefab |
| `unit.goTo(x, z, opts)`, `game.nav.*` | Wegsuche (siehe „Wegsuche“) |
| `game.world.*` | Strahlen, Sichtlinie, Bodenhöhe, Bauplatz-Prüfung, Blick-Ziel |
| `game.shoot(opts)`, `game.explode(x, y, z, opts)`, `game.fx.*` | sichtbare Projektile, Flächenschaden, Effekte |
| `game.tween(ziel, werte, sek, opts)` | Werte sanft ändern |
| `game.save(slot, extra)` / `game.load(slot)` / `game.hasSave(slot)` / `game.deleteSave(slot)` | Spielstand speichern und laden |
| `game.ui.button(opts)`, `game.ui.menu(opts)` | Knopf und Auswahlmenü bzw. Dialog (siehe „Bedienelemente“) |
| `game.module(name, def)`, `game.modules.*` | Bausteine mit Lebenszyklus und automatischem Aufräumen (siehe „Module“) |
| `game.input.*` | Aktionen und Achsen statt fester Tasten (siehe „Eingabe“) |
| `game.camera.*`, `game.controller.*` | Kameras, Vogelperspektive, eigene Steuerungen (siehe „Kameras und Steuerungen“) |
| `game.assets.*`, `game.instanced(opts)` | GLB-Modelle laden und nutzen, tausende gleiche Objekte (siehe „Modelle“) |
| `game.byId(id)` | Objekt oder Einheit über die stabile Nummer wiederfinden |
| `game.clock`, `game.timeScale`, `game.fixed(hz, fn)` | Zeit (siehe „Zeit“) |
| `game.stats()`, `game.diag()` | Messwerte und Anzeige (siehe „Diagnose“) |
| `game.ext` | offener Expertenzugang auf three.js (siehe „Erweiterungsebene“) |

## Teams und Feindschaft

Jede Einheit hat ein `team` (Text). Verschiedene Teams sind **Feinde**, gleiche Teams Freunde. Ausnahme: das Team `'npc'` ist **neutral** zu allen. Der Spieler gehört zum Team `'player'`. Mit `game.setHostile('soldiers', 'player', false)` wird ein Paar friedlich, mit `true` feindlich (auch bei `'npc'`).
Beispiele: `game.spawn('soldier', { team: 'player' })` = Verbündeter; Aliens (`aliens`) und Plünderer (`raiders`) bekämpfen sich gegenseitig.

## Einheitentypen (`game.spawn(kind, opts)`)

| kind | Modell | Team | Leben | Angriff | KI |
|---|---|---|---|---|---|
| `soldier` | Krieger (Oliv) | soldiers | 100 | Gewehr 6 Schaden, 42 m | `chase` |
| `raider` | Krieger (Rost) | raiders | 80 | Gewehr 5 Schaden, 36 m | `chase` |
| `civilian` | Wüstenwanderer | npc | 50 | keiner, flieht bei Schüssen | `wander` |
| `droid` | Droide | npc | 45 | keiner, flieht | `wander` |
| `alien` | Skitter (sechsbeinig) | aliens | 45 | Biss 8 Schaden | `chase`, kennt immer den Weg zum Gegner |
| `brute` | Skitter, 2,3-fach | aliens | 380 | Biss 28 Schaden | `chase`, `hunt` |

**Optionen** (alle optional, überschreiben den Typ):

| Option | Bedeutung |
|---|---|
| `x`, `z` | feste Position; ohne Angabe wird ein freier Punkt gesucht |
| `at: 'Kaserne'` | an einem Ort der Stadt (Name aus `game.city.pois()`) |
| `near: {x,z}` oder `game.player`, `minR`, `maxR` | zufälliger freier Punkt in diesem Ring (Standard Spieler, 22–55 m) |
| `team`, `name` | Mannschaft, Anzeigename |
| `hp`, `speed`, `run` | Leben, Gehtempo, Lauftempo (m/s) |
| `ai` | `'chase'` kämpft, `'guard'` hält den Posten, `'wander'` läuft herum, `'follow'` folgt dem Spieler, `'none'` steht still |
| `sight` | Sichtweite in Metern (bei `hunt` unbegrenzt) |
| `hunt` | `true`: kennt immer die Position des nächsten Gegners (Angriffswellen) |
| `flee` | `true`: rennt bei Schüssen weg |
| `atk` | `{ type:'ranged', dmg, rate, range, acc }` oder `{ type:'melee', dmg, rate, reach }`; `atk: null` entwaffnet |
| `dmg` | Kurzform für `atk.dmg` |
| `scale` | Größenfaktor |
| `score` | Punkte beim Abschuss durch den Spieler (Bewohner geben Minuspunkte) |
| `wanderR` | Umkreis in Metern für `'wander'` |
| `params` | Parameter des Modells aus der Werkstatt, z. B. `{ armor: 'blue' }` bei Soldaten |
| `leader` | Anführer für `'follow'` (Standard: Spieler) |

Die zurückgegebene Einheit hat: `x`, `z`, `hp`, `maxHp`, `team`, `kind`, `name`, `alive`, `data` (freies Objekt für eigene Werte) sowie `damage(n)`, `kill()`, `remove()`, `goTo(x, z)`, `follow()`.

Beispiel: `const boss = game.spawn('brute', { hp: 1500, name: 'Boss', at: 'Raumhafen' });`

## Der Spieler: `game.player`

Lesen: `x`, `y`, `z`, `yaw`, `alive`, `team`, `hp`, `maxHp`, `weapon` (aktuelle Waffe), `weapons` (Liste), `kills`.
Setzen: `hp`, `maxHp`.
Methoden:

| Aufruf | Bedeutung |
|---|---|
| `heal(n)`, `damage(n)` | Leben ändern |
| `teleport(x, z, yaw?)` oder `teleport('Kaserne')` | versetzen (auch neuer Wiedereinstiegspunkt) |
| `loadout(['rifle','shotgun'])` | Waffen ersetzen, volle Reserve; die erste ist ausgewählt |
| `give('launcher')` | Waffe dazugeben (hat er sie schon: Munition) |
| `giveAmmo(0.5)` | Munition auffüllen (Anteil der Reserve) |
| `upgrade(stat, factor)` | Verbesserung, dauerhaft multipliziert: `damage`, `firerate`, `magazine`, `reload`, `speed`, `spread` (Streuung kleiner bei Faktor < 1), `health` |
| `respawn(at?)` | wiederbeleben am Startpunkt oder an einem Ort |
| `ammo(id?)` | `{ mag, reserve }` |

Stirbt der Spieler und es gibt **keinen** Handler für `playerDeath`, endet das Spiel nach 1,6 s mit „Gefallen“. Mit einem Handler entscheidest du selbst, z. B. `game.on('playerDeath', () => game.after(3, () => game.player.respawn()))`.

## Waffen

| id | Name | Art | Schaden | Takt | Magazin / Reserve | Besonderheit |
|---|---|---|---|---|---|---|
| `pistol` | Pistole | Strahl | 24 | 0,26 s | 12 / 84 | genau |
| `rifle` | Sturmgewehr | Strahl, Dauerfeuer | 12 | 0,09 s | 30 / 240 | Streuung wächst beim Dauerfeuer |
| `shotgun` | Schrotflinte | Strahl, 9 Schrot | 10 je Schrot | 0,85 s | 6 / 36 | Reichweite 45 m, Schaden nimmt ab |
| `launcher` | Raketenwerfer | Geschoss | 140 | 1,0 s | 1 / 8 | Explosion mit Radius 7 m, verletzt auch dich |

Kopftreffer zählen doppelt. Zielen (Rechtsklick) verkleinert die Streuung.

**Eigene Waffe:**
```js
game.weapons.define('plasma', {
  base: 'rifle',            // übernimmt alles von dieser Waffe …
  name: 'Plasmagewehr', dmg: 22, rate: 0.14, mag: 20, reserve: 120, spread: 0.004, snd: 'laser',
});
game.player.loadout(['pistol', 'plasma']);
```
Felder: `name, kind ('hit'|'proj'), dmg, rate, auto, mag, reserve, reload, spread, bloom, range, pellets, kick, zoom, snd, model ('pistol'|'rifle'|'shotgun'|'launcher'), radius, speed`.

## Pickups

`game.pickup('health', x, z)` → +50 Leben (nur wenn verletzt)
`game.pickup('ammo', x, z, { amount: 0.5 })` → füllt 50 % der Reserve aller Waffen
`game.pickup('weapon', x, z, { weapon: 'shotgun' })`
`game.pickup('upgrade', x, z, { stat: 'damage', factor: 1.25 })`
Option `respawn: 20` lässt es nach 20 s wiederkommen, `color` setzt die Farbe, `label` den Namen.

## Zonen

```js
game.zone({
  x: 40, z: -20, r: 8, name: 'Funkturm', color: 0x7be08a,
  onEnter: (who) => game.hud.message('Funkturm erreicht'),
  onLeave: (who) => {},
  who: 'player',          // 'player' | 'any' | Teamname
  visible: true,          // Ring am Boden und in der Minimap
});
```

## Ereignisse (`game.on`)

| Name | Daten | Wann |
|---|---|---|
| `start` | – | das Spiel beginnt (nach dem Skriptlauf, auch nach `game.restart()` und `game.load`-freiem Neustart) |
| `kill` | `{ unit, killer: 'player' \| Einheit \| null, headshot }` | eine Einheit ist gestorben |
| `playerDeath` | – | der Spieler ist gestorben |
| `pickup` | `{ type, x, z, weapon, stat }` | der Spieler hat etwas eingesammelt |
| `spawn` | `{ unit }` | eine Einheit wurde erzeugt |
| `use` | `{ x, z }` | Taste E gedrückt |
| `update` | `{ dt, t }` | jedes Bild – sparsam benutzen |
| `key` | `{ code, key, shift, ctrl }` | Taste gedrückt (auch während einer Skript-Pause; Esc kommt dann als `cancel`) |
| `click` | `{ button, screen, ground, hit }` | Maustaste gedrückt, während das Spiel läuft (`0` links, `2` rechts); `ground` = `{ x, z }` auf dem Boden unter dem Mauszeiger (oder `null`), `hit` = Treffer wie `game.world.cast` |
| `cancel` | – | Esc während einer Skript-Pause (`game.pause()`) |
| `pause` / `resume` | – | `game.pause()` / `game.resume()` wurde wirksam |
| `arrive` | `{ unit, x, z }` | eine Einheit hat ihr `goTo`-Ziel erreicht |
| `unreachable` | `{ unit, x, z, reason }` | das Ziel eines `goTo` ist nicht erreichbar |
| `thingDestroyed` | `{ thing, by }` | ein Prefab-Objekt mit Lebenspunkten wurde zerstört |
| `thingHit` | `{ thing, amount, by, zone }` | ein Prefab-Objekt wurde getroffen (`zone` = Name der Trefferzone oder `null`) |
| `module` | `{ name, state }` | ein Modul ist aktiv geworden bzw. ruht (`ready`) |
| `controller` | `{ name, prev }` | die Steuerung wurde gewechselt |
| `load` | `{ extra }` | ein Spielstand wurde geladen; `extra` sind die Daten aus `game.save` |

## Die Stadt: `game.city`

| Aufruf | Bedeutung |
|---|---|
| `game.city.pois()` | Namen aller Orte (Westtor, Zentralbrunnen, Raumhafen, Hauptquartier, Kaserne, Cantina, …; manche mehrfach) |
| `game.city.poi('Kaserne')` | `{ x, z, name }` des ersten passenden Ortes (Teilname genügt) oder `null` |
| `game.city.randomOpenPoint({ near, min, max })` | freier Punkt im Ring um `near` (Standard Spieler), oder `null` |
| `game.city.districtAt(x, z)` | Name des Viertels |

Orte können überall dort stehen, wo `x`, `z` verlangt wird: `game.spawn('alien', { at: 'Raumhafen' })`, `game.player.teleport('Hauptquartier')`, `game.zone({ at: 'Nordtor', r: 6, … })`.

## Konventionen: Richtungen und Winkel

- Welt in Metern: **Norden = −z, Osten = +x**, y ist oben.
- **Kompasswinkel** (`heading`, `bearing`): 0 = Norden, Osten = +90° (`Math.PI/2`), im **Uhrzeigersinn**, Bogenmaß. Das ist die einzige Winkelart, die man in neuen Skripten brauchen sollte:
  `game.player.heading`, `einheit.heading`, `game.math.bearing(a, b)`.
- Blickrichtung als Vektor: `game.player.forward` und `einheit.forward` (Einheitsvektor `{x, z}` nach vorn), `game.math.forward(heading)`.
- `game.player.yaw` und `einheit.yaw` sind die internen Drehwinkel der Spielengine und haben **verschiedene Nullrichtungen** (Spieler: 0 = Norden, Einheiten: 0 = Süden, beide links herum positiv). Nicht mischen – lieber `heading`/`forward` benutzen.

| Aufruf | Bedeutung |
|---|---|
| `game.math.toLocal(ziel, von?)` | Ziel aus Sicht von `von` (Standard: Spieler): `{ forward, right, dist, angle }`. `forward`/`right` in Metern, `angle` = 0 geradeaus, positiv nach rechts (−π…π) |
| `game.math.bearing(a, b)` | Kompasswinkel von `a` nach `b` (Objekte mit `x`, `z`) |
| `game.math.dist(a, b)` | Abstand in der Ebene |
| `game.math.forward(heading)` | Vektor `{x, z}` |
| `game.math.wrap(winkel)` | Winkel in den Bereich −π…π |
| `game.math.rad(grad)`, `game.math.deg(bogenmaß)` | Grad ↔ Bogenmaß |
| `game.math.clamp(x, a, b)`, `.lerp(a, b, t)`, `.TAU`, `.PI` | Kleinkram |
| `game.isHostile(teamA, teamB = 'player')` | `true`, wenn die Teams Feinde sind |
| `game.teamColor(team)` | Farbe (Zahl) des Teams; mit zweitem Argument wird sie gesetzt |

## Die UI-Ebene: `game.ui`

Eine durchsichtige Zeichenfläche über dem Spiel. Maus und Tastatur gehen durch sie hindurch – außer bei Widgets, die als Bedienelement gebaut sind (`pointer`, `onClick`, … siehe „Bedienelemente“). Darauf legt man **Widgets** an – beliebige Anzeigen, die man mit einfachen Zeichenbefehlen selbst malt. Radar, Balken und Kompass sind nur **fertige Vorlagen**: sie benutzen genau dieselben Befehle wie ein eigenes Widget und haben keine Sonderrechte. Nichts davon ist Pflicht; ein Spiel ohne Radar braucht keinen Radar.

```js
const w = game.ui.widget({
  id: 'mein-ring',          // optional; gleiche id ersetzt das alte Widget
  anchor: 'bottom',         // Ecke/Kante des Bildschirms (siehe unten)
  size: 90,                 // oder w: 120, h: 40 (Pixel, oder Text wie '50%' vom Bildschirm)
  margin: 100,              // Abstand zum Rand (Standard 16), x/y verschieben zusätzlich
  draw(g) {                 // wird jedes Bild aufgerufen
    g.circle(45, 45, 40, { fill: 'rgba(0,0,0,.5)' });
    g.text(String(game.count('aliens')), 45, 45, { size: 26, align: 'center', baseline: 'middle' });
  },
});
w.hide();                   // sanft ausblenden (w.hide(0) sofort); w.show() blendet wieder ein
```

### Widget-Eigenschaften

| Eigenschaft | Bedeutung |
|---|---|
| `anchor` | `top-left`, `top` (oder `top-center`), `top-right`, `left`, `center`, `right`, `bottom-left`, `bottom`, `bottom-right` |
| `w`, `h`, `size` | Größe in Pixeln oder als Text `'50%'` (vom Bildschirm); `size` setzt beides |
| `margin` | Abstand zum Rand in Pixeln (Standard 16); in der Mitte ohne Wirkung |
| `x`, `y` | zusätzliche Verschiebung in Pixeln (rechts/unten positiv) |
| `z` | Zeichenreihenfolge (höher = weiter vorn) |
| `alpha` | Deckkraft 0…1 |
| `visible` | `false` = nicht gezeichnet |
| `clip` | `true` (Standard): nichts wird außerhalb des Widget-Rechtecks gezeichnet |
| `data` | freier Platz für eigene Werte (`w.data.punkte = 3`) |
| `draw(g, w)` | Zeichenfunktion |

Methoden: `w.set({...})`, `w.move(x, y)`, `w.show(sek)`, `w.hide(sek)`, `w.remove()`. Außerdem `game.ui.get(id)`, `game.ui.remove(id)`, `game.ui.clear()`, `game.ui.screen` (`{w, h}` in Pixeln) und `game.ui.project(x, y, z)` (Weltpunkt → Bildschirm: `{ x, y, onScreen, behind, dist }`, z. B. für Markierungen über Zielen; dazu ein Widget mit `w: '100%', h: '100%', margin: 0`).
Alle Widgets verschwinden automatisch beim Neustart und Ende des Spiels. Ein Fehler in `draw` wird einmal gemeldet und schaltet nur dieses Widget ab.

### Zeichenbefehle (`g`)

Gezeichnet wird in Widget-Koordinaten: `(0, 0)` = obere linke Ecke des Widgets, `g.w` × `g.h` = seine Größe, y wächst nach unten. **Winkel** in der Ebene: 0 = nach oben, im Uhrzeigersinn, Bogenmaß – passend zu den Kompasswinkeln oben. Farben als CSS-Text (`'#ff8800'`, `'rgba(0,0,0,.5)'`) oder Zahl (`0xff8800`).

| Befehl | Zeichnet |
|---|---|
| `g.circle(x, y, r, o)` | gefüllter Kreis |
| `g.ring(x, y, r, o)` | Kreislinie |
| `g.arc(x, y, r, winkel0, winkel1, o)` | Bogen (mit `fill` ein Tortenstück) |
| `g.line(x1, y1, x2, y2, o)` | Linie |
| `g.rect(x, y, w, h, o)` | Rechteck; `radius` rundet die Ecken |
| `g.poly(punkte, o)` | Vieleck aus `[[x,y], …]`; `closed: false` = offene Linie |
| `g.bar(x, y, w, h, anteil, o)` | Balken, `anteil` 0…1; `color`, `bg`, `border`, `radius` |
| `g.text(text, x, y, o)` | Text; `size`, `color`, `align` (`left`/`center`/`right`), `baseline` (`top`/`middle`/`bottom`), `bold`, `mono` |
| `g.icon(name, x, y, größe, o)` | Symbol: `arrow`, `triangle`, `chevron`, `dot`, `ring`, `diamond`, `square`, `cross`, `plus`, `star`; `rotate: winkel` dreht es |
| `g.polar(r, winkel, cx?, cy?)` | Punkt `{x, y}` im Abstand `r` in Richtung `winkel` (Mitte standardmäßig die Widget-Mitte) |
| `g.measure(text, size)` | Textbreite |
| `g.push()` / `g.pop()` | Zustand merken / zurück; dazwischen `g.move(x, y)`, `g.rotate(winkel)`, `g.scale(s)`, `g.alpha(a)`, `g.clipRect(x,y,w,h)`, `g.clipCircle(x,y,r)` |

Optionen `o` (alle Formen): `fill`, `stroke`, `width`, `alpha`, `dash: [4, 4]`, `glow: 8`. Ohne `fill`/`stroke` füllt eine Form weiß; Linien, Ringe und Bögen sind Linien. `g.dt` ist die Zeit seit dem letzten Bild, `g.t` die Spielzeit, `g.screen` die Bildschirmgröße.

### Fertige Vorlagen

Alle liefern ein Widget zurück; die Einstellungen stehen in `w.data` und lassen sich im Spiel ändern (`radar.data.range = 120`).

| Aufruf | Zeigt |
|---|---|
| `game.ui.radar(opts)` | Radar. `anchor` (Standard `'right'`), `size` (170), `range` Meter (60), `rotate` (`true` = Blick oben, `false` = Norden oben), `who` (`'hostile'` Standard, `'all'`, `'friendly'`, Teamname, Liste von Teams oder Funktion `(einheit) => bool`), `by` (`'distance'`: nah grün / mittel gelb / fern rot, oder `'team'`), `colors` (`{near, mid, far}`), `nearAt`/`midAt` (0.33 / 0.66 der Reichweite), `edge` (`'clamp'`: ferne Ziele gedämpft am Rand, `'hide'`: weglassen), `arrow` (Pfeil am Rand zum nächsten Ziel), `sweep` (Suchstrahl), `markers` (eigene Punkte: Liste oder Funktion, die `[{ x, z, color, icon, size }]` liefert) |
| `game.ui.bar(opts)` | Balken mit Beschriftung. `value`, `max`, `label` (Zahlen/Text oder Funktionen), `color`, `lowColor`, `low` (Schwelle, ab der `lowColor` gilt), `showValue`, dazu die Widget-Eigenschaften |
| `game.ui.compass(opts)` | Kompassstreifen mit N, O, S, W; `markers` wie beim Radar (erscheinen als Rauten) |

Beispiele:

```js
game.ui.radar({ anchor: 'top-left', range: 90, by: 'team', who: 'all' });
game.ui.bar({ label: 'Koloss', value: () => boss.hp, max: 380, color: '#ff5a3a' }); // boss = game.spawn('brute')
game.ui.compass({ markers: () => [{ x: ziel.x, z: ziel.z, color: '#6ec6ff' }] });
```

Platz im Standard-Layout: Statuszeilen oben links, Minimap oben rechts, Leben unten links, Munition unten rechts, Hilfetext unten Mitte (die ersten Sekunden). Frei sind die Mitte oben, links und rechts in der Mitte.

## Fähigkeiten und Version

`game.version` (Text, z. B. `'0.4.0'`) und `game.apiLevel` (Zahl, jetzt 4) sagen, welche Fassung läuft. `game.has('nav')` fragt eine Fähigkeit ab; `game.capabilities` ist die ganze Liste. So kann ein Skript prüfen, ob es hier laufen kann, statt an einer fehlenden Funktion zu scheitern:

```js
if (!game.has('prefab')) game.log('Dieses Skript braucht Prefabs (API-Stufe 3)');
```

| Fähigkeit | Bedeutung |
|---|---|
| `ui` | UI-Ebene mit Widgets (Stufe 2) |
| `ui.widgets` | eigene Widgets mit Zeichenbefehlen |
| `ui.interactive` | Widgets nehmen Maus, Touch und Tastatur an (`pointer`, `onClick`, `onKey`, Fokus) |
| `ui.presets` | Vorlagen `radar`, `bar`, `compass`, `button`, `menu` |
| `pause` | `game.pause()` / `game.resume()` |
| `cursor` | `game.ui.cursor(true)`: Maus für Widgets freigeben, Spiel läuft weiter |
| `events` | Liste der Ereignisnamen, die `game.on` kennt |
| `prefab` | eigene mehrteilige Objekte (`game.prefab`, `game.place`, `game.things`) |
| `prefab.aim` | Teile auf Ziele ausrichten (`thing.aimAt`, `thing.muzzle`) |
| `prefab.solid` | Prefabs als Hindernisse für Spieler, Einheiten und Wegsuche |
| `kinds.custom` | `game.defineKind`, auch mit `prefab:` |
| `units.height` | Einheiten haben eine Höhe `unit.y` (schweben, aus dem Boden steigen) |
| `units.size` | Einheiten lassen sich skalieren (`unit.size`) |
| `tween` | `game.tween` |
| `nav` | Wegsuche (`unit.goTo`, `game.nav.*`, Ereignisse `arrive`/`unreachable`) |
| `world.queries` | `game.world.cast`, `raycast`, `los`, `groundY`, `aim`, `snap` |
| `world.canBuild` | Bauplatz-Prüfung, auch „bleibt der Weg offen?“ |
| `shoot` | `game.shoot`, `game.explode` |
| `fx` | `game.fx.explosion/burst/muzzle/beam/ring` |
| `save` | `game.save` / `game.load` |
| `math` | `game.math.*` |
| `prefab.build` / `prefab.hits` / `prefab.model` / `prefab.save` | eigene Gestalt (`build`), Trefferzonen (`hits`), GLB-Modell (`model`), eigene Spielstanddaten |
| `modules` | `game.module`, `game.modules.*` |
| `time` | `game.clock`, `game.timeScale`, `game.fixed` |
| `diag` | `game.stats`, `game.diag` |
| `ext` | `game.ext` (offener Expertenzugang, Vertragsstufe 1) |
| `input`, `input.contexts`, `input.virtual` | Aktionen/Achsen, Kontexte, virtuelle Quellen |
| `camera`, `camera.ortho`, `camera.pick` | Kameras, orthografische Kameras, Bildpunkt → Welt |
| `controller`, `controllers` | Steuerungen; Liste `['ego', 'topdown', 'free']` |
| `save.ids`, `save.owner` | stabile Nummern, Modul-Eigentum nach dem Laden |

## Pause und Maus

`game.pause()` hält die Simulation an: Spielzeit, Einheiten, Zeitgeber, Geschosse und Tweens von Einheiten stehen, das Ereignis `update` kommt nicht mehr. **Die UI-Ebene läuft weiter** (Widgets, Ein- und Ausblenden, Tweens von Widgets), die Maus wird freigegeben. `game.resume()` stellt Steuerung und Mausfang wieder her. Verweigert der Browser den Mausfang (etwa in einem eingebetteten Fenster), erscheint stattdessen der normale Pausenbildschirm („Klicken zum Fortsetzen“).
Während der Skript-Pause kommen Tasten weiter als `key`, Esc als `cancel`. `game.paused` sagt, ob gerade pausiert ist.

Soll das Spiel **weiterlaufen**, aber die Maus für ein Widget frei sein: `game.ui.cursor(true)`; mit `game.ui.cursor(false)` fängt das Spiel die Maus wieder. Solange die Maus gefangen ist (normales Spielen), reagieren Widgets nicht auf Zeigerereignisse.

## Bedienelemente (interaktive Widgets)

Jedes Widget kann Zeigerereignisse annehmen. Maus und Touch laufen über dieselben Rückrufe.

| Eigenschaft | Bedeutung |
|---|---|
| `pointer` | `true`: das Widget fängt Zeigerereignisse (wird von selbst `true`, sobald ein `onClick`/`onDown`/`onUp`/`onEnter`/`onLeave` gesetzt ist). `false`: Klicks gehen hindurch |
| `onClick(e)` | losgelassen über dem Widget, nachdem es dort gedrückt wurde. `e = { x, y, button, pointerType, shift, ctrl, widget }` mit **Widget-Koordinaten** |
| `onDown(e)`, `onUp(e)` | Drücken / Loslassen |
| `onEnter(e)`, `onLeave(e)` | Zeiger kommt / geht |
| `disabled` | `true`: kein `onClick`, stattdessen `onDisabledClick` |
| `cursor` | Mauszeiger über dem Widget (CSS-Name, Standard `'pointer'`) |
| `focusable`, `onKey(e)` | Tastatur-Fokus; `onKey` bekommt `{ code, key, shift, ctrl }` und gibt `true` zurück, wenn die Taste verbraucht ist (sie erreicht dann das Spiel nicht) |

Zustände zum Zeichnen: `w.hover`, `w.down`, `w.focused`, `w.disabled`, `w.mouse` (`{x, y}` im Widget). Fokus: `game.ui.focus(w)`, `game.ui.blur()`, `game.ui.focused`. Das oberste Widget (höchstes `z`) unter dem Zeiger bekommt das Ereignis.

```js
game.ui.cursor(true);                                    // Maus frei, Spiel läuft
const b = game.ui.button({ label: 'Kaufen', anchor: 'bottom', onClick() { gold -= 50; },
                           disabled: () => gold < 50, hint: 'zu wenig Gold' });
```

**Vorlagen** (wie `radar`, nur mit Bedienung):

| Aufruf | Zeigt |
|---|---|
| `game.ui.button(opts)` | Knopf. `label`, `hint` (erscheint bei gesperrtem Knopf unter der Maus), `color`, `fontSize`, `disabled` (Wert oder Funktion), `onClick`, `onDisabledClick`. Enter/Leertaste bedient den fokussierten Knopf |
| `game.ui.menu(opts)` | Auswahlmenü. `title`, `text` (Fließtext unter dem Titel, Text oder Funktion, wird umbrochen – für Dialoge), `items` (Liste **oder Funktion**, die jedes Bild die Liste liefert), `pause` (Standard `true`: öffnen pausiert, schließen setzt fort), `closeOnSelect` (Standard `true`), `onClose`, `hint`. Eintrag: `{ label, detail, disabled (Wert oder Funktion), reason (Text rechts, wenn gesperrt), onSelect(item, i), onDisabled(item, i) }` |

Menü-Methoden: `m.open()`, `m.close()`, `m.isOpen`. Bedienung: Maus (Klick auf eine Zeile), ↑↓ (überspringt gesperrte Einträge), Enter/Leertaste, Ziffern 1–9, Esc schließt. Gesperrte Einträge sind sichtbar, nehmen aber nichts an und schließen das Menü nicht.

## Prefabs: eigene mehrteilige 3D-Objekte

`game.prefab(name, def)` legt einen Bauplan fest, `game.place(name, opts)` stellt eine Instanz (ein **Thing**) in die Welt. Ein Bauplan ist ein Baum aus Grundkörpern; jedes Teil kann einen Namen haben und sich relativ zu seinem Elternteil drehen.

```js
game.prefab('turm', {
  solid: 1.0, hp: 90, team: 'player',            // Hindernis (Radius m), Lebenspunkte, Team
  parts: [
    { shape: 'cylinder', size: [1.7, 1.0, 1.7], pos: [0, 0.5, 0], color: '#6b6358' },     // Sockel
    { name: 'head', shape: 'box', size: [1.2, 0.6, 1.3], pos: [0, 1.3, 0], children: [   // drehbarer Kopf
      { name: 'barrel', pos: [0, 0.05, 0.45], muzzle: [0, 0, 1.4], children: [            // Rohr (kippt)
        { shape: 'box', size: [0.22, 0.22, 1.4], anchor: [0, 0, -0.5], color: '#2c2c30' } ] } ] },
  ],
});
const t = game.place('turm', { x: 20, z: -40, yaw: 0 });
```

**Teile:** `name`, `shape` (`box`, `cylinder`, `sphere`, `cone`, `pyramid`, `none` = nur Drehpunkt), `size` (Zahl oder `[x, y, z]` in Metern; Zylinder: x/z Durchmesser, y Höhe), `pos` `[x, y, z]` relativ zum Elternteil, `rot` `[x, y, z]` (Bogenmaß) oder `rotDeg` (Grad), `scale`, `visible`, `axis` (`'y'` Standard; `'z'`/`'x'` legen Zylinder, Kegel und Pyramide um), `anchor` `[x, y, z]` (verschiebt den Körper um dieses Vielfache seiner Größe; `[0, 0, -0.5]` = Drehpunkt am hinteren Ende, wichtig für Rohre), `top` (Zylinder: oberer Radius als Anteil, 0 = Kegel), `color`, `metal`, `rough`, `opacity`, `emissive` und `glow` (Leuchten), `muzzle` `[x, y, z]` (Mündungspunkt im Teil), `children`. Formen sind in der Mitte verankert: ein Zylinder, der auf dem Boden steht, braucht `pos` y = halbe Höhe.
**Bauplan-Eigenschaften:** `solid` (Radius in m: Hindernis für Spieler, Einheiten und Wegsuche), `hp`, `team` (mit beidem greifen feindliche Einheiten und Geschosse das Objekt an), `height`/`radius` (sonst aus den Teilen berechnet), `explode` (Größe der Explosion bei Zerstörung, `0` = keine), `update(thing, dt)` (jedes Bild), `onDestroy(thing, by)`.
**Weitere Bauplan-Möglichkeiten** (`build`, `hits`, `model`, `save`/`load`, `onDamage`): siehe „Eigene Objekte“ und „Modelle“.
**place-Optionen:** `x`, `z`, `y`, `yaw`, `scale`, `hp`, `team`, `solid`, `data`, `opacity`, `id`, `at` (Ortsname), `ghost: true` (Vorschau: kein Hindernis, kein Ziel, kommt nicht in `game.things()` und nicht in den Spielstand).

**Thing:** `x y z yaw size heading` (Kompass; `yaw 0` blickt nach Süden, `heading = π − yaw`), `forward`, `hp maxHp team solid radius height alive id prefab data` (`data` ist frei für eigene Werte), `visible`, `opacity`, `t.parts.head` bzw. `t.part('head')`, `t.set({...})`, `t.move(x, z)`, `t.tint('#40ff70')` / `t.tint(null)` (einfärben, z. B. grün/rot für gültig/ungültig), `t.damage(n)`, `t.heal(n)`, `t.kill()`, `t.remove()`.
**Teil:** `x y z yaw pitch roll visible scale` (relativ zum Elternteil, Bogenmaß; `pitch` positiv kippt die +z-Seite nach unten), `color = '#f00'`, `emissive = '#f00'` (setzen), `tip()` (Weltpunkt der Spitze, siehe unten).
**Ausrichten und Schießen:** `t.aimAt(ziel, { yawPart: 'head', pitchPart: 'barrel', rate: 8, tolerance: 0.06, minElev, maxElev })` dreht `yawPart` um die Hochachse und kippt `pitchPart` (Standard: Teil `barrel`, falls vorhanden) mit höchstens `rate` rad/s auf ein Ziel (Einheit, Thing oder `{x, y?, z}`); Ergebnis `{ aligned, err }`. Aufrufen jedes Bild, geschossen wird, wenn `aligned`. `t.muzzle('barrel')` liefert die Mündung `{ x, y, z, dx, dy, dz }` (Punkt und Richtung in Weltkoordinaten) für `game.shoot` und `game.fx.muzzle`.
`game.things()` / `game.things('turm')` liefert alle (lebenden) Things bzw. die eines Bauplans.

## Eigene Einheitentypen

`game.defineKind(id, spec)` legt einen Einheitentyp an, den `game.spawn(id, …)` und `game.units(team)` wie die eingebauten kennen. `spec` hat dieselben Felder wie die Tabelle der Einheitentypen (`team`, `hp`, `speed`, `run`, `ai`, `sight`, `hunt`, `atk`, `score`, `hitR`, `height`, …) und dazu:

| Feld | Bedeutung |
|---|---|
| `extends: 'alien'` | erbt alle Werte eines vorhandenen Typs (`atk`, Modell …) |
| `prefab: 'name'` | die Figur kommt aus einem Prefab (zuerst `game.prefab` aufrufen) |
| `animate(parts, c)` | pro Bild: `parts` = benannte Teile des Prefabs, `c = { dt, speed, attack, t, unit }` – hier Beine, Flügel, Drehringe bewegen |
| `fly: true` oder Höhe in m | fliegt (Standardhöhe 2,4 m), ignoriert Gebäude und Wegsuche |

```js
game.defineKind('ballon', { prefab: 'ballon', team: 'aliens', hp: 30, speed: 3.4, run: 3.4, fly: 3.2, hitR: 0.8, height: 1.8,
                            animate: (p, c) => { p.ring.yaw = c.t * 3; } });
```

**Höhe, Größe, Auftauchen:** `unit.y` (Höhe über dem Boden, frei setzbar und tweenbar), `unit.size` (Maßstab, ändert auch Trefferzone und Höhe), `unit.emerge(sek)` (steigt aus dem Boden auf; die Einheit steht, bis sie oben ist), `unit.data` (frei für eigene Werte).

## Wegsuche

Einheiten finden ihren Weg durch Tore, Gassen und um Gebäude und Prefab-Hindernisse (`solid`) herum, auch durch die Stadtmauer-Tore. Das Raster hat 2 m Zellen; die Größe der Einheit zählt (Abstand zu Wänden).

`unit.goTo(x, z, opts)` (oder `unit.goTo({x, z}, opts)`):

| Option | Bedeutung |
|---|---|
| `reach` | gilt als angekommen, wenn so viele Meter vor dem Ziel (Standard 1,6) |
| `fight: true` | unterwegs kämpfen: erreicht ein Feind die Angriffsreichweite, bleibt die Einheit stehen und kämpft, danach geht sie weiter |
| `direct: true` | Luftlinie ohne Wegsuche (Flieger tun das immer) |
| `partial: false` | bei unerreichbarem Ziel sofort aufgeben (Standard: zum nächsten erreichbaren Punkt laufen) |
| `speed`, `onArrive(u)`, `onFail(u, grund)` | Tempo, Rückrufe |

Ereignisse `arrive` und `unreachable` (einmal pro Auftrag); `unit.status` ist `'moving'`, `'arrived'`, `'unreachable'` oder `'idle'`. Gründe: `unreachable`, `start-blocked`, `target-blocked`, `target-outside`, `no-path`. Ändert sich ein Hindernis (Turm gebaut oder zerstört), planen laufende Einheiten ihren Weg von selbst neu. Aufträge werden nicht gespeichert; im Ereignis `load` neu erteilen.

`game.nav`: `nav.path(a, b, { radius, partial })` → `{ ok, reached, partial, points: [{x, z}], length, reason }`; `nav.reachable(a, b, { radius })` → `true/false`; `nav.free(x, z, r)` → ist hier Platz für einen Kreis mit Radius `r`?; `nav.stats`. Größen: `radius` 0,45 (Mensch), 0,9, 1,6, 2,8.
Beispiel „Weg darf nicht zugebaut werden“: `game.world.canBuild(x, z, 1.4, { keepPath: { from: spawnPunkt, to: ziel, radius: 0.9 } })` meldet `reason: 'blocks-path'`, wenn der Turm den Weg dicht machen würde.

## Abfragen an die Welt: `game.world`

| Aufruf | Ergebnis |
|---|---|
| `world.cast(von, richtung, max, o)` | Strahl: `{ hit, type, dist, x, y, z, unit, thing, head }`; `type` ist `'world'` (Gebäude), `'ground'`, `'unit'`, `'thing'` oder `'none'`; `o`: `{ units: false, things: false, ignore }` |
| `world.raycast(a, b, o)` | Strahl von Punkt `a` zu Punkt `b` (`{x, y, z}`) |
| `world.los(a, b)` | freie Sicht zwischen zwei Punkten (nur Gebäude), `true/false`; `y` Standard 1,5 |
| `world.groundY(x, z)` | Bodenhöhe |
| `world.aim(max)` | Strahl durchs Fadenkreuz des Spielers (auch `game.player.aim()`); `game.player.eye` ist der Augpunkt |
| `world.snap(x, z, raster)` | rastet einen Punkt ein: `{ x, z }` |
| `world.canBuild(x, z, r, o)` | `{ ok, reason }`; `reason`: `outside`, `building`, `object`, `unit`, `player`, `blocks-path`; `o`: `{ units: false, keepPath }` |

## Projektile und Effekte

`game.shoot(opts)` schickt ein **sichtbares** Geschoss los und gibt es zurück (`.remove()` bricht es ab):

| Option | Bedeutung |
|---|---|
| `from` | Startpunkt `{x, y, z}` (z. B. `thing.muzzle()`) |
| `to` oder `target` oder `dir` | Zielpunkt, Ziel (Einheit, Thing, `'player'`) oder Richtung |
| `speed`, `damage`, `team`, `owner` | m/s, Schaden, wessen Feinde getroffen werden (Standard: Team von `owner`), Besitzer (Einheit, Thing) |
| `shape` | `'ball'`, `'bolt'` (Blitz), `'rocket'`; `color`, `size`, `trail` (Schweif) |
| `splash` | Radius: explodiert beim Aufprall mit Flächenschaden |
| `gravity` | Wurfbahn, zielt vor; `homing` Lenkrate rad/s; `life` Sekunden |
| `onHit(info)` | `{ x, y, z, unit, thing, player, type }` |

`game.explode(x, y, z, { radius, damage, team, owner, scale, visual })`: Explosion mit Flächenschaden (Schaden fällt nach außen ab; trifft Einheiten, Things und den Spieler, soweit feindlich zu `team`).
`game.fx`: `explosion(x, y, z, { scale })`, `burst(x, y, z, { count, color, color2, speed, life, size, gravity, spread, dir, soft })` (Funken oder Rauch), `muzzle(x, y, z, { dir, size, color })` (Mündungsfeuer), `beam(a, b, { color, width, sec })` (Strahl), `ring(x, z, r, { color, opacity, sec })` (Bodenring; mit `sec` ein Puls, ohne bleibt er und gibt `{ set({x, z, r, color, visible}), remove() }` zurück). Die Partikel kommen aus festen Puffern: beliebig viele Aufrufe sind unschädlich.

## Tweens

`game.tween(ziel, { eigenschaft: wert, … }, sekunden, opts)` ändert Zahlen sanft: `game.tween(unit, { y: 0, size: 1 }, 1.2)`, `game.tween(widget, { alpha: 0 }, 0.4)`. `opts`: `ease` (`linear`, `in`, `out`, `inout`, `back`, `bounce`), `delay`, `from: { … }`, `realtime`, `onDone(ziel)`; Rückgabe mit `.cancel()`. Tweens von Einheiten und Things laufen in Spielzeit (bei Pause stehen sie), die von Widgets immer.

## Speichern und Laden

`game.save(slot, extra)` speichert Spieler, Einheiten, Pickups, Prefab-Objekte (mit Teilstellung und `data`), Punkte und Spielzeit im Browser und liefert den Zustand als einfaches Objekt (JSON). `extra` nimmt eigene Werte auf (Gold, Welle, …; nur JSON-fähige Daten). `game.load(slot)` (oder ein solches Objekt) stellt alles wieder her und löst das Ereignis `load` mit `{ extra }` aus; Zeitgeber, Zonen und Ereignis-Handler gehören zum Skript und bleiben. **Aufträge (`goTo`) werden nicht gespeichert** – im `load`-Ereignis neu erteilen. Der Speicherplatz gilt nur für dasselbe Skript. `game.hasSave(slot)`, `game.deleteSave(slot)`.
Weiteres (stabile Nummern, Modul-Zustand, was nicht gespeichert wird): Kapitel „Speichern v2“.

## Module: eigene Bausteine mit Lebenszyklus (`game.module`)

Ein **Modul** ist ein Baustein mit Anfang und Ende: alles, was es über sein `ctx` anlegt (Objekte, Handler, Zeitgeber, Widgets, Eingaben, Kameras, Modelle), räumt die Engine beim Ausschalten selbst weg – nichts bleibt hängen, auch nicht nach 30× Ein-/Ausschalten, Neustart oder Laden. Für größere Spiele (Zelda-Welt, Strategie, Minispiele) ist das der Normalweg; kleine Skripte brauchen es nicht.

```js
game.module('kamera', {
  doc: 'Tab: Ich-Ansicht ↔ Vogelperspektive',
  deps: [],                          // andere Module, die zuerst laufen müssen (Reihenfolge und Fehler übernimmt die Engine)
  state: { ansicht: 'ego' },         // wird automatisch gespeichert und geladen (ctx.state); version: 1 für spätere Änderungen
  async init(ctx) { await game.assets.load('held', 'https://…/held.glb'); },   // optional, einmal; darf asynchron sein
  enable(ctx) {                      // jedes Einschalten
    ctx.input.action('ansicht', { keys: ['Tab'] });
    ctx.on('update', () => { if (ctx.input.pressed('ansicht')) { /* … */ } });
    ctx.every(1, () => ctx.hudSet('k', 'Ansicht: ' + ctx.state.ansicht));
  },
  update(ctx, dt) {},                // jedes Simulationsbild (nicht in der Pause)
  frame(ctx, rdt) {},                // jedes Bild, auch in der Pause (echte Zeit) – für Darstellung
  disable(ctx) {},                   // optional; danach räumt die Engine alles auf, was über ctx entstand
  save(ctx) { return {…}; }, load(ctx, data, savedVersion) {},   // statt state, wenn mehr Kontrolle nötig ist
  dispose(ctx) {},                   // endgültig entfernt
});
```
Kurzform: `game.module('name', (ctx) => { … })` ist ein reines `enable`. `ctx` ist `game` mit **Eigentum**: `ctx.on/every/after/fixed/tween/place/spawn/zone/ui.widget/ui.menu/input.action/camera.create/controller.define/model/instanced` gehören dem Modul. Dazu `ctx.state`, `ctx.own(x)` (Funktion, Object3D oder Objekt mit `dispose`/`cancel` dem Modul zuordnen), `ctx.release(key)`, `ctx.add(object3D)` (in `ctx.root`, die eigene Gruppe des Moduls), `ctx.hudSet(key, text)`, `ctx.alive`, `ctx.game` (ohne Eigentum).
Zustände: `new → loading → ready → active`, bei Fehlern `failed` (Meldung unter dem Skriptfeld, die anderen Module laufen weiter), `disposed`. Fehlende oder zyklische Abhängigkeit → `failed` mit Erklärung. Doppelter Name → Hinweis, das zweite wird ignoriert. Wird eine Abhängigkeit ausgeschaltet, ruht das abhängige Modul und startet wieder mit ihr.
Steuern: `game.modules.get(name)` (→ `{ name, state, error, enable(), disable(), ctx }`), `.has`, `.list()`, `.enable(name)`, `.disable(name)`, `.remove(name)`. Ereignis `module` `{ name, state }`.

## Zeit

`game.time` = Simulationszeit in Sekunden (Zahl; steht in der Pause und läuft mit dem Zeitfaktor). `game.clock` = `{ sim, real, dt, rdt, scale, frame, paused }` (`dt` Simulationsschritt, `rdt` echter Schritt). `game.timeScale = 0.5` verlangsamt (0 … 4). `game.fixed(60, (step) => …)` ruft mit fester Schrittweite auf (höchstens 5 Schritte pro Bild nachgeholt) – für Physik und Zählwerke. Zeitgeber (`every/after`) und Tweens von Einheiten laufen in Simulationszeit, UI-Tweens (`realtime`) in echter Zeit. Reihenfolge je Bild: Eingabe → Tweens → Effekte → Objekte/Einheiten/Steuerung → Projektile → Aufsammelbares → Zonen → `fixed` → Zeitgeber → Module `update` → Ereignis `update` → Kamera → Module `frame` → UI.

## Eingabe: Aktionen statt Tasten

```js
game.input.action('feuer2', { keys: ['Mouse0', 'f'] });                 // Aktion (gedrückt/losgelassen)
game.input.axis('lenken', { pos: ['d', 'ArrowRight'], neg: ['a', 'ArrowLeft'] });   // Achse −1 … 1
game.input.pressed('feuer2')  // in diesem Bild gedrückt;  .down('x') gehalten;  .released('x');  .value('lenken')
```
Quellen: Tastennamen (`'w'`, `'space'`, `'shift'`, `'Tab'`, `'KeyE'`), `Mouse0–4`, `WheelUp/WheelDown`, `MouseX/MouseY`. **Kontexte** trennen Bedeutungen: `ego`, `topdown`, `free`, eigene (`game.input.push('minispiel')` / `pop`); bei offenem Menü gilt automatisch `menu`. Eine Aktion gilt standardmäßig in jedem Kontext außer `menu`; `context: 'topdown'` schränkt ein. Klicks auf Widgets lösen keine Maus-Aktionen aus. Beim Fensterwechsel werden alle gehaltenen Eingaben zurückgesetzt. `game.input.virtual(name, wert)` setzt Werte von außen (Grundlage für spätere Touch-/Gamepad-Profile – diese gibt es noch **nicht**). Die eingebauten Aktionen der Ich-Steuerung heißen `move.x`, `move.y`, `jump`, `sprint`, `fire`, `aim`, `reload`, `use`, `weapon.last/next/prev`, `weapon.1…9` und lassen sich mit `game.input.bind(name, quellen)` umbelegen (`{ add: true }` ergänzt statt zu ersetzen).

## Kameras und Steuerungen

Die **Steuerung** (`game.controller`) entscheidet, wie Eingabe in Spieler und Kamera übersetzt wird: `ego` (Ich-Ansicht, Maus gefangen), `topdown` (Vogelperspektive, Maus frei), `free` (freie Inspektionskamera ohne Spieler). `game.controller.use('topdown', { x, z, dist: 60, pitch: 55, yaw, ortho: false, minDist, maxDist, edgePan })`, `game.controller.toggle('ego', 'topdown', opts)`, `game.controller.active`. Topdown: WASD verschieben, Q/E drehen, Mausrad zoomen, Rechtsklick ziehen = drehen/kippen, Mittelklick ziehen = verschieben. Der Wechsel hält Mausfang, Fokus, Spieler und Eingabe-Kontext konsistent; in Steuerungen mit freier Maus pausiert Esc, ein zweites Esc setzt fort.
Eigene Steuerung: `game.controller.define('name', { context, cursor: 'free' | 'locked', player: 'active' | 'idle' | 'off', input: {…}, enter(cc, o), exit(cc), update(cc, dt), camera(cc, dt), pointer(cc, type, e), view(cc) → { x, z } })`.
**Kameras:** `game.camera.create('name', { type: 'perspective' | 'orthographic', fov, size, near, far })` → Rig mit `setPosition/lookAt/setAngles/remove`; `game.camera.use(rig | 'name' | null)` erzwingt sie (`null` = Steuerung bestimmt). `game.camera.project(x, y, z)` (Welt → Bild), `game.camera.ray(sx?, sy?)` und `game.camera.pick(sx?, sy?)` (Bild → Welt: Treffer **und** `ground` = Bodenpunkt unter dem Mauszeiger). Das Ereignis `click` liefert `{ button, screen, ground, hit }`. Beispiel: Beispiel „Kamera-Modul“, Tower Defense (Bauen per Mausklick von oben).

## Modelle (GLB) und Instancing

**Eigene Modelle einladen (ohne Programmieren):** Studio → rechts „Modelle (GLB)“ → Datei auf das Feld ziehen oder „Modell laden …“. Erlaubt sind `.glb`, `.gltf` (**zusammen** mit ihren `.bin`- und Bilddateien auswählen) und `.zip` (z. B. ein Sketchfab-Download; Ordner im Archiv sind egal). Die Dateien werden zu **einer** eingebetteten Datei zusammengepackt, im Browser gemerkt und beim Export mitgeliefert. Danach öffnet sich die **Vorschau**: Sie zeigt das Modell so, wie das Spiel es einsetzt, mit grünem Pfeil nach „vorn“ und einem grauen 1,8-m-Zylinder als Größenvergleich. Dreht sich das Modell nicht nach vorn, stellst du **Blickrichtung** (+z, −z, +x, −x) ein; **Höhe in m** skaliert, **Ursprung** legt fest, wo der Fußpunkt liegt; Animationen lassen sich anklicken. „Speichern“ merkt die Einstellungen am Modell (sie gelten danach in jedem Skript und im Export, solange ein Aufruf sie nicht selbst nennt). „Ins Skript einfügen“ hängt zwei Zeilen an dein Skript (`game.prefab` und `game.place`, 6 m vor dich) – „Spielen“, und das Modell steht da; mit `hp` und `team` im Prefab wird es zum Gegner oder Ziel. Die Knöpfe „Vorschau“, „Einfügen“ und „Entfernen“ gibt es auch pro Modell in der Liste. **FBX, OBJ und andere Formate** werden nicht gelesen: vorher in Blender als `.glb` exportieren (Datei → Exportieren → glTF 2.0). Die ID ist der Dateiname. Im Skript: `const m = ctx.model('tester', { height: 2, forward: '+x' }); ctx.add(m.object); m.play('drehen');`. Per Code laden: `await game.assets.load('id', url | ArrayBuffer | File | { base64 })` (in `init` eines Moduls). **Vertrag:** nur `.glb` (glTF 2.0, eingebettet; **keine** Draco-/Meshopt-/KTX2-Kompression, keine externen Dateien); Einheit Meter; Blickrichtung `+z` (sonst `forward: '-z' | '+x' | '-x'`); Ursprung unten in der Mitte (`origin: 'bottom'`, sonst `'center'` | `'keep'`); `height` oder `scale` skaliert. `game.assets.setDefaults(id, { height, forward, origin })` setzt die Standardwerte per Code (das Studio tut es aus der Vorschau); `game.assets.get(id).defaults` zeigt sie. Gleiche ID lädt nicht neu (`replace: true` ersetzt). Fehler sind lesbar („Modell „x“ lässt sich nicht lesen: …“). Instanzen teilen Geometrie und Materialien (billig); `ownMaterials: true` gibt eigene Kopien (z. B. zum Einfärben). `game.assets.release(id)` gibt das Modell frei (verweigert, solange Instanzen leben; `{ force: true }` erzwingt). Instanz: `{ object, clips, play(name, { loop, speed, fade, weight }), stop(name), dispose() }`.
**Instancing:** `const h = game.instanced({ shape: 'box' | 'sphere' | 'cylinder' | 'cone', size, color, max: 500 })`, dann `h.set(i, { x, y, z, yaw, scale, color })`, `h.remove()` – 500 Stück sind ein Zeichenaufruf (für Bäume, Münzen, Truppen, Wolken).
**Prefab aus Modell:** `game.prefab('held', { model: { id: 'held', height: 1.8, forward: '+x' }, hp: 80, team: 'player', hits: [{ name: 'kopf', part: 'Kopf', r: 0.3, mult: 2 }] })` – `part` bezieht sich auf einen benannten Knoten des Modells; `thing.play('laufen')`, `thing.clips`.

## Eigene Objekte: `build`, Trefferzonen, Bewegung

Neben `parts` kann ein Prefab seine Gestalt selbst bauen: `build(thing, { THREE, game }) → Object3D` (Geometrie und Materialien gehören dem Objekt und werden mit ihm freigegeben; geteilte Dinge mit `userData.shared = true` markieren). `hits: [{ name, r, pos, to, part, follow(thing) → Object3D, mult }]` legt **Trefferzonen** fest (Kugel oder Kapsel von `pos` nach `to`); mehrere Zonen gehören zu einem Objekt (Wurm: Kopf `mult: 3`, Körper `1`), sie folgen `part`/`follow` auch bei Bewegung. Spieler-Strahl, `game.world.cast`, `game.shoot` und `game.explode` treffen die **Zonen** (`zone`, Schaden × `mult`, Explosion nach Abstand zur nächsten Zone); ohne `hits` gilt ein Zylinder aus `radius`/`height`. Hooks: `update(thing, dt)`, `onDamage(thing, { amount, by, zone })` (Rückgabe `false` = kein Schaden, Zahl = neuer Schaden), `onDestroy(thing, by)`, `save(thing) → Daten`, `load(thing, daten)`. Bewegung mit Gebäudekollision: `thing.walk(dx, dz, { radius })` → `{ moved, blocked }` (andere Objekte und Einheiten blockieren **nicht**; `solid` und Wegsuche folgen automatisch). Zonen abfragen: `thing.hitVolumes()`, `thing.segHit(ax, ay, az, bx, by, bz)`, `thing.rayHit(origin, dir, maxT)`. Beispiel „Sandwurm“.

## Speichern v2 und stabile Nummern

Zusätzlich zu den Angaben oben: Spielstandformat 2 (`v: 2`, ältere v1 werden geladen, neuere abgelehnt). Jedes Objekt und jede Einheit hat eine **stabile Nummer** (`thing.id`, `unit.id`), `game.byId(id)` findet sie wieder – so bleiben Verweise über Speichern und Laden gültig. **Modul-Zustand** (`state`/`save`) wird mitgespeichert; vom Modul angelegte Objekte gehören nach dem Laden wieder dem Modul (laufendes Modul vorausgesetzt). Prefab-Hooks `save/load` sichern eigene Daten. **Nicht gespeichert** (wird nach dem Laden neu aufgebaut): Projektile, Partikel, Tweens, Zeitgeber, Handler, Widgets, Kameras, Aufträge (`goTo`), Modul-Objekte in `ctx.root`, nicht-JSON-Daten (Funktionen werden nie gespeichert). Wiederholtes Laden darf keine Handler verdoppeln und keine Belohnung erneut auslösen: Belohnungen am Zustand festmachen (`state.quest = 'erledigt'`), nicht an Ereignissen. Fehler beim Speichern erscheinen als Hinweis („enthält Daten, die sich nicht speichern lassen“).

## Diagnose

`game.stats({ scene: true })` → `{ fps, frameMs: { avg, p95, max }, sim, objects, systems (Module, Handler, Zeitgeber, Widgets, Eingaben), render (Zeichenaufrufe, Dreiecke, Geometrien, Texturen, Programme), assets, limits }`. `game.diag()` blendet die Anzeige ein (auch `game.diag(false)`). Die Zahlen sind Messwerte dieses Geräts, keine Versprechen: Grenzen stehen in `limits`.

## Erweiterungsebene für Fortgeschrittene (`game.ext`)

Für alles, was die Komfort-Schnittstelle nicht kann: `game.ext` gibt `THREE`, `scene`, `renderer`, `camera`, `collide(x, z, r)` und `obstacleAt(x, z)` frei. **Das ist ein offener Zugang ohne Schutz** (kein Sandkasten): die Engine kann nicht verhindern, dass ein Skript Szene oder Renderer beschädigt. Besitz: Szene, Licht, Himmel und Renderer-Einstellungen gehören der Engine, die Hauptkamera dem aktiven Controller; eigene Objekte gehören in `ctx.root` / `ctx.add(…)`. Details, Versionen und verbotene Eingriffe: **Expertenreferenz** (`docs/EXPERTEN-REFERENZ.md`).

## Beispiele im Studio

„Kamera-Modul“ (Tab, Vogelperspektive über dem Südtor, Klick-Markierungen), „Eigenes Wesen: Sandwurm“ (build, Trefferzonen, Bewegung, Spielstand), „NPC mit Gesprächsbaum“ (Daten-Dialog, Auftrag, gespeicherte Entscheidung), „Mini Tower Defense“ (Menü, Kamerawechsel, Bauen per Klick, Wegsuche, Projektile, Speichern), „Torwacht – Tower Defense (Grafiktest)“ (großes Spiel mit 5 Türmen, 5 Gegnertypen, 10 Wellen, siehe unten), dazu die älteren (Wellen, Team, Mission, Sandkasten, UI).

## Beispiel: Tower Defense

Im Studio unter „Beispiele“ → „Mini Tower Defense“. Es zeigt: Bau-Menü mit Pause (B), Tab wechselt in die Vogelperspektive (Bauplatz direkt anklicken), Turm-Vorschau mit grün/rot und Wegsperren-Prüfung, drehende Türme mit `aimAt` und `shoot`, Aliens durch das Südtor per `goTo`, fliegende Ballons über `defineKind`, Speichern und Laden.

## Beispiel: Torwacht (Tower Defense, Grafiktest)

Im Studio unter „Beispiele“ → „Torwacht – Tower Defense (Grafiktest)“ (ca. 85 KB, Quelle `src/studio/games/torwacht.fgs`). Ein vollständiges Spiel vor dem Südtor: 16×9-Raster, feste Route (Gegner kommen aus einem Riss im Süden), 5 Turmtypen mit je 3 sichtbaren Ausbaustufen (Kettenturm, Mörser, Arc-Spule mit Kettenblitz, Raketenwerfer mit Lenkraketen, Kryo-Pylon), 5 Gegnertypen (Käfer, Krieger, gepanzerter Koloss, Luft-Drohne, Sandwurm-Boss mit 13 Gliedern), 10 Wellen, Luftschlag, Geld aus Abschüssen (Münzen fliegen zum **Geldbalken** und füllen ihn; jede Turmkarte und jeder Turm hat einen eigenen Füllbalken), **Tab** wechselt zwischen Ich-Ansicht (Maus zielen, Klick schießt, **E** setzt/wählt) und Vogelperspektive (Klick setzt/wählt). Tasten: 1–5 Turm, 0 abwählen, U ausbauen, X verkaufen, F Luftschlag, N nächste Welle (Frühstart-Bonus), T Tempo ×2, H Tageszeit, G Grafik-Diagnose. Die Ziffern 1–5 gehören in diesem Spiel den Türmen – die Waffenwahl wandert auf den Ziffernblock.

Gezeigt wird: `build` mit eigener Animation, `hits` mit `follow` (Wurmglieder, Kopf ×1,5, Panzerung über `onDamage`), `game.shoot` (Wurf mit `gravity`, `homing`, `shape: 'rocket'`) mit eigener Explosion über `game.explode({ visual: false })`, Kettenblitze über `fx.beam`, `game.instanced` für Kacheln, Rahmen, Routenlichter und Pfosten (je ein Zeichenaufruf), ein Pool aus drei Punktlichtern für Mündungsfeuer und Explosionen, Widgets mit eigener Zeichnung (`g.bar`, `g.poly`, Klicks mit lokalen Koordinaten), `game.ui.project` für Schadenszahlen und Münzen, Eingabe-Kontexte, Kamerawechsel per `game.controller.use`, ein Modul mit Aufräumen (`ctx.own`: Tasten, Zeitskala, Waffenbelegung werden beim Ausschalten wiederhergestellt) und den Spielstand in `ctx.state`.

Technik-Kniff für viele Objekte: `bake(root, anim, varianten, erzwungen)` im Skript erkennt selbst, welche Teile eines Modells sich nie bewegen (Animation, Ausbaustufen, Drehteile), und verschmilzt sie je Material zu einem Mesh – das halbiert die Zeichenaufrufe (Spitze in der Boss-Welle mit 20 ausgebauten Türmen und rund 20 Gegnern: etwa 1.900 statt 3.300 im Test); Schatten werfen nur noch große Teile.

## Muster

**Wellen:** Funktion `nextWave()`, bei `kill` prüfen `game.count('aliens') === 0`, dann `game.after(6, nextWave)`; Zähler `wave++`; am Ende `game.win(...)`.
**Verteidigen:** Zone in der Mitte, Gegner mit `hunt: true`; per `game.every(1, …)` prüfen, ob Gegner in der Zone sind (`game.units('aliens').some(u => Math.hypot(u.x - zx, u.z - zz) < r)`), Zähler hochzählen, bei Grenze `game.lose('Basis verloren')`.
**Trupp:** `game.spawn('soldier', { team: 'player', ai: 'follow' })`, mehrfach.
**Zeitlimit:** `game.every(1, () => { left--; game.hud.set('t', left + ' s'); if (left <= 0) game.lose('Zeit abgelaufen'); })`.
**Eskorte / Ziel:** `unit.goTo(x, z)` und mit `game.every` die Entfernung prüfen.
**Spielstand zurücksetzen:** `game.restart()` führt das Skript neu aus (alle Einheiten, Pickups, Zonen, Zeitgeber werden entfernt).

## Fehler

Fehler im Skript erscheinen unter dem Skriptfeld und (während des Spiels) als rote Zeile oben links: Art, Meldung und **Zeilennummer**. „Fehler kopieren“ legt Meldung samt Codezeile in die Zwischenablage – so lässt sich der Fehler direkt in den Chat einfügen. Ein Fehler in einem Ereignis oder Zeitgeber bricht das Spiel nicht ab; Zeitgeber mit Fehler werden abgeschaltet. Hinweise (z. B. unbekannter Einheitentyp) sind keine Fehler, die Zeile wird einfach übersprungen. Syntaxfehler (vergessene Klammer) nennen keine Zeilennummer, nur die Meldung.

## Grenzen (Stand v0.4)

Nicht umgesetzt (steht auch in `game.planned`): **Touch-Steuerung** (die Aktionen sind vorbereitet), **Gamepad**, **Fahrzeug-Steuerung** (der Buggy der Stadt ist im Spiel nicht steuerbar), **Third-Person-Kamera**, **Physik-Bibliothek** (nur als möglicher Adapter gedacht), **Mehrspieler (WebRTC)**, Import von Monstern mit Laufanimation als eigener Einheitentyp.
Bewusst begrenzt:
- Maximal 70 gleichzeitig lebende Einheiten (Rechenlast); Prefab-Objekte sind leichter (hunderte unkritisch, tausende nicht); Instancing für Massen.
- Wegsuche mit 2-m-Raster bis 360 m um die Stadtmitte; sehr enge Lücken (unter 1 m) gelten als zu.
- Die **Stadt ist Inhalt, nicht veränderbar**: Gebäude sind feste Blöcke (kein Betreten, keine Dächer); Prefabs/Modelle werden in die Stadt gestellt, die Stadtgeometrie bleibt unverändert.
- Modelle: `.glb`, `.gltf` (mit Nebendateien) und `.zip` daraus, ohne Draco/Meshopt/KTX2; keine Fremdformate (FBX, OBJ …, vorher in Blender nach `.glb`); die Datei steckt im Export (Größe = Modelle × 1,33; `.gltf` wird eingebettet und ist dadurch größer als dieselbe `.glb`). Die Vorschau benutzt einen eigenen kleinen WebGL-Kontext und gibt ihn beim Schließen frei.
- Einheiten schießen mit Treffer-Strahlen; sichtbare Geschosse für Skripte über `game.shoot`.
- Widgets reagieren nur, wenn die Maus nicht gefangen ist (Pause, Menü, `game.ui.cursor(true)` oder Steuerung mit freier Maus).
- `game.kills` zählt nur Abschüsse des Spielers.
- Kein Sandkasten: Skripte und Module laufen mit den Rechten der Seite (siehe Erweiterungsebene).
- Getestet wurde in einem Browser ohne Grafikkarte (SwiftShader) und mit Messungen der Logik; **Bildraten auf echter Hardware sind nicht gemessen**. `game.diag()` zeigt sie auf dem eigenen Gerät.

## Export

Studio → „Als Spiel exportieren (HTML)“: eine einzige HTML-Datei mit der ganzen Stadt, dem Skript, den **eingebetteten Modellen (GLB)** und Startbildschirm; läuft per Doppelklick ohne Internet (keine versteckten Nachladungen; Modelle von einer URL im Skript würden nachgeladen und fehlen offline – deshalb Modelle über „Modelle (GLB)“ laden). Im eingebetteten Claude-Fenster fragt der Browser zur Bestätigung, ob die Datei gespeichert werden soll. Das Skript kann dort nur als `.txt` gespeichert werden.
