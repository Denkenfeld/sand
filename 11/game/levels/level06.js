/* Level 6 – Knochenwüste. Revision 2: 2 neue Gebäude, fliegende Alienschwärme.
   1 Sand (Bohrer) -> 1 Kristall (Ofen) -> Quartier = 20 Geld. Depot erst später freischalten. */
(window.DTLV=window.DTLV||[])[5]={
 n:'Knochenwüste',sub:'Kristallfeuer unter fremden Sternen',
 h:18,fixedHeight:true,rn:4,tod:{cycle:240,start:.12,dark:.94},
 th:.92,r0:50,rg:32,rm:23,rc:6,sp0:330,industry:true,aliens:true,
 pre:[{k:'fak',c:2,r:0}],
 wv:[[['pl',10],['pz',3],['drn',2]],[['pz',6],['ali',3],['drn',3]],[['pz',5],['br',3],['drn',4]]],
 rd:{h:10,w:[[['pl',5],['pz',2],['drn',1]]]},
 p:{sp:.14,rk:.10,ne:.10,ts:.11,gb:.05,rl:.05},
 u:['cv','raf','kas','wel','tur','ene','fab','fak','bore','smelt'],
 t:'Grabe Treibsand frei und baue dort einen Sandbohrer (Wasser −3). Er fördert 1 Sand je 8 Sekunden. Verbinde ihn per Fließband mit einem Schmelzofen (Strom −3): 1 gelieferter Sand wird in 7 Sekunden zu 1 Energiekristall. Der Ofen schickt die Kristalle direkt zum Quartier; erst bei Ankunft gibt es 20 Geld. Ein Depot ist in diesem Level nicht erforderlich. Türme und Crawler schützen dich vor fliegenden Laserdrohnen und kleinen, geflügelten Alienschwärmen. Erreiche 18 Reihen und überlebe die Endschlacht.',
 nw:['Sandbohrer auf Treibsand','Schmelzofen → Quartier','Echte Warenlieferungen','Nächtliche Alienschwärme','Fliegende Laserdrohnen']
};
