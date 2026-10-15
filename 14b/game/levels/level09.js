/* Level 9 – Das Flüstern. Mission help only: existing radar, quests and victory rules preserved. */
(window.DTLV=window.DTLV||[])[8]={
 n:'Das Flüstern',sub:'Signale zwischen den Dünen',explore:true,
 h:18,fixedHeight:true,rn:4,tod:{cycle:240,start:.18,dark:.94},
 th:.87,r0:105,rg:75,rm:60,rc:4,sp0:440,industry:true,aliens:true,
 pre:[{k:'fak',c:2,r:0}],wv:[],rd:null,
 p:{sp:.17,rk:.08,ne:.06,ts:.08,gb:.04,rl:.04},
 u:['cv','raf','kas','wel','tur','ene','fab','fak','bore','smelt','radar','lab'],
 t:'Folge dem Flüstern. Baue verbundene Radarstationen, um drei Signale zu entdecken, und schließe mindestens zwei Aufträge im Questjournal ab. Dein Quartier muss überleben. Rette den gestrandeten Konvoi mit Krieger oder Crawler, erforsche das Relikt mit einer versorgten Forschungsstation für 100 Geld oder versorge die Siedlung mit einer Lieferung für 60 Geld. Zwei abgeschlossene Aufgaben reichen zum Sieg; es gibt keine zusätzliche Endschlacht. Radar findet Signale, gräbt aber nicht. Forschung pausiert ohne Strom oder Wasser. Belohnungen, Wissen und Kontakte bleiben für spätere Gebiete gespeichert.',
 nw:['Radarstation','Questjournal','Konvoi retten','Relikt erforschen','Siedlung versorgen','2 von 3 Aufträgen'],
 missionInfo:{
  "title": "Folge dem Flüstern",
  "goal": "Finde drei Signale mit Radar und schließe mindestens zwei Aufträge ab. Dein Quartier muss überleben. Es gibt keine zusätzliche Endschlacht.",
  "steps": [
    "Baue eine Radarstation: Sie kostet 55 Geld, benötigt 2 Strom und muss per Fließband mit dem Quartier verbunden sein. Ohne Anschluss findet sie keine Signale.",
    "Signale suchen: Eine Radarstation deckt im Umkreis unbekannte Ziele auf. Ausbau vergrößert den Suchradius. Die drei Signale liegen in den Reihen 6, 10 und 14.",
    "Öffne das Questjournal: Nach einer Entdeckung kannst du den Questjournal-Knopf antippen. Dort siehst du alle Aufträge, ihren Stand und die Belohnungen.",
    "Konvoi retten: Schicke Krieger oder Crawler mit dem Angriffsknopf zum gestrandeten Konvoi. Sie müssen die Umgebung sichern; Sammler bleiben bei ihrer Arbeit.",
    "Relikt erforschen: Baue eine verbundene Forschungsstation (2 Strom, 1 Wasser) und starte die Untersuchung für 100 Geld. Die Forschung pausiert, wenn Strom oder Wasser fehlt.",
    "Siedlung versorgen: Sende für 60 Geld eine Versorgungslieferung. Der Konvoi braucht eine freigegrabene Route; schicke bei Bedarf eine Eskorte mit dem Angriffsknopf.",
    "Zwei Aufträge genügen: Du musst nicht alle drei Aufgaben erledigen. Sobald zwei abgeschlossen sind, gewinnst du das Level. Belohnungen, Wissen und Handelskontakt bleiben für spätere Gebiete gespeichert.",
    "Basis nicht vergessen: Halte Strom, Wasser, Munition und Licht bereit. Schütze Radar, Forschung, Lieferwege und dein Quartier gegen Nachtangriffe."
  ]
}
};
(function(){
 if(window.__dtMission9Loaded)return;window.__dtMission9Loaded=true;
 const current=document.currentScript&&document.currentScript.src;
 const script=document.createElement('script');
 const url=current?new URL('../ui-mission-level9.js',current):new URL('ui-mission-level9.js',location.href);
 const version=current?new URL(current).searchParams.get('v'):null;
 url.searchParams.set('build','mission9-r1');if(version)url.searchParams.set('v',version);
 script.src=url.href;document.head.appendChild(script);
})();
