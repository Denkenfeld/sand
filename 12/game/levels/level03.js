/* Level 3 · Glasdünen
   Eigene Datei pro Level – wird von game.html anhand js/dt-config.js geladen.
   Werte sind ein erster Entwurf (Steigerung gegenüber Level 2) und lassen sich hier einfach feinjustieren:
     h      Zielhöhe (Reihen)            sp0   Startgeld ✦
     wv     Wellen der Schlacht          rd    Raid (Überfall) bei Höhe rd.h
     p      Feld-Wahrscheinlichkeiten:  sp Gewürzadern · rk Fels · rl Relikt · ne Wurmnester · ts Treibsand · gb Gas */
(window.DTLV=window.DTLV||[])[2]={n:'Glasdünen',sub:'Treibsand unter geschmolzenem Glas',h:15,rn:4,th:.78,r0:42,rg:30,rm:20,rc:6,sp0:210,
 wv:[[['pl',8],['pz',2]],[['pz',5]],[['pz',4],['br',2]]],
 rd:{h:8,w:[[['pl',5],['pz',1]]]},
 p:{sp:.12,rk:.12,ne:.10,ts:.08,gb:.05,rl:.04},
 u:['cv','raf','kas','wel','tur','ene','fab'],
 t:'Der Sand ist hier zu Glas geschmolzen – etwas hat ihn hineingebrannt. Unter dem Glas liegt Treibsand: Auf Treibsand-Feldern kannst du nichts bauen, und deine Leute laufen um sie herum. Weil mehr Würmer lauern, lohnt sich die Wurmflagge ⚑. Zwei Überfälle bei Höhe 8 und drei Wellen in der Schlacht: Baue Geschütztürme, halte Munition ▮, Strom ⚡ und Wasser 💧 im Plus und rüste Crawler gegen die Panzer.',
 nw:['Mehr Treibsand','Mehr Wurmnester','Drei Wellen','Raid bei Höhe 8']};
