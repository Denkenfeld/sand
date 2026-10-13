/* Dünenturm – zentrale Konfiguration.
   Alle Dateinamen, die Level-Anzahl und die Zwischensequenzen werden NUR HIER gepflegt. */
(function(){
const DUE=window.DUE=window.DUE||{};

DUE.START='index.html';                 // Startbildschirm
DUE.MAP='duenenturm_karte-3.html';      // Levelwahl / Eroberungskarte
DUE.GAME='sand8.html';                  // das Spiel (bei neuer Version nur hier ändern)
DUE.LEVELS=10;                          // Anzahl Level (später 11 → zusätzlich levels/level11.js einbinden)
DUE.FILMS=[1,2];                        // Level mit Zwischensequenz: film01.html, film02.html … (neue Nummer eintragen, sobald die Datei da ist)
DUE.MENU={UPGRADES:null,ARSENAL:null,ERFOLGE:null};   // Seiten der Karten-Kacheln, z. B. ARSENAL:'arsenal.html'

DUE.levels={};                          // wird von levels/levelNN.js gefüllt (1-basiert)
DUE.levelList=()=>Array.from({length:DUE.LEVELS},(_,i)=>DUE.levels[i+1]||{ready:false,n:'Level '+(i+1),sub:'In Arbeit'});

const pad=n=>String(n).padStart(2,'0');
DUE.filmFile=n=>`film${pad(n)}.html`;
DUE.gameUrl=n=>`${DUE.GAME}?level=${n}`;
/* Wohin führt „Level n spielen“? Mit Film: Film → (Auftrag annehmen) → Spiel. Ohne Film direkt ins Spiel. */
DUE.introUrl=n=>DUE.FILMS.includes(n)?`${DUE.filmFile(n)}?next=${encodeURIComponent(DUE.gameUrl(n))}`:DUE.gameUrl(n);
DUE.goMap=()=>{location.href=DUE.MAP};
DUE.levelFromUrl=()=>{const n=+new URLSearchParams(location.search).get('level');return n>=1&&n<=DUE.LEVELS?Math.floor(n):DUE.getLvl()};
})();
