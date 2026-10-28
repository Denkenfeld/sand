# Desert Forge – Expertenreferenz (Erweiterungsebene)

Stand: Version 0.4.0, API-Stufe 4, Expertenvertrag `game.ext.contract = 1`. Diese Datei beschreibt **Verträge** – was die Engine zusichert, was sie nicht zusichert und was ein Modul selbst verantworten muss. Die kompakte Einstiegsebene ist `docs/SKRIPT-HANDBUCH.md`; alle Signaturen stehen maschinenlesbar in `docs/api.json` und `docs/forge.d.ts` (erzeugt aus `src/studio/spec.js` mit `npm run docs`, geprüft mit `python3 tools/check-live.py` gegen das laufende Spiel). Geplantes und Umgesetztes sind getrennt: Geplantes steht nur in Abschnitt 14 und in `game.planned`.

## 1. Versionen, Abhängigkeiten, Export

| Baustein | Version | Rolle |
|---|---|---|
| three.js | 0.186.1 (`game.ext.versions.three` = `'186'`) | Darstellung, `WebGLRenderer` (kein WebGPU) |
| cannon-es | 0.20.0 | nur im Objekt-Baukasten (Forge-Ansicht); **keine** Skript-Physik |
| esbuild | 0.28.2 | Build; Ergebnis ist **eine** HTML-Datei (`dist/index.html`, minifiziert mit `npm run build`) |

Der Export (`Studio → Als Spiel exportieren`) enthält Seite, Programmcode, Stadt-Seed, Skript und alle Projektmodelle (GLB, Base64) in einer Datei und stellt **keine Netzwerkanfragen**: die Schriften-Verweise (Google Fonts) der Vorlage werden beim Export entfernt, es gelten die Systemschriften der CSS-Liste. Es gibt keine versteckten CDN-Nachladungen; das einzige Netzwerk im Code ist `game.assets.load(id, url)` – wer dort eine URL angibt, braucht beim Spielen Internet (im Export deshalb Modelle über „Modelle (GLB)“ einbetten). Der Spielstand liegt im `localStorage` des Browsers, Projektmodelle im Studio in IndexedDB (beides optional: bei Fehlern arbeitet die Sitzung ohne).

## 2. Module: Lebenszyklus-Vertrag

```
game.module(name, def) → new ─(flush: nach dem Skript, Abhängigkeiten sortiert)→ loading ─init() (async möglich)→ ready ─enable()→ active
active ─disable()→ ready      Fehler in init/enable → failed (Meldung, andere Module laufen)      remove()/Neustart/Stopp → dispose() → disposed
```
- **Registrierung** ist sofort, das Starten geschieht gesammelt nach dem Skriptlauf (`flush`); in laufenden Spielen startet ein später definiertes Modul sofort. Reihenfolge: topologisch nach `deps`, sonst Definitionsreihenfolge. Fehlende oder zyklische Abhängigkeit → `failed` mit lesbarer Meldung. Doppelter Name → Hinweis, das zweite wird ignoriert.
- `init` läuft einmal und darf ein Promise liefern (Modelle laden); solange es läuft, bleibt das Modul `loading`, abhängige warten. `auto: false` lässt ein Modul in `ready`, bis `game.modules.enable(name)` kommt.
- Wird eine Abhängigkeit ausgeschaltet, ruht jedes abhängige Modul (`ready`, Wunsch bleibt gemerkt) und startet mit ihr wieder.
- `update(ctx, dt)` nur im laufenden Spiel (nicht in der Pause), `frame(ctx, rdt)` in jedem Bild. Ein Fehler in `update`/`frame` meldet den Fehler und schaltet **nur diesen Hook** des Moduls ab, nicht das Modul.
- `ctx.state` (aus `state: {…}`) wird gespeichert und geladen; `version` markiert das Format; bei abweichender Version wird gewarnt und soweit passend übernommen. Wer mehr Kontrolle will, liefert `save(ctx)`/`load(ctx, data, savedVersion)`.

### Eigentum und Aufräumen

Jedes Modul hat zwei Bereiche: den **Aktivierungsbereich** (lebt von `enable` bis `disable`) und den **Instanzbereich** (von `init` bis `dispose`). Was im `enable`/`update`/`frame`/in Handlern über `ctx` angelegt wird, gehört der Aktivierung; was in `init` angelegt wird, der Instanz. Beim Ausschalten bzw. Entfernen wird eingesammelt:

| über `ctx` angelegt | wird beim Ausschalten |
|---|---|
| `ctx.on` (Ereignis-Handler), `ctx.every/after/fixed`, `ctx.tween` | beendet |
| `ctx.place` (Things), `ctx.spawn` (Einheiten), `ctx.zone` | entfernt |
| `ctx.ui.widget/menu/…`, `ctx.hudSet` | entfernt |
| `ctx.input.action/axis`, `ctx.camera.create`, `ctx.controller.define` | entfernt (läuft dabei die eigene Steuerung, wechselt das Spiel zu `ego`) |
| `ctx.model(...)`, `ctx.instanced(...)` | Instanz freigegeben bzw. Gruppe entfernt |
| `ctx.add(obj3d)` / `ctx.root` | aus der Szene genommen, Geometrien/Materialien freigegeben (außer als `userData.shared` markierte) |
| `ctx.own(x)` | `x` ist eine Funktion (wird gerufen), ein `Object3D` (freigegeben) oder hat `dispose()`/`cancel()` |

**Nicht** dem Modul gehören: Prefab-Definitionen (`game.prefab`), Einheitentypen (`defineKind`), Waffen (`weapons.define`), Team-Einstellungen (`setHostile`, `teamColor`), geladene Modelle (gehören dem Projekt, `assets.release`), direkte `game.hud.set`-Zeilen und alles, was über `game.…` statt `ctx.…` angelegt wurde. Das ist Absicht (Definitionen sind global) und steht hier, damit niemand Aufräumen erwartet, das es nicht gibt. Getestet: 30× Ein-/Ausschalten, Neustart, Stopp und 5× Laden ohne wachsende Zahl von Handlern, Zeitgebern, Widgets, Eingaben und Objekten (`game.stats().systems`).

## 3. Zeit-Vertrag

- **Simulationszeit** `game.time` / `game.clock.sim`: läuft nur im Spielzustand `playing`, mit Faktor `game.timeScale` (0 … 4). **Echte Zeit** `clock.real`, `rdt`: läuft immer (auch in der Pause).
- Je Bild, in dieser Reihenfolge: Eingabe-Kanten → Tweens (UI/„realtime“ mit `rdt`, andere mit `dt`) → 3D-Effekte → *(nur playing)* Modell-Animationen → Objekte (`update`-Hooks) → Steuerung → Einheiten → Darstellung → Projektile → Aufsammelbares → Zonen → `fixed` → Zeitgeber → Module `update` → Ereignis `update` → Kamera der Steuerung → Module `frame` → UI-Zeichnen → Diagnose.
- `game.fixed(hz, fn)`: Akkumulator mit Obergrenze 5 Schritten je Bild (danach verfällt der Rest – kein Aufholen bis ins Unendliche). Zeitgeber teilen sich die Simulationszeit: in der Pause oder bei `timeScale = 0` stehen sie.
- **Pause**: Simulation, Einheiten, Projektile, Zeitgeber, Modell-Animationen stehen; UI, `frame`-Hooks und UI-Tweens laufen. Skript-Pause (`game.pause()`, z. B. Menü) und Esc-Pause sind verschieden: bei Skript-Pause kommen Tasten als `key`, Esc als `cancel`.

## 4. Eingabe-Vertrag

Aktionen und Achsen (`game.input`) sind benannte Zustände mit Quellen. Zustände: gehalten, in diesem Bild gedrückt/losgelassen (Kanten werden zu Bildbeginn eingefroren, also auch bei mehreren Ereignissen je Bild stabil), Wert. **Kontexte** (`ego`, `topdown`, `free`, eigene per `push/pop`, automatisch `menu` bei Skript-Pause/Pause/Ende) filtern, welche Aktionen wirken; `context: '*'` (Standard) = jeder außer `menu`. **Oberfläche hat Vorrang:** ein Klick auf ein Widget erzeugt keine Maus-Aktion. **Fokusverlust** (`blur`, `visibilitychange`) setzt alle gehaltenen Eingaben zurück. Fehlende Geräteprofile: **Touch und Gamepad sind nicht umgesetzt**; `game.input.virtual(name, wert)` ist die vorbereitete Einspeisung und wird von Aktionen wie von Tasten gelesen, hat aber keine Oberfläche dazu.

## 5. Kameras und Steuerungen

- Die Hauptkamera (`game.ext.camera`) bleibt **immer perspektivisch** und folgt der aktiven Kamera (Position, Blickrichtung, Sichtfeld): Himmel, Stadt-Detailstufen, Schatten und Nebel hängen an ihr. Orthografische Kameras (`type: 'orthographic'`) werden mit einer eigenen Kamera gezeichnet; die Engine hält die perspektivische Hauptkamera dabei synchron. Wer die Hauptkamera selbst verstellt (`ext.camera.position.set`), wird im nächsten Bild vom aktiven Controller überschrieben.
- Eine **Steuerung** (`controller`) = Eingabekontext + Cursor (`locked`/`free`) + Spielerrolle (`active` bewegt den Spieler, `idle` lässt ihn stehen, `off` blendet ihn aus und macht ihn zum Geist) + Hooks (`enter`, `exit`, `update`, `camera`, `pointer`, `view`). `view(cc)` meldet der Stadt, wo Detailstufen, Schatten und Nachladen gelten sollen (in der Vogelperspektive: der Blickpunkt, nicht der Spieler).
- **Wechsel** (`controller.use/toggle`): alter Controller `exit`, Zeiger-Sperre je nach `cursor` gesetzt oder gelöst, Eingabekontext getauscht, HUD-Element (Fadenkreuz/Munition/Leben) für freie Ansichten ausgeblendet, Ereignis `controller`. In Steuerungen mit freier Maus pausiert Esc, ein zweites Esc setzt fort. Verweigert der Browser die Zeiger-Sperre (eingebettete Fenster), gilt der normale Pausenbildschirm.
- Umrechnung: `camera.project` (Welt → Bild), `camera.ray`/`pick` (Bild → Welt; Umlauf mit unter 1,5 px Abweichung getestet, perspektivisch und orthografisch). `pick` liefert zusätzlich `ground` (Boden unter dem Zeiger), auch wenn ein Gebäude getroffen wurde.
- Eingebaut: `ego`, `topdown`, `free`. **Nicht vorhanden:** Third-Person-Controller, Fahrzeug-Controller, Touch-/Gamepad-Steuerung (Abschnitt 14).

## 6. Darstellung, Modelle, Instancing

- Eigene Geometrie/Materialien über `build(thing, { THREE })` oder `ctx.add`. Gemeinsame Ressourcen (Geometrien, Materialien, Texturen, die mehrere Objekte teilen) müssen `userData.shared = true` tragen, sonst gibt die Aufräumlogik sie mit dem ersten Besitzer frei. Geladene GLB-Modelle setzen die Markierung selbst.
- **GLB-Vertrag:** glTF 2.0 als `.glb`, Einheit Meter, Vorwärts `+z` (Korrektur `forward`), Ursprung am Boden (`origin`), `height`/`scale`. **Nicht unterstützt:** Draco, Meshopt, KTX2 (nötige WASM-Decoder würden den Offline-Export aufblähen). `assets.load` liest nur eingebettete Daten; das Studio packt `.gltf` + `.bin`/Bilder bzw. `.zip` beim Import selbst zu einer eingebetteten `.gltf` (`src/studio/modelio.js`, entpackte Archivgröße auf 300 MB begrenzt, `__MACOSX` ignoriert). **Standardwerte:** `assets.setDefaults(id, { height, scale, forward, origin })`; ein Aufruf von `assets.model` / `ctx.model` / Prefab-`model` nutzt sie für alles, was er nicht selbst angibt (die Studio-Vorschau schreibt sie, der Export trägt sie als `def` je Modell in `game-data`). Ladefehler liefern eine lesbare Meldung samt Hinweis. Materialien/Texturen kommen aus der Datei; Instanzen teilen sie (`ownMaterials: true` kopiert sie, z. B. zum Einfärben).
- **Animation:** `AnimationMixer` je Instanz, Zeit = Simulationszeit (in der Pause stehen Animationen). `play(name, { loop, speed, fade, weight })`.
- **Lebensdauer:** ID → Modell (Cache, gehört dem Projekt); Instanzen gehören dem Erzeuger (Objekt/Modul) und werden mit ihm freigegeben; `assets.release(id)` verweigert, solange Instanzen leben (`force: true` räumt auch sie ab). Beim Neustart bleiben geladene Modelle erhalten, Instanzen nicht.
- **Instancing:** `game.instanced` → ein `THREE.InstancedMesh` mit fester Platzzahl `max`; ein Zeichenaufruf (getestet: 500 Instanzen, ≤ 3 Zeichenaufrufe mehr). Eigene Shader: über `ext.THREE` (`ShaderMaterial`) auf eigene Verantwortung; die Engine kennt dafür keine Hooks.
- **Export:** Modelle stecken als Base64 in `game-data` (Größe ≈ 1,33 × Dateigröße); beim Klick auf „Spielen“ im Export werden sie geladen, bevor das Skript startet.

## 7. Verhalten, Bewegung, Kollision, Trefferzonen

- **Kollision** der Welt = die festen Gebäude-Boxen der Stadt + Stadtrand. `thing.walk(dx, dz, { radius })` schiebt einen Kreis dagegen und liefert `{ moved, blocked }`; **andere Objekte und Einheiten blockieren nicht** (nur `solid` blockiert Spieler, Einheiten und Wegsuche). Wer mehr will (Objekt–Objekt), baut es im Modul mit `thing.hitVolumes()`/`game.things()`.
- **Bewegungsvertrag eigener Objekte:** x/z/yaw ändern → `thing.sync()` (oder `move`/`walk`/`set`, die es rufen); danach folgen Darstellung und Trefferzonen. Teile (`parts`) und `follow`-Objekte werden bei jeder Abfrage aktuell gelesen (pro Bild zwischengespeichert; `sync` und Zeitfortschritt entwerten den Cache).
- **Trefferzonen** (`hits`): Kugel (`r`) oder Kapsel (`pos` → `to`), lokal zum Objekt oder zu `part`/`follow`. Strahlen (`world.cast`, Spieler-Hitscan), `game.shoot` (Strecke je Bild gegen die Zonen, kein Durchtunneln) und `game.explode` (Abstand zur *nächsten* Zone) treffen Zonen und übergeben `zone` und `mult` (Schaden × `mult`). Ohne `hits` gilt ein Zylinder (`radius`, `height`). Der Ablauf bei Schaden: `onDamage(thing, { amount, by, zone })` kann abbrechen (`false`) oder umschreiben (Zahl) → `hp` sinkt → Ereignis `thingHit` → bei 0 Ereignis `thingDestroyed` und `onDestroy`.
- **Physik:** keine Bibliothek ist ins Spiel eingebunden. Ein Modul kann eine eigene Physik (z. B. cannon-es, über `import` im eigenen Bundle – im Studio nicht möglich) in `game.fixed(…)` schrittweise rechnen und Ergebnisse per `thing.walk/move` zurückschreiben; als gemeinsame Schnittstelle gilt: Physik besitzt ihre Körper, das Spiel besitzt Objekte und Trefferzonen. Das ist ein Konzept, **nicht umgesetzt**.

## 8. Die Stadt als Inhalt

Gebäude, Straßen und Mauer entstehen aus dem Seed und sind **unveränderlich** (`ext.collide`/`obstacleAt` lesen sie, nichts schreibt sie). Skripte setzen Objekte, Einheiten, Zonen, Pickups, Effekte und Kameras *in* die Stadt; sie benutzen `game.city.poi/randomOpenPoint/districtAt` für Orte. Eine begehbare Innenwelt, Dächer oder Gebäude-Umbau gibt es nicht; eine eigene Welt (Dungeon, Arena) wäre ein Modul, das eigene Geometrie in `ctx.root` baut und die Stadt ausblendet – die Engine bietet dafür keinen Schalter.

## 9. Spielstand-Vertrag (Format 2)

- `save()` liefert ein reines JSON-Objekt: Spieler, Einheiten, Pickups, Things (mit `id`, `owner`, `data`, Teilstellung, optional `custom` aus `def.save`), Modulzustände (`modules[name] = { v, data }`), Punkte, Abschüsse, Zeit, `nextId`, `extra`. Funktionen werden nie gespeichert; nicht serialisierbare Daten erzeugen einen Hinweis statt eines kaputten Spielstands.
- `load()` nimmt `v: 1` und `v: 2`, lehnt neuere Formate ab (Hinweis) und weist Unbekanntes sichtbar aus (Module im Spielstand ohne Modul im Skript, Versionsunterschiede). Ablauf: Welt leeren → Spieler/Einheiten/Pickups/Things neu anlegen (Nummern und Besitzer wiederherstellen, `def.load`) → Nummernvergabe fortsetzen → Modulzustände laden → Ereignis `load`.
- **Eigentum nach dem Laden:** Objekte mit `owner` gehören wieder dem Modul, wenn es aktiv ist (Instanzbereich: `'name (Modul)'`).
- **Nicht gespeichert** (also nach dem Laden zu rekonstruieren): Projektile, Partikel und Effekte, Tweens, Zeitgeber und Handler (gehören dem Skript/Modul und bleiben bestehen), Widgets, Kameras, Steuerung (selbst merken, siehe Beispiel „Kamera-Modul“), Aufträge (`goTo`), `ctx.root`-Inhalte, Modell-Instanzen von Modulen, Zustände eigener Objekte außerhalb von `data`/`custom`.
- **Wiederholtes Laden** verdoppelt nichts (getestet: 5× laden, gleiche Zahl von Handlern/Zeitgebern/Widgets) und löst keine Belohnung erneut aus, solange Belohnungen am gespeicherten Zustand hängen. Der Speicherplatz im Browser gilt je Skript (Hash des Skripttexts).

## 10. Expertenzugang (`game.ext`)

`game.ext = { contract: 1, versions, THREE, scene, renderer, camera, collide(x, z, r), obstacleAt(x, z, margin) }`.

- **Das ist kein Sandkasten.** Ein Modul mit `ext` kann alles in three.js und im DOM tun, auch Dinge, die das Spiel zerstören. Die Engine verhindert das nicht.
- **Besitz:** Szene, Lichter, Himmel, Nebel, Umgebungsbeleuchtung, Schatten und Renderer-Einstellungen gehören der Engine; die Hauptkamera dem aktiven Controller; Objekte, die ein Modul anlegt, dem Modul (`ctx.add`, `ctx.root`).
- **Verboten (nicht erzwungen):** `renderer.dispose()`/`setSize`/`setPixelRatio`, `scene.clear()` oder Objekte entfernen, die einem nicht gehören, `scene.environment/fog/background` ändern, `renderer.info.autoReset` ändern, eigene `requestAnimationFrame`-/`setAnimationLoop`-Schleifen (stattdessen `frame`-Hook), Hauptkamera-Matrizen von Hand pflegen, Engine-Objekte (`ext.scene.children`) umhängen, geteilte Geometrien/Materialien von Modellen verändern oder freigeben.
- **Neustart:** `game.restart()`, Stopp und Neustart des Studios entsorgen alle Module (Aufräumen wie in Abschnitt 2); Objekte, die ein Modul *am Eigentumssystem vorbei* in die Szene gehängt hat (direkt über `ext.scene`), kennt die Engine nicht und räumt sie nicht verlässlich ab. Wer `ext` so benutzt, entsorgt in `disable`/`dispose` selbst.
- **Stabilität:** `contract` steigt bei Brüchen des Expertenzugangs. Die three.js-API kann sich mit `versions.three` ändern; Code gegen `ext` ist an diese Version gebunden. Renderer ist `WebGLRenderer`; `renderer.info` zählt ein ganzes Bild (die Engine setzt es je Bild zurück).

## 11. Diagnose und Grenzen

`game.stats({ scene })` und `game.diag()` zeigen: Bildzeiten (Mittel, p95, Maximum der letzten Bilder), Simulationsdaten, Objektzähler (Einheiten, Things, Geister, Aufsammelbares, Zonen, Projektile, Strahlen, Ringe, Spuren, Instanzen), Systeme (Module, Handler, Zeitgeber, `fixed`, Tweens, Widgets, Eingaben), Darstellung (Zeichenaufrufe, Dreiecke, Geometrien, Texturen, Programme), Modelle (Anzahl, Instanzen, Dateigröße, Dreiecke) und `limits`. Dokumentierte Grenzen: 70 lebende Einheiten (konfigurierbar im Code, nicht im Skript), 60 Spuren (Tracer), Partikel in festen Ringpuffern (die ältesten werden überschrieben), Projektile unbegrenzt mit 6 s Lebensdauer, Instanzgruppen fest bei Anlage (`max` ≤ 20 000), `fixed` ≤ 5 Schritte je Bild, Wegsuche 2-m-Raster bis 360 m. **Es gibt keine pauschalen Leistungsversprechen:** Bildraten hängen vom Gerät ab und wurden auf echter Hardware nicht gemessen.

## 12. Dokumentationsebenen und Pflege

1. `docs/SKRIPT-HANDBUCH.md` – kompakt, Beispiele, Fehlerbilder; für KI und Einsteiger.
2. `docs/EXPERTEN-REFERENZ.md` – diese Datei: Verträge, Besitz, Grenzen.
3. `docs/api.json`, `docs/forge.d.ts` – maschinenlesbar, **eine Quelle** (`src/studio/spec.js`: `NS`, `TYPES`, `CAPS`, `EVENTS`, `PLANNED`). `npm run docs` erzeugt sie, `npm test` prüft die Quelle (Typnamen, Duplikate, Beschreibungen), `python3 tools/check-live.py` gleicht sie mit dem laufenden Spiel ab: dokumentierte Pfade müssen existieren, vorhandene öffentliche Mitglieder (auch von Objekt, Einheit, Widget, Menü, Kamera, Modell-Instanz, Instanzgruppe, Modul und `ctx`) müssen dokumentiert sein. So entstehen keine erfundenen und keine undokumentierten Methoden.

## 13. Was geprüft wurde (und womit)

Unterschieden wird: **statische Prüfung** (Syntax/Build, `npm test`, `tsc --strict` auf `forge.d.ts`), **Tests im echten Spiel** (Chromium ohne Grafikkarte/SwiftShader, echtes Bundle, echte Engine – keine Attrappen für Spiellogik; nur die Zeiger-Sperre des Browsers wird ersetzt) und **manuelle Prüfung** (Bedienung per Hand auf einem MacBook: durch den Nutzer, nicht durch diese Tests).
Im echten Spiel getestet: Modul-Lebenszyklus, Abhängigkeiten, Fehlerisolation, Aufräumen (Wiederholungen ohne Wachstum), Zeit/`fixed`/Diagnose, Eingabe-Kontexte und Fokusverlust, Kamerawechsel und Umrechnung, Steuerungen und Zeiger-Sperre, GLB laden/Fehler/Wiederverwendung/Freigabe, eigene Objekte mit Trefferzonen (Strahl, Projektil, Explosion, Spieler-Hitscan, Kopf ×3), `walk` an Gebäuden, Instancing, Spielstand (IDs, Eigentum, `custom`, Module, wiederholtes Laden), Beispiele (Kamera-Modul, Sandwurm, NPC-Dialog, Tower Defense), Modell-Panel und Export (eingebettetes GLB, keine Netzwerkanfragen), Import von `.gltf` mit `.bin`/Textur und von `.zip`, Ablehnung von FBX/fehlenden Dateien mit Hinweis, Drag & Drop, Modell-Vorschau (Bild, Richtungspfeil, Animation, Schließen ohne Reste), Standardwerte je Modell (speichern, Browserspeicher, Export, Neuladen), „Ins Skript einfügen“, Abgleich der Signaturen.
**Nicht geprüft:** Bildraten und Speicher auf echter Grafikhardware (MacBook), Safari/Firefox, Langläufer (Stunden), sehr große Modelle, Touch/Gamepad (nicht vorhanden), Verhalten bei vielen gleichzeitigen Modulen (> 20).

## 14. Noch nicht umgesetzt (`game.planned`)

Touch-Geräteprofil · Gamepad-Geräteprofil · Fahrzeug-Controller (der Buggy ist im Spiel nicht steuerbar) · Third-Person-Controller · Physik-Bibliothek als Adapter · WebRTC-Mehrspieler · Import von Monstern/Fahrzeugen als eigener Typ mit Laufanimation · automatischer Sandkasten für Skripte.
