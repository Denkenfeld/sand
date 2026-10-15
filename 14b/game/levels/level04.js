/* Level 4 · Kraterfeld – dedicated night mission help.
   Same gameplay parameters as the night level; fixed goal height 15 on every difficulty.
   pre = ready-built torch tower left of headquarters. */
(window.DTLV=window.DTLV||[])[3]={
 n:'Kraterfeld',sub:'Nacht über den Kratern',tod:'night',dark:.94,fixedHeight:true,h:15,rn:4,th:.82,r0:40,rg:29,rm:19,rc:6,sp0:230,
 pre:[{k:'fak',c:2,r:0}],
 wv:[[['pl',8],['pz',3]],[['pz',6]],[['pz',4],['br',2]]],
 rd:{h:8,w:[[['pl',6],['pz',1]]]},
 p:{sp:.12,rk:.12,ne:.10,ts:.08,gb:.05,rl:.05},
 u:['cv','raf','kas','wel','tur','ene','fab','fak'],
 t:'Sichere das Nachtlager. Grabe dich bis Reihe 15 vor und gewinne die anschließende Verteidigungsschlacht. Dein Quartier muss überleben. Dieses Gebiet bleibt die ganze Zeit bei Nacht; du musst nicht auf einen Sonnenaufgang warten. Ein fertiger Fackelturm steht links neben dem Quartier. Weitere Fackeltürme erhellen neue Baugebiete und benötigen jeweils 2 Strom; ihr Ausbau erweitert den Lichtradius. Halte Wasser, Strom und Munition ausreichend, meide Treibsand und bereite dich auf Zwischenüberfall und Schlussverteidigung vor.',
 nw:['Dauerhafte Nacht','Fackelturm steht schon','Lichtnetz erweitern','Stromreserven','Drei Schlusswellen'],
 missionInfo:{
  title:'Sichere das Nachtlager',
  goal:'Grabe dich bei Nacht bis Reihe 15 vor und gewinne die anschließende Verteidigungsschlacht. Dein Quartier muss überleben.',
  steps:[
   'Dein Startbereich ist beleuchtet: Links neben dem Quartier steht bereits ein fertiger Fackelturm. Du musst diesen ersten Turm nicht selbst bauen.',
   'Licht mit der Basis erweitern: Baue weitere Fackeltürme bei neuen Gebäuden und wichtigen Baugebieten. Ihr Licht läuft am Rand weich aus und flackert leicht. Der Grundradius beträgt etwa 3,4 Felder; jeder Ausbau erweitert ihn um 0,8.',
   'Strom nicht vergessen: Jeder Fackelturm braucht 2 Strom und eine Verbindung zum Quartier. Wenn die Versorgung ausfällt, verliert er seine große Lichtwirkung. Plane Energiefelder zusammen mit deiner Erweiterung.',
   'Die Nacht ist keine zusätzliche Siegbedingung: Dieses Level bleibt dunkel. Du musst weder einen Sonnenaufgang abwarten noch eine bestimmte Zahl Fackeltürme bauen.',
   'Gewürz und Versorgung sichern: Betreibe Raffinerien mit Sammlern nahe neuen Adern. Verbinde die Anlagen über Fließbänder und halte genug Wasser bereit.',
   'Gefahren vorsichtig aufdecken: Beachte Wurmzahlen und nutze die Wurmflagge bei vermuteten Nestern. Auf Treibsand kannst du in diesem Level nicht bauen.',
   'Verteidigung rechtzeitig aufbauen: Fabriken liefern Munition für Geschütztürme. Krieger helfen gegen Plünderer, Crawler gegen Panzer. Verbessere deine Anlagen, bevor du bis zur Zielhöhe durchgräbst.'
  ]
 }
};
/* Presentation extension only: no engine fetch or patching. */
(function(){
 if(window.__dtMission4Loaded)return;window.__dtMission4Loaded=true;
 const current=document.currentScript&&document.currentScript.src;
 const script=document.createElement('script');
 const url=current?new URL('../ui-mission-level4.js',current):new URL('ui-mission-level4.js',location.href);
 const version=current?new URL(current).searchParams.get('v'):null;
 url.searchParams.set('build','mission4-r1');if(version)url.searchParams.set('v',version);
 script.src=url.href;document.head.appendChild(script);
})();
