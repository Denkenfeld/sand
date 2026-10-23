# Desert Forge – Skript-Handbuch (Studio)

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
| `game.teamColor(team, '#ff8800')` | Markierungsfarbe über den Köpfen und in der Minimap |
| `game.hour(h)` | Tageszeit setzen (0–24; 12 = Mittag, 22 = Nacht) |
| `game.sound(name)` | Ton: `pistol rifle shotgun rocket laser hit headshot hurt reload pickup empty win lose` |
| `game.random(a, b)` | Zufallszahl |
| `game.log(...)` | Text in die Protokollzeile unter dem Skriptfeld |
| `game.weapons.define(id, spec)` / `.list()` | eigene Waffe festlegen / alle Waffen auflisten |

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
| `kill` | `{ unit, killer: 'player' \| Einheit \| null, headshot }` | eine Einheit ist gestorben |
| `playerDeath` | – | der Spieler ist gestorben |
| `pickup` | `{ type, x, z, weapon, stat }` | der Spieler hat etwas eingesammelt |
| `spawn` | `{ unit }` | eine Einheit wurde erzeugt |
| `use` | `{ x, z }` | Taste E gedrückt |
| `update` | `{ dt, t }` | jedes Bild – sparsam benutzen |

## Die Stadt: `game.city`

| Aufruf | Bedeutung |
|---|---|
| `game.city.pois()` | Namen aller Orte (Westtor, Zentralbrunnen, Raumhafen, Hauptquartier, Kaserne, Cantina, …; manche mehrfach) |
| `game.city.poi('Kaserne')` | `{ x, z, name }` des ersten passenden Ortes (Teilname genügt) oder `null` |
| `game.city.randomOpenPoint({ near, min, max })` | freier Punkt im Ring um `near` (Standard Spieler), oder `null` |
| `game.city.districtAt(x, z)` | Name des Viertels |

Orte können überall dort stehen, wo `x`, `z` verlangt wird: `game.spawn('alien', { at: 'Raumhafen' })`, `game.player.teleport('Hauptquartier')`, `game.zone({ at: 'Nordtor', r: 6, … })`.

## Muster

**Wellen:** Funktion `nextWave()`, bei `kill` prüfen `game.count('aliens') === 0`, dann `game.after(6, nextWave)`; Zähler `wave++`; am Ende `game.win(...)`.
**Verteidigen:** Zone in der Mitte, Gegner mit `hunt: true`; per `game.every(1, …)` prüfen, ob Gegner in der Zone sind (`game.units('aliens').some(u => Math.hypot(u.x - zx, u.z - zz) < r)`), Zähler hochzählen, bei Grenze `game.lose('Basis verloren')`.
**Trupp:** `game.spawn('soldier', { team: 'player', ai: 'follow' })`, mehrfach.
**Zeitlimit:** `game.every(1, () => { left--; game.hud.set('t', left + ' s'); if (left <= 0) game.lose('Zeit abgelaufen'); })`.
**Eskorte / Ziel:** `unit.goTo(x, z)` und mit `game.every` die Entfernung prüfen.
**Spielstand zurücksetzen:** `game.restart()` führt das Skript neu aus (alle Einheiten, Pickups, Zonen, Zeitgeber werden entfernt).

## Fehler

Fehler im Skript erscheinen unter dem Skriptfeld und (während des Spiels) als rote Zeile oben links: Art, Meldung und **Zeilennummer**. „Fehler kopieren“ legt Meldung samt Codezeile in die Zwischenablage – so lässt sich der Fehler direkt in den Chat einfügen. Ein Fehler in einem Ereignis oder Zeitgeber bricht das Spiel nicht ab; Zeitgeber mit Fehler werden abgeschaltet. Hinweise (z. B. unbekannter Einheitentyp) sind keine Fehler, die Zeile wird einfach übersprungen. Syntaxfehler (vergessene Klammer) nennen keine Zeilennummer, nur die Meldung.

## Grenzen (Stand v0.1)

- Maximal 70 gleichzeitig lebende Einheiten (Rechenlast).
- Die KI hat keine Wegsuche: sie weicht Häusern aus, kann sich aber in Sackgassen verhaken. Weite Straßen und Plätze funktionieren am besten.
- Einheiten schießen mit Treffer-Strahlen, nicht mit sichtbaren Geschossen; nur der Spieler hat Raketen.
- Der Spieler kann nicht auf Dächer oder in Gebäude; Häuser sind massive Blöcke.
- Fahrzeuge (Buggy) sind im Spiel noch nicht nutzbar.
- Eigene Monster-Modelle: kommen im nächsten Schritt (Import als Läufer mit Beinanimation).
- Mehrspieler (WebRTC) und Touch-Steuerung sind geplant, noch nicht gebaut.

## Export

Studio → „Als Spiel exportieren (HTML)“: eine einzige HTML-Datei mit der ganzen Stadt, dem Skript und Startbildschirm; läuft per Doppelklick ohne Internet. Im eingebetteten Claude-Fenster fragt der Browser zur Bestätigung, ob die Datei gespeichert werden soll. Das Skript kann dort nur als `.txt` gespeichert werden.
