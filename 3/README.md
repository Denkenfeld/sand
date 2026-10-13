# Dünenturm – Projektstruktur

```
index.html               Shell: lädt jeden Bildschirm in einem iFrame, besitzt den EINEN Ton (AudioContext)
apple-touch-icon.png     Icon (ersetzbar)
js/
  dt-config.js           ZENTRALE KONFIGURATION: welche Level/Filme es gibt
  dt-shell.js            Router + gemeinsamer Ton (nur von index.html benutzt)
  dt-audio.js            in jedem Bildschirm: leitet den Ton auf den gemeinsamen Kontext um
  dt-core.js             in jedem Bildschirm: Navigation, Fortschritt, Ton-Vorgabe (DTX)
screens/
  start.html             Startbildschirm  ("Abenteuer starten" → Karte)
  map.html               Karte (three.js) – Level wählen → Film
films/
  film-engine.js         gemeinsame Film-Engine
  film01.html, film02.html   Zwischensequenzen ("Auftrag annehmen" → direkt ins Spiel)
game/
  game.html              Spielseite, startet Level aus ?level=N
  game.css               Styles
  engine.js              Spiellogik (aus sand12.html, für alle Level gleich)
  levels/level01.js …    EIN LEVEL = EINE DATEI (nur Leveldaten)
tools/split_game.py      erzeugt game/ aus einer Einzeldatei (sandNN.html) neu
```

## Ablauf
start → (Abenteuer starten) → map → (Level wählen) → filmNN → (Auftrag annehmen) → game?level=N
→ Level geschafft → Ergebnisfenster → „Weiter ▸ zur Karte“ → map (nächstes Level ist ausgewählt).
Nach Level 10 ist Level 11 („Weite Welt“) freigeschaltet.

## Ton
* Erster Tipp auf dem Startbildschirm schaltet den Ton frei **und** startet ihn (Standard: AN).
* Karte, Filme und Spiel laufen danach mit demselben AudioContext durchgehend, Ton ist überall von Anfang an AN.
* Schaltet der Spieler den Ton im Start-/Filmbildschirm selbst aus, merkt sich das `localStorage.dtSnd = '0'`.
  (Zum Testen auf „AN“ zurück: `dtSnd` im Browser-Speicher löschen.)
* Karte und Spiel haben eigene Lautstärke-Einstellungen (Standard AN).

## Fortschritt
`localStorage.dtL3` = freigeschaltetes Level (1…11). Das Spiel setzt es beim Sieg auf `max(alt, N+1)`.

## Neues Level
1. `game/levels/level03.js` anlegen (Kopie von level02.js, Werte ändern).
2. Optional `films/film03.html` (Kopie von film02.html).
3. In `js/dt-config.js` beim Eintrag `id:3` die Pfade eintragen. Fertig.

## Neue Spielversion einspielen
`python3 tools/split_game.py sand13.html` (im Projektordner) überschreibt `game/engine.js`, `game.css`,
`game.html` und `game/levels/*.js`.

## Hosting
Auf einen Webserver legen (GitHub Pages, Netlify, eigener Server …). Per `file://` funktioniert der gemeinsame
Ton in den iFrames nicht zuverlässig. Die Karte lädt three.js von cdnjs (Internet nötig).
