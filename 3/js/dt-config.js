/* ===========================================================
   DÜNENTURM · zentrale Konfiguration
   Ein neues Level hinzufügen:
     1. game/levels/levelNN.js anlegen   (Leveldaten, siehe level01.js)
     2. optional films/filmNN.html anlegen (Zwischensequenz vor dem Level)
     3. unten beim passenden Eintrag "film" und "level" eintragen – fertig.
   =========================================================== */
window.DT_CONFIG={
  title:'Dünenturm',
  keys:{progress:'dtL3',wu:'dtWu3',sound:'dtSnd'},   /* localStorage-Schlüssel (dtSnd: 0 = Spieler hat Ton selbst ausgeschaltet; sonst AN) */
  screens:{start:'screens/start.html',map:'screens/map.html',game:'game/game.html'},
  /* Level 1–10 + Level 11 ("Weite Welt", wird nach Level 10 freigeschaltet).
     film/level = null → auf der Karte sichtbar, aber noch nicht gebaut ("folgt bald"). */
  levels:[
    {id:1, film:'films/film01.html', level:'game/levels/level01.js'},
    {id:2, film:'films/film02.html', level:'game/levels/level02.js'},
    {id:3, film:null, level:null},
    {id:4, film:null, level:null},
    {id:5, film:null, level:null},
    {id:6, film:null, level:null},
    {id:7, film:null, level:null},
    {id:8, film:null, level:null},
    {id:9, film:null, level:null},
    {id:10,film:null, level:null},
    {id:11,film:null, level:null}
  ]
};
