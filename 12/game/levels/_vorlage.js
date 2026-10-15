/* ===========================================================
   VORLAGE für Level 4–10   (Datei kopieren → levelNN.js, Zahl in [ ] auf NN-1 setzen, Werte ändern)
   Danach in js/dt-config.js beim Eintrag NN:  ready:true   – fertig. Karte, Film und Shell sind schon verlinkt.
   Diese Datei (_vorlage.js) wird nicht geladen.

   Schlüssel:
     n, sub   Name / Untertitel                       h    Zielhöhe (Reihen)         rn  Felder pro Reihe nötig
     sp0      Startgeld ✦                             th, r0, rg, rm, rc  Schwierigkeits-/Zeitwerte (Trend aus Level 1–3 fortführen)
     wv       Wellen der Schlacht: [[['pl',8],['pz',2]],[['pz',5]]]   pl Plünderer · pz Panzer · br Brecher (Boss)
     rd       Raid (Überfall) { h:Höhe, w:[Wellen] }   – optional
     p        Feld-Wahrscheinlichkeiten: sp Gewürz · rk Fels · rl Relikt · ne Wurmnester · ts Treibsand · gb Gas
     u        freigeschaltete Gebäude: cv raf kas wel tur ene fab
     t, nw    Beschreibungstext / Stichworte
   =========================================================== */
(window.DTLV=window.DTLV||[])[3]={n:'Kraterfeld',sub:'…',h:16,rn:4,th:.85,r0:38,rg:28,rm:18,rc:6,sp0:240,
 wv:[[['pl',8],['pz',3]],[['pz',6]],[['pz',5],['br',2]]],
 rd:{h:9,w:[[['pl',6],['pz',2]]]},
 p:{sp:.12,rk:.12,ne:.10,ts:.08,gb:.05,rl:.04},
 u:['cv','raf','kas','wel','tur','ene','fab'],
 t:'…',nw:[]};
