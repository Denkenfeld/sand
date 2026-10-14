/* Level 6 – Knochenwüste. 18 Zielreihen, Tag/Nacht, neue Industrie und Aliens.
   Geld: ein Energiekristall = 20 bei tatsächlicher Lieferung ans Quartier.
   bore = Sandbohrer; smelt = Schmelzofen; crdep = Kristalldepot.
   industry: garantiert ein aufgedecktes, noch ungegrabenes Treibsandfeld bei (2,3).
   aliens:true: nächtliche Überfälle; drn/ali zusätzlich in der Endschlacht. */
(window.DTLV=window.DTLV||[])[5]={
 n:'Knochenwüste',sub:'Kristallfeuer unter fremden Sternen',
 h:18,fixedHeight:true,rn:4,tod:{cycle:240,start:.12,dark:.94},
 th:.92,r0:50,rg:32,rm:23,rc:6,sp0:330,industry:true,aliens:true,
 pre:[{k:'fak',c:2,r:0}],
 wv:[[['pl',10],['pz',3],['drn',2]],[['pz',6],['ali',3],['drn',3]],[['pz',5],['br',3],['drn',4]]],
 rd:{h:10,w:[[['pl',5],['pz',2],['drn',1]]]},
 p:{sp:.14,rk:.10,ne:.10,ts:.11,gb:.05,rl:.05},
 u:['cv','raf','kas','wel','tur','ene','fab','fak','bore','smelt','crdep'],
 t:'Die Knochen uralter Würmer markieren ein neues Industriegebiet. Grabe Treibsand frei und baue dort einen Sandbohrer (Wasser −3). Er fördert 1 Sand je 8 Sekunden. Verbinde ihn per Fließband mit einem Schmelzofen (Strom −3): 1 gelieferter Sand wird in 7 Sekunden zu 1 Energiekristall. Das Kristalldepot nimmt ihn an und verschickt ihn zum Quartier; erst dort gibt es 20 Geld. Alle drei Gebäude und das Quartier müssen über dasselbe Netz verbunden sein. Baue Türme und Crawler gegen fliegende Laserdrohnen. Nachts kommen Aliens. Erreiche 18 Reihen und überlebe die Endschlacht.',
 nw:['Sandbohrer auf Treibsand','Schmelzofen','Kristalldepot','Echte Warenlieferungen','Nächtliche Aliens','Fliegende Laserdrohnen']
};
