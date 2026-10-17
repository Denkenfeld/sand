/* Level 10 – Startmission. Mission help only: existing launch checklist and finale preserved. */
(window.DTLV=window.DTLV||[])[9]={
 n:'Startmission',sub:'Der letzte Aufbruch',launchMission:true,
 h:18,fixedHeight:true,rn:4,tod:{cycle:240,start:.12,dark:.94},
 th:.9,r0:150,rg:110,rm:90,rc:4,sp0:520,industry:true,aliens:true,siege:true,
 pre:[{k:'fak',c:2,r:0}],wv:[],rd:null,
 p:{sp:.15,rk:.08,ne:.07,ts:.09,gb:.04,rl:.05},
 u:['cv','raf','kas','wel','tur','ene','fab','fak','bore','smelt','battery','shield','spaceport'],
 t:'Bereite den Raketenstart vor. Öffne das Questjournal, baue und versorge den Raumflughafen, lade 60 Speicherenergie, errichte einen Schildgenerator und aktiviere drei Steuerpunkte in den Reihen 4, 7 und 9. Zerstöre die Festung in den Reihen 10–15. Starte dann die 25-sekündige Vorbereitung für 100 Geld und wehre den letzten Angriff ab. Danach kannst du die Rakete starten. Dein Quartier muss überleben.',
 nw:['Startmission öffnen','Raumflughafen','Energie und Schild','Drei Steuerpunkte','Festung zerstören','Vorbereitung','Letzter Angriff','Raketenstart'],
 missionInfo:{
  "title": "Bereite den Raketenstart vor",
  "goal": "Baue die Raketenbasis, aktiviere drei Steuerpunkte, zerstöre die Festung und starte die Rakete. Dein Quartier muss überleben.",
  "steps": [
    "Öffne die Startmission: Tippe den Questjournal-Knopf. Dort stehen alle Startbedingungen, ihr aktueller Stand und der Raketenstart.",
    "Raumflughafen bauen: Er kostet 140 Geld und benötigt 4 Strom sowie 2 Wasser. Er muss verbunden und versorgt sein.",
    "Energie speichern: Baue Energiespeicher und lade insgesamt mindestens 60 Energie. Verbundene Speicher liefern bei Engpässen bis zu 4 Strom.",
    "Schild aufbauen: Baue und versorge mindestens einen Schildgenerator (3 Strom, 1 Wasser). Er schützt nahe Gebäude und Einheiten und lädt sich mit Strom und Wasser auf.",
    "Drei Steuerpunkte aktivieren: Grabe die Felder in den Reihen 4, 7 und 9 frei, verbinde sie per Band und aktiviere jedes Steuerrelais für 40 Geld. Jedes benötigt 2 Strom.",
    "Festung zerstören: Grabe bis Reihe 10, entdecke die Festung in den Reihen 10–15 und zerstöre alle neun Hauptgebäude. Nutze den Angriffsknopf für Krieger und Crawler.",
    "Rakete vorbereiten: Wenn Raumflughafen, 60 Speicherenergie, Schild, drei Steuerpunkte und Festung fertig sind, starte die Vorbereitung für 100 Geld. Sie dauert 25 Sekunden und braucht durchgehend Versorgung.",
    "Letzten Angriff abwehren: Nach der Vorbereitung kommen drei Angriffswellen. Halte die Basis 45 Sekunden, bis alle Gegner besiegt sind. Danach kannst du den Raketenstart freigeben.",
    "Reparatur priorisieren: Im Gebäudemenü kannst du ein beschädigtes Gebäude priorisieren. Arbeiter reparieren es dann bevorzugt."
  ]
}
};
(function(){
 if(window.__dtMission10Loaded)return;window.__dtMission10Loaded=true;
 const current=document.currentScript&&document.currentScript.src;
 const script=document.createElement('script');
 const url=current?new URL('../ui-mission-level10.js',current):new URL('ui-mission-level10.js',location.href);
 const version=current?new URL(current).searchParams.get('v'):null;
 url.searchParams.set('build','mission10-r1');if(version)url.searchParams.set('v',version);
 script.src=url.href;document.head.appendChild(script);
})();
