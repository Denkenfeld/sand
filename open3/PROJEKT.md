# Dünenplanet – PROJEKT.md

Diese Datei am Anfang jedes neuen Chats hochladen (dazu nur die eine Datei, die geändert werden soll). Dann muss der Code nicht neu gelesen werden.
Stand: 27. Oktober 2026 · Schritt 1, 2 und **V1 „Rückgrat und erster Tag“** erledigt (Pitch: Basisbau-Simulator).

## Das Spiel in drei Sätzen
Offene Wüstenkugel (Radius 420 m), man fährt mit dem Buggy „Skarab“. Intro: 4 Leuchtstäbe sammeln, Schiff „Kojote“ explodiert, Fahrt zum Krater,
Level 11 (3 Kisten, Sandwurm), danach startet der **Basisbau** (Aufbauspiel). Auf dem Planeten sollen später weitere Zonen mit eigenen Spielen entstehen.

## Starten und prüfen
- Spielen: Ordner über einen Webserver öffnen (`npx serve` oder `python3 -m http.server`), `three.min.js` (deine, r128) liegt neben `index.html`.
- Prüfen: `node tools/test.js` – Syntax, Zonenliste, Datentabellen, Wirtschafts-Simulation (100 Spielminuten in ~50 ms), Forschung, Speicherstand, **Balance-Ziele**, Modelle (wenn `three.min.js` im Ordner liegt). Kein Browser nötig.
- Balance ansehen: `node tools/balance.js` – Tabelle: Zeit bis zum Missionsziel, Erz nach 5/10/20/30/60 min, je Forschung Kosten, Mehrertrag und Amortisation.
- Im Browser: Konsole (F12) auf Fehler ansehen. `window.__basis` ist die Konsolen-Schnittstelle der Basis (`__basis.sim.S`, `__basis.act('b:solar')` …).
- Abkürzungen im Spiel: 3 s an der Basis stehen → Knöpfe „Phase 2: Basisbau (Cheat)“ / „Level 11 (Cheat)“. Mit Spielstand erscheint „Weiter: Basisbau“. Pause-Menü: „Spielstand löschen“.

## Ordner
```
index.html            nur Seitengerüst + Skript-Reihenfolge (keine Logik)
css/game.css          alle Stile des Kerns
core/                 KERN – stabil, selten anfassen (früher ein einziges Skript, Reihenfolge der Tags in index.html beachten)
  save.js               Speicherstand (localStorage "dp_save"), globale Ressourcen, Freischaltungen
  zones.js              Zonen-Manager: laden, betreten, verlassen, speichern, pro Frame aktualisieren
  radar.js              Radar für die Buggy-Fahrt (gemeinsamer Dienst)
  terrain.js            Rauschen, H(dir) = Geländehöhe, TN() = Normale, Krater/Basis-Abflachung
  shaders.js            Planeten- und Himmel-Shader, Tageszeit
  scene.js              Renderer, Kamera, Buggy-Gruppe, Schatten, Staub
  input.js              Joystick, Tasten, Boost/Sprung
  physics.js            Fahrphysik (Starrkörper, 4 Federbeine, Kugelgravität), step()
  mission.js            Intro-Mission (Leuchtstäbe, Minikarte), Finale (Explosion, Funk), Level-Start, mkctx(), Cheats
  audio.js              synthetischer Ton, Pause-Menü, Einstellungen, „Zur Karte“
  loop.js               Kamera, Licht, Hauptschleife frame(), Größenanpassung
gfx/                  Modelle (Schiff, Buggy, Arbeiter) – unverändert, siehe docs/LIESMICH_GRAFIK.txt
zones/
  registry.js           Liste aller Zonen (Ort auf der Kugel, Radius, Dateien)
  level11.js            Zone „level11“ (Kisten, Sandwurm) – führt am Ende in die Basis
  basis/
    data.js               ALLE Zahlen/Texte des Aufbauspiels (Gebäude, Einheiten, Forschung, Wirtschaft, Raster, Balance-Ziele)
    sim.js                Spiellogik, reine Daten, ohne Grafik (testbar)
    models.js             3D-Modelle der Gebäude (eine mk-Funktion je Gebäude)
    zone.js               Ansicht + Eingabe + Menü der Basis (liest sim, zeichnet, nimmt Taps an)
tools/test.js         Test-Befehl (Syntax, Daten, Sim, Balance, Modelle)
tools/balance.js      Bot-Balance: spielt einen festen Plan, misst Tempo und Amortisation
docs/                 Altes (Grafik-Liesmich)
```

## Zonen-Vertrag
Jede Zone ist ein Verzeichnis `zones/<id>/` mit einer Startdatei, die sich so anmeldet:
```js
Zones.define({ id: 'tower',
  enter(g, o) { /* starten; g = Kern-Kontext (s. u.), o = Optionen; pro Frame: g.hook((dt, tt) => {...}) */ },
  leave()     { /* alles entfernen, was die Zone erzeugt hat: Szene, DOM, Listener */ },
  save()      { return { /* JSON-fähiger Spielstand */ }; } });
```
Eintrag in `zones/registry.js`: `Zones.register({ id, name, src: ['…/data.js','…/zone.js'], at: () => Richtung(Vector3), radius: Meter, color })`.
- `src` darf eine Liste sein (die letzte Datei ruft `Zones.define`). Geladen wird erst beim Betreten, beim Verlassen wird die Definition freigegeben.
- `at()` setzt die Zone auf die Kugel; ist sie freigeschaltet (`Zones.enter` schaltet frei), erscheint sie **automatisch im Radar** (mit gestricheltem Ring = `radius`).
- Betreten/Verlassen: `Zones.enter(id, opts)` (liefert ein Promise), `Zones.leave(id)`. Speichern passiert automatisch alle 15 s, beim Verlassen, bei „Zur Karte“ und beim Schließen der Seite.
- Zonen sprechen nicht direkt miteinander: Austausch nur über `Save.res` (globale Ressourcen) und `Save.unlocked(id)`.

### Kern-Kontext `g` (was eine Zone vom Kern bekommt)
`T` (THREE) · `scene, camera, renderer` · `car, pos, vel` (Buggy: Gruppe, Position, Geschwindigkeit; `pos` ist Weltposition auf der Kugel) · `H(dir)` Geländehöhe · `R` Planetenradius · `base` Kraterrichtung ·
`say(wer, text)` Funk · `msg(text)` Einblendung · `chime([Hz…], lautstärke)` · `tone(f0,f1,dauer,lautstärke)` · `dust(pos, vel)` Staubpartikel · `sfx.{rumble,screech,boom,drums}` · `mkfx(n, feuer?)` Partikelsystem ·
`nz(...)`, `A` (Audio-Bausteine) · `planet` (Planeten-Material, Uniforms z. B. Fackellichter) · `sun` · `crater` · `freeze(bool)` Buggy sperren · `sunk(f)` Tageszeit-Tempo ·
`zones` · `radar` · `save` · `hook(fn)` · `zoneId`.

### Gemeinsame Dienste
- **Radar** (`g.radar`): `show(bool)`, `mark(id, {dir: Vector3|()=>Vector3, name, col, shape:'sq'|'dot'|'dia', ring})`, `unmark(id)`. Oben = vorne, Tippen = Reichweite 300/800/2000 m. Die Basis schaltet es beim Einsteigen in den Buggy ein. Das ✓ in der Beschriftung heißt: im Zonenbereich (Aussteigen möglich).
- **Speicherstand** (`Save`): `zone(id)`, `setZone(id,data)`, `res` (globale Ressourcen, z. B. `res.ore`), `unlock/unlocked(id)`, `reset()`.
- **Platzieren auf der Kugel**: in `zones/basis/zone.js` (`dirAt/pAt/quatAt/place`) – noch nicht ausgelagert; bei Zone 2 nach `core/` verschieben (siehe „Offen“).

## Basisbau: Datenfluss
`data.js` (Tabellen) → `sim.js` (Logik: bauen, Strom/Wasser/Munition, Erzertrag, Bauzeit, Einheitenzahlen, speichern/laden, erzeugt **Ereignisse**: `placed, built, income, grew, removed, trained, researched`) → `zone.js` (liest `sim.S`/`sim.bl`, zeichnet, verarbeitet Ereignisse, nimmt Taps an und ruft `sim.build/remove/…`).
Wie die Figuren herumlaufen, ist reine Ansicht (nicht in der Sim). Die Ansicht hängt `root, m, holo, hn` an die Sim-Gebäude; die Sim kennt sie nicht.

### Rezepte
- **Zahlen ändern** (Kosten, Erträge, Bauzeit, Raster, Startwerte, Forschung): nur `data.js`, danach `node tools/test.js`.
- **Neues Gebäude**: 1) Zeile in `data.js → buildings` (+ Kennung in `palette`), 2) `mkXyz` in `models.js` und in der Rückgabeliste eintragen. Fertig, die Menükarte erscheint von selbst. Der Test meldet fehlende Modelle.
- **Neue Forschung**: eine Zeile in `data.js → tech` (Kosten, Zeit, `req`, `at`, Wirkung `fx` – erlaubte Wirkungen stehen im Kopf der Datei). Menükarte und Wirkung entstehen von selbst. Danach `node tools/balance.js` ansehen und `node tools/test.js` laufen lassen (prüft Amortisation und Tempo gegen `data.js → targets`).
- **Neue Einheit**: Zeile in `data.js → units` (Kosten, Ausbildungszeit, Zähler `pop`, Obergrenze `cap`, Gebäude `at`). Die Ansicht stellt die Figur beim Ereignis `trained` auf (`zone.js`, Ereignisschleife in `hook`). Eigenes Aussehen/Verhalten = Ansicht.
- **Gebäude hinter Forschung sperren**: im Gebäude `needs: '<techId>'` setzen (derzeit nutzt keines `needs`; die Sperre ist getestet).
- **Neue Zone**: Ordner `zones/<id>/`, Zeile in `registry.js`, `Zones.define` wie oben. Eine Beispielzeile steht als Kommentar in `registry.js`.

## Oberfläche des Basisbaus (zone.js)
- Menü = **Seitenleiste rechts** (Breite `clamp(124px,33vw,160px)`, CSS-Variable `--pw`, in JS `PW()`), Karten untereinander und scrollbar, zweizeilig (Symbol + Name / Kosten + Werte). Oben links die Ressourcen-Chips und das Ziel, unten links Auto / Zentrieren / Tag-Nacht.
- Die Kamera verschiebt das Bild per `camera.setViewOffset` um `PW()/2`, damit der Fokus in der freien Fläche mittig liegt (Picking bleibt korrekt, getestet). Pause/Ton wandern im Basisbau neben die Leiste.
- Neue Karten: `card(a, icon, name, kosten, extra)`; Aktionen laufen über `act('b:<id>' | 'u:<id>' | 't:<id>' | 'rot' | 'demo')`.

## Balance-Stand (Messung mit `tools/balance.js`)
- Bot-Plan: Wasser → Energie → Raffinerie mit Fließband, dazwischen Forschung. Missionsziel nach ~4 s; Forschungsbaum nach ~16 min; Amortisation der Erz-Forschungen 5–8 min (Ziele in `data.js → targets`).
- **Befund:** Gebäude und Einheiten sind im Verhältnis zum Ertrag sehr billig (Grundeinkommen mit 4 Raffinerien ≈ 960 Erz/min). Ohne weitere Erz-Senken türmt sich Erz auf (nach 60 min > 50.000). Die Forschung ist nur die erste Senke; die eigentliche Gegenkraft sollen Feinde und Türme (Schritt 5) und teurere Gebäude (Schritt 4) liefern. Bestehende Gebäudekosten und Erträge wurden bewusst **nicht** verändert.
- Der Amortisations-Test misst mit 4 Raffinerien. Wer nur eine hat, braucht länger; das ist gewollt (Forschung lohnt erst mit Ausbau).

## V1 (neu)
- **Hauptauftrag**: `data.js → quests` (7 Schritte Akt 1), Zustandsziele `built/full/pop/tech/cap/nights`; goldenes Banner + Journal (Warum/Wo/Wie, „Zeig mir, wie“ setzt einen Ghost); Hinweis-Leiter 3 min Funk, 8 min Pulsieren (`economy.hint1/hint2`). Gebäude erscheinen im Menü nach `after: <Schritt>`.
- **Lager** `start.cap` 500, Silo +500, Überschuss verfällt. Forschungskosten daran angepasst (Test: ≤ Lager mit 5 Silos).
- **Stellen** `st` (Raffinerie 2, Fabrik 3, Kaserne 1): unbesetzt = 0, halb = anteilig; Arbeiter trinken `workerWater` Wasser; Figuren laufen zur Stelle (`sim.jobs`).
- **Tag/Nacht** `dayLen` 360 s, Uhr `sim.clock`; Solar (`sun:1`) nur bei Licht; **Batterie** `bat` (Energie-Sekunden); leer + Defizit = Stromausfall; Nacht zählt nur ohne Ausfall. 🌙-Knopf = Zeit vorspulen.
- **Zeit** ▶ / ▶▶ / ⏸ (nur im Basisbau; Planen in der Pause geht). **Offline**: bis 2 h mit halber Rate beim Laden (`sim.offline`). Spielstand Sim-Format v3 (v1/v2 werden gelesen).
- **Platzieren mit Ghost**: Gebäude in der Leiste wählen → der Ghost (Grundfläche w×h) klebt an der Maus. Grün = passt, rot = geht nicht (1 Feld oder Platz/Erz fehlt); bei mehreren Feldern sind die unpassenden Felder rot, der Rest gelb. Ein Klick baut sofort, danach ist die Maus wieder leer (nichts gewählt); Rechtsklick/Esc/✖ bricht ab. Touch: Feld antippen setzt den Ghost, nochmal dieselbe Stelle oder „✔ Bauen“ baut. Code: `arm/disarm/hover/confirmBuild/ghostUpdate` in `zone.js`; die Feldfarben kommen aus dem Raster-Shader (grün = Kanal g, rot = b, gelb = beide).
- **Netz (V1.2)**: Gebäude sind verbunden, wenn sich ihre Grundflächen an einer Kante berühren; Fließbänder überbrücken Lücken (`economy.link`, `sim.touches/network`, `b.link/b.dist`). Nicht Verbundenes ist offline (🔗 durchgestrichen). **Abschalt-Reihenfolge**: Verbraucher werden in Baureihenfolge versorgt, die zuletzt gebauten schalten bei Wasser-/Energie-/Munitionsmangel zuerst ab (`b.on`, `b.off`); das Gebäude wird dunkel, darüber schwebt das durchgestrichene Symbol. Erzeuger zählen nur, wenn sie selbst laufen (Energiefeld braucht Wasser). Nach einem Ausfall läuft die Batterie erst bei 35 % wieder an.
- **Fließbänder**: automatische Anschlüsse (Gerade/Kurve/T/Kreuzung), zweispurig; Pakete (Wasser blau, Strom gelb, Erz orange) fahren als ein InstancedMesh; Spur 1 vom Quartier weg, Spur 2 zum Quartier (reine Optik). Lokale Modellachse +z = Raster −z.
- **Abriss**: `sim.demolish` (Dauer `economy.demoTime`), Ansicht baut rückwärts mit Staub, am Ende `boom(b)` (auch für spätere Gegnertreffer nutzbar); Erstattung erst am Ende.
- **Arbeiter**: helfen bei Bau und Abriss (vor der Stelle), laufen über Fließbänder, wählen freie Gebäudeseiten und gehen notfalls durch Lücken, wenn sie eingeschlossen sind. Menükarten füllen sich beim Bauen/Forschen/Ausbilden von links nach rechts.
- **Kopfzeile**: 8 Chips in einer Reihe mit Füllbalken (Erz/Lager, Arbeiter/Unterkünfte, Stellen, Energie, Wasser, Batterie, Munition, Tageszeit). Gelb = knapp, rot = Ausfall. Ein Klick auf einen Chip öffnet ein Popup mit Ursache und Tipp (`chipInfo` in `zone.js`). Der Tag-Chip füllt sich bis zum nächsten Wechsel und zeigt die Restzeit.
- `tools/balance.js` neu geschrieben (Bot ergänzt Wasser/Strom/Batterien selbst). Silo und Batterie stehen in `models.js`.
- Nicht getestet: echter Browser/Handy. Offen: goldener Radar-Marker, Menü-Kategorien (10 Karten), Wohnmodul, Lärm/Wurm, Fabrik (V2).

## Konventionen
- Sprache: Deutsch (Texte, Kommentare). Code kompakt, aber **keine neuen Zeilen über ~200 Zeichen**; neue Dateien lieber klein und thematisch.
- Reine Logik ohne THREE/DOM in `sim.js`-Dateien (laufen in Node, werden von `tools/test.js` geprüft).
- Eine Zone räumt in `leave()` alles auf, was sie angelegt hat (in `basis`: `own(obj)` statt `scene.add`, Listener benennen, HUD-Styles sichern).
- Grafikbudget: Obergrenze auf dem Handy etwa **200 Draw-Calls**. Gemessen (Testbrowser, nicht echtes Handy): Fahrmodus ca. 250 am Schiff / 120 weiter weg, Basisbau ca. 290 am Start, jeder Arbeiter +25 Calls und 17.000 Dreiecke. Viele Einheiten → Instancing (siehe Reihenfolge, Schritt 3).
- Einstellungen (Lautstärke, Grafik) liegen in `localStorage "dp_cfg"`, der Spielstand in `"dp_save"` (Version 1; bei Formatänderung `VER` in `save.js` erhöhen und Sim-`serialize` mitziehen).

## Was getestet ist (und was nicht)
Getestet (Node + Software-Browser, dieser Stand; Forschungskarten und Ausbildung auch im Browser): alle Syntaxprüfungen, Sim/Wirtschaft/Speicherstand, Modelle, Ladereihenfolge ohne Konsolenfehler, Übergang Level 11 → Basis, Bauen, Aussteigen/Einsteigen, Radar (Anzeige, Reichweite, Ring), Speichern → Neu laden → „Weiter: Basisbau“, `Zones.leave('basis')`.
**Nicht** getestet: echtes Handy/GPU (Bildrate, Draw-Calls), Touch-Bedienung, Intro-Mission durchgefahren (im Test per Teleport), Sandwurm-Verlauf, Reflexionen.

## Offen / bekannte Grenzen
- Radar: Die Minikarte der Intro-Mission (`#mc` in `mission.js`) ist noch eigener Code; bei Gelegenheit auf `Radar` umstellen.
- Erz: Die Basis führt ihr Erz in `sim.S.ore` und schreibt es beim Speichern nach `Save.res.ore`. Sobald Zone 2 Erz ausgibt, muss die Basis `Save.res.ore` als einzige Quelle nutzen (kleine Änderung in `zone.js`/`save()`/`enter()`).
- `leave()` der Basis entfernt Objekte, gibt Geometrien/Materialien aber nicht frei (`dispose`); die Arbeiter-Modelle bleiben in `gfx/bridge.js` registriert.
- Platzieren-auf-der-Kugel-Hilfen und die Textur-/Material-Bausteine (`MS`, `A`, `spr`, `cv`) sind in `zone.js` und sollten bei Zone 2 in einen gemeinsamen Baustein wandern.
- Modelle werden beim Laden automatisch verschmolzen (`bridge.js`); besser wäre ein einmaliger Vorlauf, der schlanke Dateien erzeugt.
- Cheat-Knöpfe sind noch im Spiel.
- Forschung läuft nur in der Zentrale (`at: 'hq'`), eine zur Zeit. Ein Labor-Gebäude (Schritt 6) setzt dann `at: 'lab'` in der Tabelle.
- Ausbildungszeit ist für Arbeiter und Soldaten noch 0 (sofort), der Mechanismus ist aber da und getestet.
- Spielstände: Sim-Format v2; v1 (vor der Forschung) wird beim Laden übernommen.

## Reihenfolge (jeder Schritt = eigener Chat)
1. ~~Fundament~~ (dieser Stand)
2. ~~Wirtschaftskern vertiefen~~ (Forschung, Einheiten-Tabelle, Ausbildungszeit, Balance-Bot, Spielstand v2) – erledigt
3. Darstellung mit Instancing (Arbeiter, Soldaten; Detail-Modelle nur bei Nahaufnahme)
4. Gebäudepaket 1: fünf Gebäude als Daten + Modelle
5. Feinde und Wellen (Wellen als Daten, KI als Zustandsautomat, Pfad einmal pro Rasteränderung)
6. Forschung und Entwicklung
7. Zone 2: Tower Defense (nutzt Raster/Einheiten/Erz der Basis, Radar zeigt die neue Zone)

## Auftrags-Vorlage für neue Chats
> Lade PROJEKT.md + `<eine Datei>` hoch. Auftrag: „Neues Gebäude Wasserpumpe: Kosten 40 Erz, +2 Wasser, −1 Energie, Modell Zylinder mit Rohr. Danach `node tools/test.js` grün.“
> Mehrere Wünsche bündeln. Liefern lassen: nur geänderte/neue Dateien oder Funktionen.
