/* Level 5 – Salzmeer. Tag/Nacht: 240 Sekunden, Beginn am Nachmittag.
   Voraussetzung: engine.js mit Nacht-System und Fackelturm (komplettes Nachtfix-Projekt).
   Arrayindex = Levelnummer minus 1. */
(window.DTLV=window.DTLV||[])[4]={
 n:'Salzmeer',sub:'Zwischen Sonnenglut und kalter Nacht',
 tod:{cycle:240,start:.2,dark:.94},
 fixedHeight:true,h:17,rn:4,th:.86,r0:42,rg:29,rm:19,rc:6,sp0:260,
 pre:[{k:'fak',c:2,r:0}],
 wv:[[['pl',9],['pz',3]],[['pl',5],['pz',6]],[['pz',5],['br',2]]],
 rd:{h:9,w:[[['pl',6],['pz',2]]]},
 p:{sp:.14,rk:.10,ne:.10,ts:.07,gb:.05,rl:.05},
 u:['cv','raf','kas','wel','tur','ene','fab','fak'],
 t:'Sichere die Gewürzroute am Salzmeer. Grabe dich bis Reihe 17 vor und gewinne die anschließende Verteidigungsschlacht. Dein Quartier muss überleben. Hier wechseln Tag und Nacht: Erweitere deine Beleuchtung rechtzeitig und halte die Versorgung im Plus. Ein Fackelturm steht neben dem Quartier; weitere Türme brauchen jeweils 2 Strom. Erschließe frische Gewürzadern, versorge die Geschütztürme mit Munition und bereite dich auf den schwierigkeitsabhängigen Zwischenüberfall und drei Schlusswellen vor. Eine bestimmte Tageszeit oder Anzahl gebauter Fackeltürme ist keine zusätzliche Siegbedingung.',
 nw:['Erster Tag-Nacht-Wechsel','Lichtnetz ausbauen','Raid bei Höhe 9','Drei Wellen'],
 missionInfo:{
  "title": "Sichere die Gewürzroute am Salzmeer",
  "goal": "Grabe dich bis Reihe 17 vor und gewinne die anschließende Verteidigungsschlacht. Dein Quartier muss überleben – am Tag und in der Nacht.",
  "steps": [
    "Plane für wechselnde Tageszeiten: Anders als im vorherigen Level wechseln hier Tag und Nacht. Warte nicht auf eine bestimmte Uhrzeit, um zu gewinnen; entscheidend sind Zielhöhe und Schlussverteidigung.",
    "Erweitere das Lichtnetz schon am Tag: Ein fertiger Fackelturm steht neben dem Quartier. Baue weitere Türme bei neuen Produktionsanlagen und wichtigen Baugebieten, bevor die Nacht kommt.",
    "Halte genug Strom bereit: Jeder Fackelturm benötigt 2 Strom und eine Verbindung zum Quartier. Seine Beleuchtung ist kein Ersatz für eine funktionierende Versorgung. Ausbau vergrößert den Radius.",
    "Erschließe neue Gewürzadern: Baue Raffinerien mit Sammlern in Reichweite frischer Adern und verbinde sie mit deiner Basis. Erschöpfte Adern regenerieren mit geringeren Vorräten.",
    "Versorgung und Verteidigung gemeinsam ausbauen: Taufänger liefern Wasser, Energiefelder Strom, Fabriken Munition. Eine Fabrik liefert 4 Munition, ein Geschützturm benötigt 2.",
    "Setze verschiedene Verteidiger ein: Krieger helfen gegen Plünderer; Crawler bekämpfen Panzer. Die Schlussverteidigung besteht aus drei Wellen und enthält auch Brecher.",
    "Grabe vorsichtig weiter: Beachte Wurmzahlen, nutze die Wurmflagge bei vermuteten Nestern und führe deine Bauwege um Treibsand herum. Bereite dich vor dem Zwischenüberfall und vor Erreichen der Zielhöhe vor."
  ]
}
};

/* Normal script load for the mission presentation; no engine fetch/patch. */
(function(){
 if(window.__dtMission5Loaded)return;window.__dtMission5Loaded=true;
 const current=document.currentScript&&document.currentScript.src;
 const script=document.createElement('script');
 const url=current?new URL('../ui-mission-level5.js',current):new URL('ui-mission-level5.js',location.href);
 const version=current?new URL(current).searchParams.get('v'):null;
 url.searchParams.set('build','mission5-r1');if(version)url.searchParams.set('v',version);
 script.src=url.href;document.head.appendChild(script);
})();
