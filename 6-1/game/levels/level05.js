/* Level 5 – Salzmeer. Tag/Nacht: 240 Sekunden, Beginn am Nachmittag.
   Voraussetzung: engine.js mit Nacht-System und Fackelturm (komplettes Nachtfix-Projekt).
   Arrayindex = Levelnummer minus 1. */
(window.DTLV=window.DTLV||[])[4]={
 n:'Salzmeer',sub:'Zwischen Sonnenglut und kalter Nacht',
 tod:{cycle:240,start:.2,dark:.94},
 h:17,rn:4,th:.86,r0:42,rg:29,rm:19,rc:6,sp0:260,
 pre:[{k:'fak',c:2,r:0}],
 wv:[[['pl',9],['pz',3]],[['pl',5],['pz',6]],[['pz',5],['br',2]]],
 rd:{h:9,w:[[['pl',6],['pz',2]]]},
 p:{sp:.14,rk:.10,ne:.10,ts:.07,gb:.05,rl:.05},
 u:['cv','raf','kas','wel','tur','ene','fab','fak'],
 t:'Das ausgetrocknete Salzmeer reflektiert die Sonne. Doch die Nacht kommt: Baue dein Lichtnetz aus Fackeltürmen aus, bevor es dunkel wird. Ein erster Turm steht neben dem Quartier. Jeder Fackelturm braucht 2 Strom; der Ausbau erweitert seinen Radius. Sichere die Gewürzadern, versorge deine Türme mit Munition und halte den Überfall bei Höhe 9 aus. Erreiche die Zielhöhe und verteidige das Quartier gegen drei Wellen.',
 nw:['Erster Tag-Nacht-Wechsel','Lichtnetz ausbauen','Raid bei Höhe 9','Drei Wellen']
};
