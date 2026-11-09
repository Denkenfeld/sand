# Allein auf See – 3D-Floß-Survival (Three.js + WebGL)

Ein Junge, ein zusammengeschustertes Floß und ein endloser Ozean. Komplett prozedural: **keine externen Assets**
(Modelle, Texturen, Sounds werden im Code erzeugt), läuft im Browser mit Three.js r187 + `postprocessing`.

## Starten

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Produktions-Build nach dist/ (~780 KB, 204 KB gzip)
```

URL-Parameter: `?debug` (lil-gui offen) · `?quality=low` (halbe Fisch-/Vogelzahl, kein MSAA) · `?autostart` (Menü überspringen) · `?fixedres` (adaptive Auflösung aus)

## Steuerung

| Taste | Aktion |
|---|---|
| WASD / Pfeile | Laufen · **Shift** rennen |
| Maus | Umschauen (Pointer-Lock; falls blockiert: Maustaste halten und ziehen) · Mausrad = Kamera-Abstand |
| Space | Springen (landet das Floß spürbar) |
| V | Third-Person ⇄ Ego (stufenloser Zoom) |
| E | Interagieren (Wasser, Kiste, Zelt, Kokosnüsse) |
| T | Tag/Nacht-Zyklus ein/aus · M Ton · G Debug-Panel · P Pause |

## Architektur

```
src/
  main.js                 Einstieg
  Game.js                 Composition Root + Hauptschleife; "Systems" = alles mit update(dt,t,game)
  core/   Input.js        Tastatur/Maus/Pointer-Lock (+ Drag-Fallback)
          DebugGUI.js     lil-gui Look-Dev (Ozean, Zeit, Physik, PostFX, Kamera)
  util/   waves.js        EINE Gerstner-Wellen-Tabelle für GPU-Shader UND CPU-Physik
          glslSky.js      gemeinsame Atmosphäre (Himmel + Ozean-Reflexion + Wolken)
          waterMaterial.js  Patch für Standard-Materialien: Caustics, Nässe, Unterwasser-Tint, Schwimm-Wackeln
          textures.js     prozedurale Texturen (Holz, Rost, Wedel, Plane) + PRNG
  world/  Sky.js          Tageszeit, Sonne/Mond, Sterne, Wolken, Env-Map (PMREM)
          Ocean.js        Polar-Mesh + Wasser-Shader (Fresnel, Schaum, SSS, Glitter, Transparenz)
          RaftModel.js    Treibholz-Floß: Stämme, Planken (Instancing), Fässer, Seile, Zelt, Algen …
          Raft.js         Auftriebs-Physik (Feder-Dämpfer an 4 Ecken), Kollisionsabfragen
  player/ BoyModel.js     10-jähriger Junge (Gelenk-Hierarchie aus Primitiven)
          Animator.js     Blend-Tree: Idle↔Gehen↔Rennen, Luft (Sprung/Fall), Landung, Interaktion
          Player.js       Bewegung im Floß-Raum, Springen, Interaktion
          CameraRig.js    Orbit-/Ego-Kamera, weiches Folgen, Floß-Wippen, Kollision
  life/   FishSystem.js   Instanced Boids, LOD, Culling, Flucht vor Haien
          SharkSystem.js  Haie: Orbit + "Close Pass" mit Rückenflosse an der Oberfläche
          UnderwaterFX.js Blasen, Schwebeteilchen, Lichtstrahlen
          Birds.js · Debris.js   Möwen, Treibgut (mit `pickup()`-Hook)
  audio/  AudioSystem.js  prozeduraler Ton (Meer, Wind, Knarzen, Schritte, Möwen)
  fx/     PostFX.js       Bloom, ACES, Teal/Orange-Grading, Vignette, CA, Korn, optional DoF
tools/    shot.mjs, play.mjs, tod.mjs   Headless-Tests (Playwright) für Screenshots und Spielablauf
```

## Wie das Floß "wirklich" auf den Wellen reitet

`util/waves.js` definiert 5 Gerstner-Wellen einmal. Daraus werden (a) der GLSL-Code des Ozeans generiert und
(b) `sampleWave(x, z, t)` für die CPU. Das Floß fragt die Wellenhöhe an 4 Eckpunkten ab, jede Ecke hat eine
Feder mit Dämpfer. Gewicht und Landungen des Jungen wirken als Kraft bzw. Impuls. Der Ozean-Offset (`ox/oz`)
lässt das Muster am Floß vorbeigleiten (Strömung), sodass nichts im Raum wandert oder jittert.

## Erweitern

* **Crafting / Ressourcen:** `Debris.pickup(item)` liefert die Art (`plank`, `barrel` …); `Raft.deck/solids` sind einfache Boxlisten, neue Bauteile = Mesh + Box hinzufügen.
* **Stürme:** `waveState.ampScale` und `Sky` (Wolkendeckung, Nebel) animieren; Physik und Shader folgen automatisch.
* **Haie angreifen lassen:** In `SharkSystem` einen Zustand `attack` ergänzen (Ziel = Floßrand) – Steuerung und Flossen-Effekt existieren schon.
* **Neues System:** Objekt mit `update(dt, t, game)` bauen und `game.add(...)` aufrufen.

## Performance-Notizen

Instancing für Planken/Fische, LOD (Fische), Frustum-Culling je Schwarm, Boids mit Nachbar-Stride, Ozean-Mesh polar
(dicht nahe, grob am Horizont) mit Amplitudenabfall, Schatten nur um das Floß, HalfFloat-MSAA nur bei `quality≥1`,
adaptive Auflösung (0,65–1,75× Pixelratio). SSAO ist bewusst nicht aktiv (teuer, kaum sichtbar bei diesem Stil);
`PostFX` ist so aufgebaut, dass ein `SSAOEffect` einfach in `passA` ergänzt werden kann.
