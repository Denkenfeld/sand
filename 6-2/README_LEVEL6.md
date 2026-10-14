# Level 6 – Knochenwüste (Update auf dein hochgeladenes Projekt)

## Installation
Den Inhalt dieses ZIP über den vorhandenen Projektordner kopieren. Enthalten sind:
- `game/engine.js`: deine Engine mit neuen Gebäuden, Lieferungen, Aliens und Drohnen
- `game/game.html`, `game/game.css`: Cache-Version und Bauleiste für die zusätzlichen Gebäude
- `game/levels/level06.js`, `js/dt-config.js`: Level 6 freigeschaltet
- `index.html`: deine bestehende Start-Shell mit neuer Versionskennung
- `films/film06.html` und vorhandene Film-/Audio-Abhängigkeiten aus deinen Uploads
- `README_LEVEL6.md`, `tools/level6_module.js` und `tools/level6_engine.patch`: Dokumentation/Quellvergleich

Die bestehenden Leveldateien 1–5 und Filme 1–5/7–10 bleiben in deinem Projekt, sie werden nicht überschrieben.
Die hochgeladenen Dateinamen mit -2/-3/-4 usw. wurden auf die ursprünglichen Projektpfade normalisiert.
Fortschritt bleibt erhalten. Nach Level 5 folgt Film 6 und danach Level 6.

## Neue Industrie
1. Treibsand freigraben. Ein ungegrabenes Treibsandfeld bei Spalte 2/Reihe 3 ist garantiert.
2. Sandbohrer AUF dieses Treibsandfeld bauen (alle anderen Gebäude bleiben dort verboten).
3. Schmelzofen und Kristalldepot auf normalen freigelegten Boden setzen.
4. Alle Gebäude über Bänder ans gleiche Quartier-Netz anschließen; auch unterschiedliche Äste funktionieren.
5. Ausreichend Wasser und Strom bereitstellen. Die ursprüngliche Netzversorgung bleibt erhalten.

| Gebäude | Preis | Versorgung | Ablauf ohne Ausbau |
|---|---:|---|---|
| Sandbohrer | 65 | Wasser -3 | 1 Sand alle 8 Sekunden |
| Schmelzofen | 85 | Strom -3 | 1 gelieferter Sand -> 1 Kristall in 7 Sekunden |
| Kristalldepot | 40 | keine | Kristall ans Quartier, max. 1 Versand alle 2 Sekunden |

Sand und Kristalle sind echte Pakete, nicht nur dekorative Lieferungen.
Geld wird ausschließlich bei Ankunft am Quartier bezahlt: 20 pro Kristall.
Die Zwischenlager haben 4 Plätze (+2 pro Ausbau); bei Rückstau pausiert die Produktion.
Jede Ausbaustufe gibt +15 % Verarbeitungstempo/Versandgeschwindigkeit.
Bei abgerissenen Bändern geht eine Lieferung verloren. Eine ersetzte Zielanlage übernimmt keine alte Lieferung.
Bei fehlendem Strom/Wasser greift die bestehende Engpass-/Abschaltlogik.
Während Schlachten ruht die Industrie wie die bisherigen Wirtschaftsanlagen.

## Balancing-Basis
Durchsatz einer kompletten Kette: maximal 20/8*60 = 150 Geld/Minute nach der Anlaufphase.
Der bestehende Sammler trägt 12 Spice je Abbau, benötigt 1,5 Sekunden zum Abbau und fährt mit 1,2 Feldern/s
bei Grundwerten (ohne Synergie/Ausbau). Bei Distanz 2,5 Felder:
12/(2*2,5/1,2+1,5)*60 = etwa 127 Geld/Minute, solange eine Ader verfügbar ist.
Die Kette bringt unter diesen Annahmen etwa 18 % mehr, hat aber höhere Baukosten (190 vs. 50 für Raffinerie+Sammler)
und Transport-Anlaufzeit. Sehr nahe Adern oder ausgebaute Sammler können kurzfristig mehr liefern.
Anders als Adern erschöpft sich Treibsand nicht. Bestehende Adern regenerieren mit sinkender Kapazität.
Test mit echter Engine-Logik und simuliertem Canvas: 720 Geld in 5 Minuten (kompakte Verbindung, inklusive Anlauf).
Geldbonus, Ertragsrate oder Angriffe wurden für die älteren Level nicht neu balanciert.

## Nachtgegner / Endschlacht
- Level 6 hat einen 240-Sekunden-Tag-Nacht-Zyklus und exakt 18 Zielreihen in allen Schwierigkeitsgraden.
- `aliens:true`: Ab Beginn einer dunklen Phase greifen Aliens an, mit begrenzter Spawnzahl; tagsüber keine neuen Nachtspawns.
- Ab größerer Höhe können nachts auch Drohnen auftauchen. Bestehende Angreifer verschwinden bei Sonnenaufgang nicht.
- Neue Laserdrohnen schweben über Hindernisse. Ihre roten/violetten Laser richten tatsächlich Schaden an.
- Türme, Crawler und der Quartier-Puls treffen Drohnen; Krieger und Würmer können sie nicht erreichen.
- Aliens laufen am Boden und schießen grüne Laser. Sie bleiben von allen passenden Verteidigern angreifbar.
- Endschlacht: drei stärkere Wellen inklusive Drohnen, Panzer, Aliens und Brechern.
- HP/Schaden/Tempo der neuen Gegner werden von der vorhandenen Schwierigkeitsstufe skaliert.
- Nächtliche Alienangriffe werden für Level 6 neu eingeführt; Level 5 wird nicht nachträglich verändert.

## Entwicklungswerkzeuge
`tools/level6_module.js` ist der lesbare Modul-Quelltext, bereits in engine.js eingebaut: NICHT nochmals separat laden.
`tools/level6_engine.patch` dokumentiert alle Änderungen gegenüber deiner hochgeladenen engine-4.js.
Das bisherige split_game.py kennt diese Erweiterung noch nicht. Nicht ungeprüft neu generieren, sonst geht Level 6 verloren.

## Prüfungen
Syntax aller enthaltenen JS-Dateien und inline-Skripte geprüft.
Mock-Tests der echten Engine: Produktion, Zahlung erst bei Lieferung, Vorratsgrenzen, Wassermangel,
Bauregeln für Treibsand, Alien/Drohnen-Kampf, Nachtwechsel, Renderfunktionen und Start von Level 1.
Kein echter Browser-/iPhone-Test: Optik, Performance, Klang und spielerische Endbalance bitte prüfen.
