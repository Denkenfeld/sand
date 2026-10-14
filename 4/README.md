# Dünenturm – Projektstruktur

```
index.html               Shell: lädt jeden Bildschirm in einem iFrame, besitzt den EINEN Ton (AudioContext)
apple-touch-icon.png     Icon (ersetzbar)
js/
  dt-config.js           ZENTRALE KONFIGURATION: Filme 1–10 und Level-Pfade, ready-Flag je Level
  dt-shell.js            Router + gemeinsamer Ton (nur von index.html benutzt)
  dt-audio.js            in jedem Bildschirm: leitet den Ton auf den gemeinsamen Kontext um
  dt-core.js             in jedem Bildschirm: Navigation, Fortschritt, Ton-Vorgabe (DTX)
screens/
  start.html             Startbildschirm  ("Abenteuer starten" → Karte)
  map.html               Karte (three.js) – Level wählen → Film
films/
  film-engine.js, film-core.js, film-lib.js   gemeinsame Film-Technik
  film01.html … film10.html                   Zwischensequenzen ("Auftrag annehmen" → direkt ins Spiel)
game/
  game.html              Spielseite, startet Level aus ?level=N
  game.css, engine.js    Styles / Spiellogik (aus sand12.html, für alle Level gleich)
  levels/level01–03.js   EIN LEVEL = EINE DATEI (nur Leveldaten)
  levels/_vorlage.js     Vorlage für Level 4–10
tools/split_game.py      erzeugt game/ aus einer Einzeldatei (sandNN.html) neu
```

## Ablauf
start → (Abenteuer starten) → map → (Level wählen) → filmNN → (Auftrag annehmen) → game?level=N
→ Level geschafft → Ergebnisfenster → „Weiter ▸ zur Karte“ → map (nächstes Level ist ausgewählt).
Nach Level 10 ist Level 11 („Weite Welt“) freigeschaltet.
Level mit `ready:false` zeigen auf der Karte „folgt bald“ – ihre Filme sind aber schon eingebunden.

## Level 4–10 hinzufügen (zwei Schritte)
1. `game/levels/_vorlage.js` nach `game/levels/level04.js` kopieren, Zahl in `[3]` = Level−1, Werte anpassen.
2. In `js/dt-config.js` beim Eintrag `id:4` → `ready:true`.

## Ton
* Erster Tipp auf dem Startbildschirm schaltet den Ton frei **und** startet ihn (Standard: AN).
* Karte, Filme und Spiel laufen danach mit demselben AudioContext durch, Ton ist überall von Anfang an AN.
* Schaltet der Spieler den Ton im Start-/Filmbildschirm selbst aus, merkt sich das `localStorage.dtSnd='0'` bis zum nächsten Öffnen von index.html.

## Fortschritt
`localStorage.dtL3` = freigeschaltetes Level (1…11). Das Spiel setzt es beim Sieg auf `max(alt, N+1)`.

## Neue Spielversion einspielen
`python3 tools/split_game.py sand13.html` (im Projektordner) überschreibt `game/engine.js`, `game.css`,
`game.html` und `game/levels/level01..NN.js` – danach bei Bedarf `ready` in dt-config.js prüfen.

## Hosting
Auf einen Webserver legen (GitHub Pages, Netlify, eigener Server …). Per `file://` funktioniert der gemeinsame
Ton in den iFrames nicht zuverlässig. Die Karte lädt three.js von cdnjs (Internet nötig).
