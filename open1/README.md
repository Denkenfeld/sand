# Desert Forge

Objekt-Werkstatt für ein 3D-Spiel auf einem Wüstenplaneten (three.js + cannon-es).
Alles ist prozedural: keine Bilddateien, keine Modelle. Jedes Objekt ist eine JS-Datei, die
Parameter (Regler), Teile (Parts) und Physik-Modus beschreibt. Die Oberfläche baut Liste und Regler selbst.

## Arbeiten

**Nur spielen/ansehen:** die Datei `index.html` im Hauptordner mit Doppelklick im Browser öffnen. Sie ist komplett (eine einzige Datei,
funktioniert offline, kann so auf GitHub Pages oder jeden Webspace). `src/index.template.html` ist nur die Vorlage und läuft allein nicht.

**Weiterentwickeln** (braucht Node.js):

```
npm install
npm run build      # schreibt index.html (Hauptordner), dist/index.html und dist/artifact.html (Fragment zum Veröffentlichen)
npm run dev        # wie build, aber ohne Minify (bessere Fehlermeldungen), schreibt nur dist/
```

Im Viewer: links Objekt wählen, rechts Regler. Unten: Aufbauen, Explodieren, Zurücksetzen, Testen.
Unter "Physik" lassen sich Collider anzeigen und Hindernisse stellen. "Rezept kopieren" liefert Objekt,
Parameter, Schmutz und Licht als JSON; das in den Chat einfügen, damit genau dieser Stand weitergebaut wird.

## Struktur

```
src/
  main.js              Renderer, Kamera, Eingabe, Hauptschleife, window.__forge (Test-API)
  ui.js                Oberfläche (Regler werden aus den Parameter-Definitionen erzeugt)
  core/
    forge.js           ForgeObject / Part: Aufbau, Explosion, Reset, Physik-Modi, Collider
    materials.js       M.metal / clay / cloth / wood / tread / glow / glass + Wetter-Shader
    textures.js        prozedurale PBR-Texturen (Farbe, Normal, Rauheit/Metall), 512 px, kachelbar
    helpers.js         box, cyl, sph, torus, tube, cloth, crumple (Beulen), dent, localBounds
    atmosphere.js      Himmel, Sonne(n), Dunst, Dünen, Staub, Reflexionen, Presets
    physics.js         cannon-es Welt, Materialpaare, Arena-Wand, Collider-Anzeige
    fx.js              Partikel (Rauch, Feuer, Funken), Druckwelle, Brandflecken
    audio.js           synthetische Geräusche (Explosion, Blech, Aufprall)
    noise.js           Rauschen (kachelbar), Worley
  objects/
    index.js           Registry: hier neue Objekte eintragen
    kit.js             gemeinsamer Baukasten: Kristalle, Solarflächen, Gitter-Masten (lattice, strut), Räder
                       (addWheels + vehicleSpec), Rauch/Flammen (emit), Flackerlicht, Humanoid-Animation
    base1.js base2.js  Basis & Wirtschaft (11)
    defense1.js        Verteidigung & Truppen: Kaserne, Krieger, Crawler, Geschützturm, Schildgenerator
    defense2.js        Raumflughafen, Steuerrelais, Radarstation, Forschungsstation, Fackelturm
    worm.js            Wurm-Baukasten → Gezähmter Wurm und Sandwurm
    enemies.js         Plünderer, Panzer, Brecher, Nachtalien, Laserdrohne, Gegnerfestung
    town.js            Stadt-Baukasten: Lehmblöcke, Bögen, Treppen, Fassadenschmuck, Nachtmaterialien (setNight), Schilder
    townHomes.js       Häuser: Lehmhaus, Terrassenhaus, Mietshaus, Blechhütte, Zelt, Ruine
    townCivic.js       Marktstand, Cantina, Laden, Werkstatt, Lagerhalle, Hangar, Wachturm, Kristallturm, Wasserturm,
                       Zisterne, Brunnen, Ziehbrunnen, Gründerstein
    townWall.js        Mauer, Mauerturm, Tor, Kisten, Fässer, Schrott, Bank, Karren, Wegweiser, Strommast, Banner,
                       Sandsäcke, Straßenlaterne, Rohrleitung, Gestrüpp, Felsen, Barrikade, Feuerschale
    *.js               übrige Beispielobjekte (Kategorie "Kulisse & Beispiele")
  city/                Stadt-Modus (siehe unten)
    catalog.js         Welche Arten es gibt (KINDS), Gruppen, und die Variantentabelle (z. B. 56 Lehmhäuser)
    bake.js            Backen: ForgeObject → statische Geometrie je Material (voll + Fern-Fassung) + Grundfläche
    layout.js          Stadtplan-Generator: Viertel, Straßen, Plätze, Mauer, Parzellen, Objekte (deterministisch je Seed)
    ground.js          Bodenkarte (Straßen, Pflaster, Höfe, Ruß) als Textur für den Boden-Shader
    renderer.js        BatchedMesh je Material, Fern-Detailstufen, animierte Gebäude in Kameranähe, Strahl-Auswahl
    index.js           Stadt-Controller: Laden, Kamera-Modi (inkl. Fahren), Kollision, Nachtlichter, Feuer, Auswahl
    ui.js              Orte-Liste, Minimap, Regler, Infokarte, Beschriftungen, Fahrzeug-Anzeige
  gallery/             Fahrzeuge aus der Objekt-Galerie (siehe „Fahrzeuge aus der Galerie“)
    gc.js buggy.js     übernommene Dateien (kleine Anpassungen, im Kopf der Datei vermerkt)
    index.js           Adapter: Lichtstärke, Welt-Schnittstelle, Probelauf + Verschmelzen, Parken
  studio/              Studio: Spiele per Skript in der Stadt (siehe „Studio“)
    game.js            Spiel-Laufzeit: Spieler (Ego), Waffen, Treffer, Einheiten-KI, Pickups, Zonen, Zeitgeber
    api.js             das `game`-Objekt, das Skripte sehen
    units.js           Einheitentypen (soldier, raider, civilian, droid, alien, brute) als Tabelle
    models.js          Modell-Cache: Figur einmal bauen, Probelauf + Verschmelzen, dann billige Klone
    aliens.js          eingebaute Alien-Figur „Skitter“
    weapons.js         Waffentabelle und Ego-Waffenmodell (eigene kleine Szene)
    hud.js             Anzeige im Spiel (Fadenkreuz, Leben, Munition, Pause, Ende)
    layer.js           UI-Ebene: Zeichenfläche über dem Spiel, Widgets (Anker, Größe, Ein-/Ausblenden), Zeichenbefehle
    presets.js         Radar, Balken, Kompass, Knopf, Menü – nur über die öffentliche Skript-Schnittstelle gebaut
    prefab.js          Prefabs: mehrteilige Objekte aus Grundkörpern (Thing, Part, aimAt, muzzle), Modelle für eigene Einheitentypen
    nav.js             Wegsuche: 2-m-Raster, Größenklassen, dynamische Hindernisse, Flächen-Markierung (Erreichbarkeit), A*, Glätten
    world.js           Abfragen: Strahl, Sichtlinie, Bodenhöhe, Bauplatz-Prüfung (auch „Weg bleibt offen“), Blick-Ziel
    effects.js         sichtbare Geschosse, Flächenschaden, Strahlen, Ringe, Partikel-Aufrufe (über core/fx.js)
    ui.js              Studio-Panel: Skriptfeld, Beispiele, Fehleranzeige, Export, Startbildschirm
    examples.js        Beispiel-Skripte (Wellen, Trupp, Mission, Sandkasten, UI, Tower Defense, Torwacht …)
    games/torwacht.fgs großes Beispiel als Textdatei: Tower Defense mit 5 Türmen, 5 Gegnertypen, 10 Wellen (Grafiktest)
    export.js          Export als einzelne HTML-Datei, Speichern (auch im Claude-Fenster)
docs/SKRIPT-HANDBUCH.md  Befehle für Skripte – für neue Chats gedacht
```

### Die 29 Spielmodelle

| Kategorie | Objekte (Modus) |
|-----------|-----------------|
| Basis & Wirtschaft | Quartier, Fließband (Gerade/Kurve/T), Raffinerie, Sammler (`vehicle`), Taufänger, Energiefeld, Energiespeicher, Fabrik, Sandbohrer, Schmelzofen, Kristalldepot |
| Verteidigung & Truppen | Kaserne, Krieger (`character`), Crawler (`vehicle`), Geschützturm, Schildgenerator, Gezähmter Wurm, Raumflughafen, Steuerrelais, Radarstation, Forschungsstation, Fackelturm |
| Gegner & Kreaturen | Plünderer (`vehicle`), Panzer (`vehicle`), Brecher (`vehicle`), Sandwurm, Nachtalien (Schwarm), Laserdrohne (`hover`), Gegnerfestung |

Das Feld `tag` zeigt die Rolle aus der Spieleliste (Basis, Geld, Level 10 …), `hint` die Beschreibung.
Animiert wird in `onFrame` (Lüfter, Radar, Rauch, Flackerlicht, Geschütz, Flügelschlag); Teile mit
`vanish: true` (Schildkuppel, Strahlen) verschwinden beim Explodieren und zählen nicht fürs Einpassen der Kamera.

## Konventionen

- Einheit Meter, Boden bei y = 0, Vorderseite = +Z, rechts = -X.
- Ein Objekt exportiert `{ id, label, category, tag, hint, params, build(obj, p), onFrame?(obj, dt) }`.
- `params`: `range` (min, max, step, value, unit/fmt), `select` (options), `bool`, `seed`.
- Der erste Parameter-Wert ist der Standard. `damage` und `seed` sind Standard-Regler (`_common.js`).
- Alle Zufallswerte aus `mulberry32(p.seed)`, damit "Würfeln" reproduzierbar bleibt.

### Teile hinzufügen

```js
obj.add(box(1, 2, 1, M.metal('rust'), { x: 0, y: 1, dmg: 0.05 }), {
  mass: 40,                 // für Explosion und Modus "rigid"
  surf: 'metal',            // Reibung: metal clay wood rubber cloth body
  collider: 'auto',         // 'auto' | 'none' | { type: 'box'|'sph'|'cyl', size|r|h, offset, axis }
  fracture: [2, 3, 1],      // zerbricht beim Explodieren in 2x3x1 Brocken
  shrink: 0.5,              // verkleinert die automatische Box (bei gebogenen Teilen)
  order: 3,                 // Aufbau-Reihenfolge (Standard: von unten nach oben)
});
```

Hilfsfunktionen: `dmg` = Beulentiefe in Metern, `seed`, `tpm` = Texturkacheln pro Meter.

### Physik-Modi (`obj.mode`)

| Modus       | Verhalten |
|-------------|-----------|
| `static`    | Alle Teile zusammen ein fester Körper (Gebäude, Türme) |
| `rigid`     | Jedes Teil ein eigener Körper (Kisten, Fässer, Trümmer) |
| `vehicle`   | Fahrgestell + Räder (`obj.vehicle = { mass, wheels, ... }`), Räder mit `group: 'wheel'` |
| `hover`     | Federkräfte an Punkten (`obj.hover = { height, points, k, c, thrust }`) |
| `character` | Kapsel mit Bodenprüfung (`obj.character = { radius, height, speed, jump }`), Animation in `onFrame` |

`obj.originY` = Höhe des Schwerpunkts über dem Boden für Fahrzeuge und Gleiter.
Fahrzeugdaten am einfachsten mit `vehicleSpec(masse, räder, { accel, top, steerK, grip, ... })` aus `kit.js`:
`top` = Höchstgeschwindigkeit (m/s), `steerK` = wie stark der Lenkeinschlag mit dem Tempo abnimmt (schwere Fahrzeuge höher,
sonst kippen sie in der Kurve). Räder legt `addWheels` an. Aufbau-Teile mit Position VOR `obj.add` setzen, denn
`add` merkt sich die Ausgangslage für Reset und Aufbau.
`obj.light(light)` hängt ein Licht an, das beim Zerstören ausgeht.

### Neues Objekt

1. `src/objects/meinObjekt.js` anlegen (eine bestehende Datei als Vorlage kopieren).
2. In `src/objects/index.js` eintragen.
3. `npm run build`.

## Bekannte Grenzen

- Aufwand ist auf Wesentliches gelegt: Figuren und Fahrzeuge sind aus Grundkörpern gebaut, nicht gemodelt.
  Für Hero-Assets lohnt sich später ein Mesh aus Blender, das hier nur noch Materialien und Physik bekommt.
- Schatten und Explosionen laufen auf Standard-Hardware flüssig; auf sehr schwachen Geräten die
  Schattenkarte in `atmosphere.js` (`mapSize`) verkleinern.
- Der GLB-Export lädt nur in der lokal geöffneten `dist/index.html` herunter, nicht im veröffentlichten Artifact.


## Stadt-Modus

Beim Öffnen startet die Stadt (`#werkstatt` in der Adresse startet stattdessen die Werkstatt; `#stadt/42` startet die Stadt mit Seed 42).
Oben schaltet man zwischen **Stadt** und **Werkstatt** um. Die Stadt besteht aus **allen 37 Objekten der Werkstatt**
(29 Spielmodelle + 8 Beispielobjekte) und 35 Stadt-Bausteinen, jeweils in vielen Varianten, zusammen rund 1.400
Platzierungen, davon ca. 580 Gebäude, in 12 Vierteln innerhalb einer Mauer mit vier Toren und einem Vorland.

### Wie sie entsteht

1. `catalog.js` legt je Art Parametersätze (Varianten) fest, z. B. 56 Lehmhäuser mit Zustandsstufe (verfallen / gewöhnlich / gepflegt).
2. `bake.js` baut jede Variante einmal als echtes `ForgeObject`, fasst die Teile je Material zu einer Geometrie zusammen
   (plus eine vereinfachte Fern-Fassung) und misst die Grundfläche. Dauert beim Start ca. 3 s.
3. `layout.js` entwirft den Plan: gewichtetes Voronoi für die Viertel, Hauptachsen, zwei Ringstraßen, Radialen, Raster in
   Werks- und Garnisonsviertel, Gassen, Plätze, Mauerring mit Toren; dann Sonderbauten (Raumhafen, Hauptquartier, Fabriken …),
   Häuserzeilen an Plätzen und Straßen, Auffüllen nach Viertel-Rezept (`MIX`), Requisiten, Fahrzeuge, Figuren und das Vorland.
   Alles ist **deterministisch je Seed**; die Platzierungen überlappen sich nicht (OBB-Tests mit Raster-Hash).
4. `renderer.js` zeichnet alles mit `THREE.BatchedMesh` (ein Draw-Call je Material, ca. 250 Materialien), schaltet je
   Entfernung auf die Fern-Fassung und ersetzt die animierten Schwergewichte (`live: true` im Katalog: Raffinerie, Raumhafen, Radar,
   Würmer, Fahrzeuge …) in Kameranähe durch echte, animierte Objekte.
5. `ground.js` zeichnet Straßen, Pflaster, festgestampfte Höfe und Ruß in eine Textur, die der Boden-Shader liest.

### Daten für das Spiel

`generateCity()` liefert (alles in Metern, Norden = −z, Osten = +x, Boden y = 0):

```js
city.placements[]   // { id, kind, vi, x, y, z, ry, sx, sy, sz, d (Viertel), live, solid, ob, tag, hero, blocks? }
//   ob = Kollisionsbox (OBB): { x, z, hx, hz, c, s, h }  c = cos ry, s = sin ry; lokale Achsen u = (c, −s), v = (s, c)
city.roads[]        // { name, pts: [[x, z]...], hw (halbe Breite), cls: main|ring|radial|grid|alley|out, L, closed }
city.plazas[]       // Kreise und Rechtecke
city.pois[]         // Sehenswürdigkeiten: { name, x, z, kind, desc, d }
city.lights[], city.fires[]   // Laternen/Feuer mit Position, Farbe, Stärke
city.districtAt(x, z)         // Viertel-Kennung oder null
```

`CityMode.collide(x, z, radius)` schiebt einen Kreis aus allen festen Gebäuden hinaus (Spaziergang nutzt das);
dieselben Boxen sind unter Anzeige → „Collider-Boxen“ sichtbar. Auf dieser Grundlage lassen sich später Spielfigur,
Fahrzeuge, Wegfindung und Aufträge setzen.

### Bedienung

- **Übersicht**: Ziehen dreht, Rechtsklick/Zwei Finger verschiebt, Mausrad zoomt. Klick auf ein Haus zeigt die Infokarte.
- **Flug**: W/A/S/D, Q/E hoch/runter, Shift schneller, Maus ziehen = umsehen.
- **Spaziergang**: W/A/S/D, Shift rennen, Gebäude und Mauern sind fest; die Tore sind offen.
- **Fahren** (Taste 4): der Buggy „Skarab“ aus der Objekt-Galerie. W/S Gas und Bremse (aus dem Stand: rückwärts), A/D lenken, Leertaste Handbremse (driften), Shift Boost, Maus ziehen = umsehen (kehrt beim Fahren von selbst zurück), Mausrad = Abstand. Knöpfe: Licht (nachts automatisch), Boost-Düse, Rundfahrt, Schwerkraft. Der Wagen steht anfangs an einer breiten Straße nahe dem Stadtplatz (türkiser Pfeil im Stadtplan); beim Einsteigen holt ihn die Kamera heran, wenn er weiter als 30 m weg steht. Auf dem Handy: Steuerkreuz plus HB (Handbremse) und ⚡ (Boost). Stadtplan-Klick versetzt den Wagen.
- **Rundflug**: automatische Kamerafahrt an den Sehenswürdigkeiten entlang; jede Eingabe beendet ihn.
- Tasten 1–5 wechseln den Modus (im Spiel gelten die Tasten für das Spiel) (1 Übersicht, 2 Flug, 3 Spaziergang, 4 Fahren, 5 Rundflug), `H` = Gesamtansicht, `Esc` hebt die Auswahl auf.
- Links: Viertel und Sehenswürdigkeiten (Klick = hinfliegen). Unten links: Stadtplan (Klick/Ziehen = Kamera versetzen).
- Rechts: Seed („Neue Stadt“), Uhrzeit 0–24 h, Tag-Nacht-Zyklus, Staub, zwei Sonnen, Schmutz, Anzeige-Optionen.

### Fahrzeuge aus der Galerie (`src/gallery/`)

Der Buggy stammt aus einem anderen Projekt („Objekt-Galerie“, Dateien `common.js` + `buggy.js`, gebaut gegen eine ältere three.js).
`gallery/index.js` ist der **Adapter**, der solche Dateien unverändert weiterverwendet:

- `gc.js` = die alte `common.js` als Modul (nur `encoding` → `colorSpace`, `encodings_fragment` → `colorspace_fragment`).
- `buggy.js` = die alte Datei mit `export default ({…})` statt `Gallery.add({…})`; zusätzlich fragt sie über `opts.world.obsAt(x, z)` die
  Gebäude ab und dreht sich nie in ein Hindernis hinein.
- Der Adapter reicht eine three-Kopie durch, deren Punkt- und Spotlichter ihre Helligkeit mit `LIGHT_K` malnehmen (alte Einheiten → neue).
  Die Lichter bleiben immer in der Szene (Intensität 0 am Tag), damit sich beim Umschalten keine Shader neu übersetzen.
- **Probelauf + Verschmelzen**: beim Bauen wird der Wagen kurz mit allen Eingaben gefahren; Teile, die sich nie bewegen, werden je Material zu
  einem Netz verschmolzen (Buggy: 290 → 110 Meshes). Bewegte Teile (Räder, Federung, Lenkrad, Flagge …) bleiben einzeln.
- **Maßstab**: `GALLERY.buggy.scale` (jetzt 0,5 = halb so groß wie in der Galerie). Das Modell rechnet in seinem alten Maßstab in einer skalierten
  Gruppe; Zeit läuft mit 1/√scale schneller, Lichtreichweite und -stärke werden angepasst. `camK` stellt den Kameraabstand ein.
  Größer/kleiner = nur diese Zahl ändern und `npm run build`.
- Welt-Schnittstelle: `world.heightAt(x, z)` (Gelände), `world.obsAt(x, z)` (Gebäude, `CityMode.obstacleAt`), `world.shake` (Kamerarütteln).
- `CityMode.actor` ist der Wagen; `placeActor(x, z, ry)` stellt ihn an die nächste freie Stelle, `findSpot` sucht sie.

Neues Fahrzeug: Datei nach `src/gallery/` kopieren, `Gallery.add({` → `export default ({`, `encoding`-Reste prüfen, in `GALLERY` eintragen (Größe `hw`/`hl`
für die Stellplatz-Suche). Bodenfahrzeuge mit der Eingabe `{ sx, sy, jump, boost }` laufen ohne weiteres; Flugzeuge/Roboter brauchen noch eine eigene Steuerart.

## Studio

Oben der Reiter **Studio**: die Stadt mit einem Skript-Panel rechts. Ein Skript (JavaScript, Befehle siehe `docs/SKRIPT-HANDBUCH.md`) beschreibt ein Spiel;
„▶ Spielen“ startet es dort, wo die Kamera hinschaut (Ego-Ansicht). „Als Spiel exportieren“ speichert eine einzelne HTML-Datei
(Stadt + Programmcode + Skript + Startbildschirm), die per Doppelklick offline läuft.

- Laufzeit in `src/studio/game.js`, Stadt liefert nur Kollision (`CityMode.collide`) und Sichtlinien (`CityMode.raycastWorld`); Kameramodus `'play'`.
- UI-Ebene (`layer.js`): eine Canvas-Fläche über dem Spiel, auf der Skripte mit `game.ui.widget({...draw(g){…}})` beliebige Anzeigen zeichnen; Radar/Balken/Kompass (`presets.js`)
  sind nur Vorlagen auf derselben Schnittstelle. Winkel in der Ebene: 0 = oben, Uhrzeigersinn; Welt-Winkel: Kompass (0 = Norden). Test-Schalter `window.__forgeLayerCpu = true`
  macht die Fläche CPU-basiert, damit sich Pixel ohne Grafikkarte lesen lassen.
- Einheiten sind Figuren aus der Werkstatt (Krieger, Wanderer, Droide, dazu der eingebaute Skitter). `models.js` baut jedes Modell einmal,
  erkennt bewegte Teile per Probelauf, verschmilzt den Rest (Krieger 38 → 21 Meshes) und erzeugt Einheiten als Klone mit gemeinsamer Geometrie.
- Neuer Einheitentyp: Eintrag in `units.js`. Neues Modell: Figur mit `obj.mode = 'character'` (Blickrichtung +Z, `obj.character.speedNow` treibt die Beine) in
  `models.js` mit `registerModel(id, def)` eintragen.
- Export: `build.mjs` bettet die Vorlage als `__TEMPLATE__` in den Programmcode ein; der Export setzt Vorlage + laufenden Programmcode (`#forge-bundle`)
  + `<script id="game-data">` zusammen. Beim Start erkennt `main.js` die Spieldaten und zeigt nur den Startbildschirm (`body.player-only`).
- Tests im Browser ohne Grafikkarte: `__forge.game.start(code)`, danach `__forge.city.update(0.05)` in einer Schleife; `__forge.game.units`, `.player`.

- Version/API: `API_VERSION` (`'0.4.0'`) und `API_LEVEL` (4) in `src/studio/spec.js`; `game.capabilities` zählt auf, was es gibt (Skripte prüfen mit `game.has(name)`). Neue Fähigkeit = Eintrag in `spec.js` (`CAPS`, `NS`/`TYPES` für Signaturen) + Abschnitt im Handbuch, dann `npm run docs`.
- Interaktive Widgets: Zeiger-Ereignisse hört `layer.js` am Fenster (Capture, vor dem Spiel); nur bei freier Maus. `game.pause()` setzt `scriptPause` (Simulation steht, UI läuft), `game.resume()` fängt die Maus wieder.
- Prefab-Objekte (`game.things`) mit `solid` sind Kreis-Hindernisse für Spieler, Einheiten und Wegsuche; mit `hp` + `team` sind sie Ziele. Eigene Einheitentypen (`defineKind`) laufen durch dieselbe KI.
- Spielstand: JSON im Browser (`localStorage`, Schlüssel `forge-save:<Hash des Skripts>:<Platz>`).
- Tests im Browser: Zeigersperre braucht zwischen Freigeben und Fangen etwas Zeit; Tests mit Pause/Fortsetzen im Millisekundenabstand lassen den Headless-Browser Gigabyte-weise Speicher belegen (Testartefakt), deshalb zwischen Tastendrücken ~0,8 s warten.

Stand v0.4 (Erweiterungsebene): Einzelspieler; dazu **Module** mit Lebenszyklus und automatischem Aufräumen (`ext.js`), **Eingabe-Aktionen/Kontexte, Kameras und Steuerungen** (`control.js`: Ich-Ansicht, Vogelperspektive, freie Kamera, eigene),
**eigene Objekte** mit Trefferzonen, `build`-Funktion oder GLB-Modell (`prefab.js`), **Modelle (GLB) und Instancing** (`assets.js`; Import und Vorschau: `modelio.js`, `preview.js`), Zeit-Vertrag, Diagnose (`game.stats`/`game.diag`), Spielstand v2 mit stabilen Nummern, offener Expertenzugang `game.ext`.
Noch nicht: Touch, Gamepad, steuerbare Fahrzeuge, Third-Person-Kamera, Physik-Bibliothek, Mehrspieler (WebRTC) – siehe `game.planned`.

### Dokumentation (drei Ebenen, eine Quelle)

| Datei | Zweck |
|---|---|
| `docs/SKRIPT-HANDBUCH.md` | kompakt für KI und Einsteiger (Beispiele, Muster) |
| `docs/EXPERTEN-REFERENZ.md` | Verträge: Module, Eigentum, Zeit, Kameras, Modelle, Kollision, Spielstand, Expertenzugang, Grenzen, was getestet wurde |
| `docs/api.json`, `docs/forge.d.ts` | maschinenlesbar (Signaturen, Typen, Fähigkeiten, Ereignisse); erzeugt aus `src/studio/spec.js` |

```
npm run docs                    # docs/api.json + docs/forge.d.ts aus spec.js erzeugen
npm test                        # statische Prüfung der Signatur-Quelle (ohne Browser)
python3 tools/check-live.py     # Abgleich mit dem laufenden Spiel (Playwright + Chromium; vorher npm run dev)
```

### Abhängigkeiten und Offline-Export

three 0.186.1 (WebGLRenderer), cannon-es 0.20.0 (nur Objekt-Werkstatt), esbuild 0.28.2 (Build). Der Export ist **eine** HTML-Datei ohne Netzwerkanfragen: Schriften fallen auf Systemschriften zurück (die Google-Fonts-Verweise entfallen beim Export), Projektmodelle (GLB) sind als Base64 eingebettet. Das einzige Netzwerk im Code ist `game.assets.load(id, url)` – nur wenn ein Skript selbst eine URL angibt. Modelle: nur `.glb` ohne Draco/Meshopt/KTX2. Der Spielstand liegt im `localStorage`, die Studio-Modelle in IndexedDB (beides optional).

### Grenzen der Erweiterungsebene (ehrlich)

Kein Sandkasten: Module und `game.ext` laufen mit den Rechten der Seite. Die Stadt ist unveränderlich (Inhalt, kein Baukasten). Getestet wurde im Browser ohne Grafikkarte (SwiftShader) mit dem echten Bundle; **Bildraten auf echter Hardware (MacBook) und Safari/Firefox sind nicht gemessen**. Einzelheiten: `docs/EXPERTEN-REFERENZ.md`, Abschnitte 11, 13 und 14.

### Neue Art in die Stadt bringen

1. Objekt in `src/objects/` bauen und in `objects/index.js` eintragen (wie in der Werkstatt).
2. In `city/catalog.js` unter `KINDS` eintragen (Name, Gruppe, Typ, Farbe) und in `buildVariantTable()` Varianten erzeugen.
3. In `city/layout.js` entweder in die `MIX`-Rezepte eines Viertels aufnehmen oder als Sonderbau/Requisit gezielt setzen.
4. `npm run build`.

### Leistung

Auf einer normalen Grafikkarte reichen rund 400–600 Draw-Calls (der Buggy kommt mit Schatten rund 200 dazu; er ruht außerhalb der Sichtweite). Wer weniger braucht: Anzeige → „Schatten“ ausschalten,
„Detailstufen-Distanz“ verkleinern, „Animierte Gebäude in der Nähe“ ausschalten. Die Schattenkarte (4096²) steht in `atmosphere.js`.
