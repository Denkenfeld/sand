/* Level 6 – Knochenwüste: dedicated mission help.
   Existing direct crystal sales / flying alien revision retained.
   fixedHeight keeps goal 18 in every difficulty. */
(window.DTLV=window.DTLV||[])[5]={
 n:'Knochenwüste',sub:'Kristallfeuer unter fremden Sternen',
 h:18,fixedHeight:true,rn:4,tod:{cycle:240,start:.12,dark:.94},
 th:.92,r0:50,rg:32,rm:23,rc:6,sp0:330,industry:true,aliens:true,
 pre:[{k:'fak',c:2,r:0}],
 wv:[[['pl',10],['pz',3],['drn',2]],[['pz',6],['ali',3],['drn',3]],[['pz',5],['br',3],['drn',4]]],
 rd:{h:10,w:[[['pl',5],['pz',2],['drn',1]]]},
 p:{sp:.14,rk:.10,ne:.10,ts:.11,gb:.05,rl:.05},
 u:['cv','raf','kas','wel','tur','ene','fab','fak','bore','smelt'],
 t:'Sichere die Kristallproduktion und grabe dich bis Reihe 18 vor. Gewinne danach die Verteidigungsschlacht; dein Quartier muss überleben. Baue Sandbohrer auf freigelegtem Treibsand (3 Wasser, 1 Sand je 8 Sekunden). Schmelzöfen benötigen 3 Strom und 1 gelieferten Sand; daraus entsteht in 7 Sekunden ein Energiekristall. Der Ofen liefert direkt zum Quartier – 20 Geld erst bei Ankunft, kein Depot nötig. Nachtangriffe bringen geflügelte Alienschwärme, in der Verteidigung erscheinen Laserdrohnen. Türme, Crawler und das Quartier bekämpfen Fluggegner. Schütze Produktion, Versorgung und Transportwege.',
 nw:['Sandbohrer auf Treibsand','Schmelzofen → Quartier','Echte Warenlieferungen','Alienschwärme','Laserdrohnen','Drei Schlusswellen'],
 missionInfo:{
  "title": "Sichere die Kristallproduktion",
  "goal": "Grabe dich bis Reihe 18 vor und gewinne die anschließende Verteidigungsschlacht. Dein Quartier muss überleben – auch gegen fliegende Gegner.",
  "steps": [
    "Treibsand wird nutzbar: Grabe ein Treibsandfeld frei und baue direkt darauf einen Sandbohrer. Er ist die Ausnahme – andere Gebäude dürfen weiterhin nicht auf Treibsand stehen.",
    "Sand fördern: Der Sandbohrer benötigt 3 Wasser und fördert ohne Ausbau 1 Sand je 8 Sekunden. Verbinde ihn über Fließbänder mit einem Schmelzofen und dem Quartier.",
    "Kristalle schmelzen: Der Schmelzofen benötigt 3 Strom und 1 tatsächlich gelieferten Sand. Ohne Ausbau dauert die Verarbeitung 7 Sekunden pro Energiekristall.",
    "Geld erst bei Lieferung: Der Schmelzofen schickt seine Kristalle direkt zum Quartier. Erst bei Ankunft gibt es 20 Geld pro Kristall. Du brauchst in diesem Level kein Kristalldepot.",
    "Lieferwege schützen: Getrennte Bänder unterbrechen die Produktion und können Waren kosten. Volle Zwischenlager pausieren die Verarbeitung. Bestände und Produktionsstatus siehst du beim Anklicken des Gebäudes.",
    "Nachts kommen Alienschwärme: Die kleinen geflügelten Wesen tauchen in Gruppen auf. Halte Licht, Strom und Wasser bereit und schütze deine Versorgung auch im Dunkeln.",
    "Fliegende Ziele brauchen passende Verteidiger: Geschütztürme, Crawler und das Quartier können Aliens und Laserdrohnen bekämpfen. Krieger und Würmer erreichen Fluggegner nicht.",
    "Vor dem letzten Vorstoß aufrüsten: Halte Fabriken für Munition, Türme und mobile Kampfeinheiten bereit. Nach Reihe 18 folgt die Schlussverteidigung mit drei Wellen. Der Zwischenüberfall ist schwierigkeitsabhängig."
  ]
}
};
(function(){
 if(window.__dtMission6Loaded)return;window.__dtMission6Loaded=true;
 const current=document.currentScript&&document.currentScript.src;
 const script=document.createElement('script');
 const url=current?new URL('../ui-mission-level6.js',current):new URL('ui-mission-level6.js',location.href);
 const version=current?new URL(current).searchParams.get('v'):null;
 url.searchParams.set('build','mission6-r1');if(version)url.searchParams.set('v',version);
 script.src=url.href;document.head.appendChild(script);
})();
