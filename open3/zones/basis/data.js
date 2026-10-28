// zones/basis/data.js – ALLE Zahlen und Texte des Aufbauspiels. Balancing = hier ändern, kein Chat nötig.
// Die Logik (sim.js) und die Ansicht (zone.js) lesen diese Tabellen generisch. Danach `node tools/test.js` (prüft auch die Balance).
//
// Gebäude-Felder:
//   n Name · w,h Größe in Feldern · c Kosten (Erz) · ic Symbol im Menü · hh Höhe des Bau-Hologramms (nur Optik)
//   e Energie  (+ erzeugt, − verbraucht)      wa Wasser  (+ liefert, − braucht)      am Munition (+ liefert, − braucht)
//   smoke  Rauchquellen [[x,y,z],…] (nur Optik) · needs  Forschung, die das Gebäude freischaltet (optional)
// Einheiten-Felder: n, ic, cost (Erz), time (Sekunden Ausbildung, 0 = sofort), pop (Zähler im Spielstand: wk/sc),
//   cap (Obergrenze: Zahl oder 'wcap' = Unterkünfte), full (Meldung bei voll), at (Gebäude, das ausbildet)
// Forschungs-Felder: n, ic, cost, time (Sekunden, 0 = sofort), req [Forschungen], at (Gebäude, in dem geforscht wird), fx (Wirkung):
//   energy +Energiekapazität · wcap +Unterkünfte · income +Erz je Takt · refineryIncome +Erz je Raffinerie und Takt · beltBonus +Erz je Fließband an Raffinerie
//   buildTime ×Bauzeit (0.7 = 30 % schneller) · bE { gebäude: +Energie } (zusätzliche Erzeugung je Gebäude dieser Art)
//   V1: st Stellen (Arbeiter) · sun 1 = Energie nur bei Tageslicht · cap Lager (+Erz-Obergrenze) · bat Batterie (Energie-Sekunden) · after Quest-Schritt, nach dem das Gebäude im Menü erscheint
// Aufträge (quests.steps): id, n Name, t Satz im Banner, c Zustandsziele [{k:'built'|'full'|'pop'|'tech'|'cap'|'nights', …}], why/how Journal, say Funk beim Start, tip Funk-Tipp, b Gebäude-Hinweis
// Das Modell zu jeder Gebäude-Kennung steht in models.js (silo, battery: models2.js; gleiche Kennung).
(function (root) {
  const DATA = {
    grid: { NG: 18, OFF: 4, CS: 4.5, start: { x0: 0, x1: 10, y0: 0, y1: 10 }, grow: 2 },    // Raster: 18×18 Felder à 4,5 m, Start 10×10, wächst um 2
    start: { ore: 400, workers: 1, wcap: 6, cap: 500 },                                     // cap = Lager-Obergrenze des Quartiers
    exitRadius: 90,                                                                          // so nah an der Zentrale darf man aus dem Buggy aussteigen (Meter)
    economy: { tick: 1.5, baseIncome: 1, refineryIncome: 4, beltBonus: 1, buildTime: 2.4, refund: .5,
      workerWater: .5,                                                                  // Wasser je Arbeiter (gleiche Einheit wie wa)
      dayLen: 360, startPhase: 0, lightBias: .12, lightWidth: .5,                       // Tag = 6 min; Start am Morgen; Licht = glatt(sin + Bias / Breite)
      link: true, demoTime: 1.6,                                                     // link: Gebäude müssen sich berühren oder per Fließband verbunden sein · Abrissdauer
      offlineRate: .5, offlineMax: 7200, hint1: 180, hint2: 480 },                      // Offline: halbe Rate, höchstens 2 h · Hinweise nach 3 / 8 min Ratlosigkeit
    goal: ['dew', 'solar', 'ref'],                                                          // Missionsziel: Wasser · Energie · Erz
    units: {
      worker:  { n: 'Arbeiter', ic: '👷', cost: 18, time: 0, pop: 'wk', cap: 'wcap', full: 'Keine freien Unterkünfte', at: 'hq' },
      soldier: { n: 'Soldat',   ic: '🪖', cost: 25, time: 0, pop: 'sc', cap: 6,      full: 'Kaserne voll',             at: 'bar' },
    },
    tech: {
      lvl2:  { n: 'Ausbau',       ic: '⬆️', cost: 84,  time: 0,  req: [],        at: 'hq', fx: { energy: 2, wcap: 4 } },
      chain: { n: 'Förderkette',  ic: '🔗', cost: 800,  time: 30, req: [],        at: 'hq', fx: { beltBonus: 1 } },
      rapid: { n: 'Schnellbau',   ic: '⏩', cost: 700,  time: 25, req: [],        at: 'hq', fx: { buildTime: .7 } },
      cells: { n: 'Zellen+',      ic: '🔋', cost: 600,  time: 25, req: ['lvl2'],  at: 'hq', fx: { bE: { solar: 2 } } },
      drill: { n: 'Tiefbohrung',  ic: '⛏️', cost: 1400, time: 40, req: ['lvl2'],  at: 'hq', fx: { refineryIncome: 2 } },
      over:  { n: 'Übertaktung',  ic: '⚡', cost: 2400, time: 60, req: ['drill'], at: 'hq', fx: { refineryIncome: 3 } },
    },
    // Ziele für tools/test.js (Balance). Stimmen die Zahlen nicht mehr, meldet der Test es.
    targets: {
      goalSeconds: 30,                  // Bot erreicht Wasser·Energie·Erz spätestens nach … Sekunden Spielzeit
      paybackMinutes: [1, 12],          // Forschung mit Erzwirkung zahlt sich nach … Minuten aus (Bereich)
      allTechMinutes: [8, 40],          // Der Bot hat den ganzen Forschungsbaum nach … Minuten (Bereich)
      blackouts: 2,                     // der Plan-Bot erlebt höchstens so viele Stromausfälle (die erste Nacht darf noch wehtun)
      questMinutes: [3, 30],            // Der Bot schafft alle Aufträge nach … Minuten (Bereich; Menschen brauchen länger)
    },

    // Hauptauftrag: ein Schritt = ein Zustand (nicht die Reihenfolge der Handgriffe). Wer vorgegriffen hat, bekommt den Schritt sofort abgehakt.
    quests: { act: 'Akt 1 · Überleben', steps: [
      { id: 'basis', n: 'Wasser, Energie, Erz', t: 'Baue Taufänger, Energiefeld und Raffinerie', b: 'dew',
        c: [{ k: 'built', id: 'dew', n: 1 }, { k: 'built', id: 'solar', n: 1 }, { k: 'built', id: 'ref', n: 1 }],
        why: 'Ohne Wasser, Strom und Erz hält die Notfallbasis keine Nacht durch.', how: 'Gebäude in der Leiste wählen und neben das Quartier setzen. Gebäude müssen sich berühren oder per Fließband verbunden sein, sonst bleiben sie offline.',
        say: 'Kamera online. Baut direkt am Quartier: erst Wasser, dann Energie, dann die Raffinerie. Alles muss sich berühren oder per Fließband verbunden sein.', tip: 'Die Raffinerie braucht Strom und Wasser. Baut zuerst den Taufänger und das Energiefeld.' },
      { id: 'lager', n: 'Lager', t: 'Baue ein Silo (Lager auf 1000 Erz)', b: 'silo', c: [{ k: 'cap', n: 1000 }],
        why: 'Das Quartier fasst nur 500 Erz. Was darüber kommt, verfällt.', how: 'Silo aus der Leiste wählen und auf ein freies 2×2-Feld setzen.',
        say: 'Gut. Das Quartier fasst nur 500 Erz, alles darüber verfällt. Ein Silo schafft Platz.', tip: 'Das Silo steht in der Leiste, wenn ein freies Feld gewählt ist.' },
      { id: 'crew', n: 'Mannschaft', t: 'Bilde Arbeiter aus (Quartier antippen)', c: [{ k: 'pop', pop: 'wk', n: 4 }],
        why: 'Jede Raffinerie braucht 2 Arbeiter, sonst liefert sie nur die Hälfte. Arbeiter trinken Wasser.', how: 'Quartier antippen, dann „Arbeiter“. Unterkünfte und Wasser begrenzen die Zahl.',
        say: 'Maschinen ohne Leute liefern wenig. Bildet Arbeiter aus, aber denkt an das Wasser.', tip: 'Quartier in der Mitte antippen, dort steht die Karte „Arbeiter“.' },
      { id: 'doppelt', n: 'Zweite Raffinerie', t: 'Betreibe 2 voll besetzte Raffinerien', b: 'ref', c: [{ k: 'full', id: 'ref', n: 2 }],
        why: 'Mehr Erz heißt mehr Möglichkeiten. Voll besetzt, mit Strom und Wasser.', how: 'Zweite Raffinerie bauen, bei Bedarf Taufänger und Energiefeld ergänzen. Fließbänder daneben geben Bonus.',
        say: 'Zwei Raffinerien, beide voll besetzt. Achtet auf Strom, Wasser und die Stellenzahl.', tip: 'Oben links zeigen ⚡ und 💧 an, was fehlt. Rot heißt: Engpass.' },
      { id: 'nacht', n: 'Die erste Nacht', t: 'Überstehe eine Nacht ohne Stromausfall', b: 'battery', c: [{ k: 'built', id: 'battery', n: 1 }, { k: 'nights', n: 1 }],
        why: 'Nachts fallen die Energiefelder aus. Batterien tragen die Basis bis zum Morgen.', how: 'Baue Batterien (je 400 Energie-Sekunden). Reicht der Speicher nicht, fällt der Strom aus.',
        say: 'Bald wird es dunkel. Die Energiefelder liefern dann nichts, nur Batterien halten die Maschinen am Laufen.', tip: 'Die Batterie lädt sich am Tag auf. Zwei bis drei genügen für die erste Nacht.' },
      { id: 'forschung', n: 'Tiefbohrung', t: 'Erforsche die Tiefbohrung', c: [{ k: 'tech', id: 'drill' }],
        why: 'Tiefere Bohrungen bringen jeder Raffinerie mehr Erz.', how: 'Quartier antippen, erst „Ausbau“, dann „Tiefbohrung“. Sie kostet mehr, als das Lager anfangs fasst.',
        say: 'Das Quartier kann forschen. Die Tiefbohrung steigert den Ertrag jeder Raffinerie.', tip: 'Tiefbohrung kostet 1400 Erz. Dafür muss das Lager groß genug sein: noch ein Silo.' },
      { id: 'wache', n: 'Wache', t: 'Baue eine Kaserne und stelle 3 Soldaten auf', b: 'bar', c: [{ k: 'built', id: 'bar', n: 1 }, { k: 'pop', pop: 'sc', n: 3 }],
        why: 'Maschinen machen Lärm, und Lärm lockt etwas Großes an.', how: 'Kaserne bauen, antippen, dann „Soldat“. Die Kaserne braucht einen Arbeiter.',
        say: 'Der Späher meldet Bewegung im Sand. Bildet Soldaten aus, bevor der Wurm kommt.', tip: 'Die Kaserne braucht Strom, Wasser und einen freien Arbeiter.' },
    ] },
    palette: ['dew', 'solar', 'ref', 'belt', 'silo', 'battery', 'bar', 'fac', 'tur', 'torch'],                 // Reihenfolge im Baumenü
    hq: { id: 'hq', n: 'Quartier', w: 2, h: 2, e: 4, wa: 0, i: 4, j: 4 },
    buildings: {
      dew:   { n: 'Taufänger',    w: 1, h: 1, c: 35, e: -1, wa: 4,  ic: '💧', hh: 8.2 },
      solar: { n: 'Energiefeld',  w: 2, h: 2, c: 25, e: 6,  wa: -1, ic: '☀️', hh: 4.5, sun: 1 },
      ref:   { n: 'Raffinerie',   w: 2, h: 2, c: 30, e: -2, wa: -1, ic: '🏭', hh: 9.5, st: 2, smoke: [[-3.3, 9.2, -3]] },
      torch: { n: 'Fackelturm',   w: 1, h: 1, c: 28, e: -2, wa: 0,  ic: '🔥', hh: 9, after: 'nacht' },
      belt:  { n: 'Fließband',    w: 1, h: 1, c: 3,  e: 0,  wa: 0,  ic: '➡️', hh: 1.2 },
      bar:   { n: 'Kaserne',      w: 2, h: 2, c: 40, e: -1, wa: -1, ic: '🏠', hh: 7.5, st: 1, after: 'crew' },
      fac:   { n: 'Fabrik',       w: 2, h: 2, c: 60, e: -2, wa: -1, am: 4,  ic: '⚙️', hh: 9, st: 3, after: 'nacht', smoke: [[3.1, 8.8, -2.6], [3.1, 7.5, -.4]] },
      silo:    { n: 'Silo',         w: 2, h: 2, c: 80, e: 0,  wa: 0,  ic: '📦', hh: 7, cap: 500, after: 'basis' },
      battery: { n: 'Batterie',     w: 1, h: 1, c: 35, e: 0,  wa: 0,  ic: '🔋', hh: 3.6, bat: 400, after: 'basis' },
      tur:   { n: 'Geschützturm', w: 1, h: 1, c: 45, e: -2, wa: -1, am: -2, ic: '🎯', hh: 5, after: 'nacht' },
    },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA; else root.BASIS_DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
