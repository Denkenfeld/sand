/* ===========================================================
   DÜNENTURM · zentrale Konfiguration
   Alle 10 Filme und die Pfade der Level 1–10 sind bereits verlinkt.
   Ein neues Level freischalten (z. B. Level 4):
     1. game/levels/_vorlage.js nach game/levels/level04.js kopieren und die Werte anpassen
     2. unten beim Eintrag id:4 →  ready:true   – fertig.
   =========================================================== */
window.DT_CONFIG={
  title:'Dünenturm',
  keys:{progress:'dtL3',wu:'dtWu3',sound:'dtSnd'},   /* localStorage (dtSnd: '0' = Spieler hat Ton selbst ausgeschaltet; sonst AN) */
  screens:{start:'screens/start.html',map:'screens/map.html',game:'game/game.html'},
  /* ready:false → auf der Karte sichtbar, beim Antippen kommt "folgt bald" (weder Film noch Spiel werden geladen) */
  levels:[
    {id:1,  film:'films/film01.html', level:'game/levels/level01.js', ready:true},
    {id:2,  film:'films/film02.html', level:'game/levels/level02.js', ready:true},
    {id:3,  film:'films/film03.html', level:'game/levels/level03.js', ready:true},
    {id:4,  film:'films/film04.html', level:'game/levels/level04.js', ready:false},
    {id:5,  film:'films/film05.html', level:'game/levels/level05.js', ready:false},
    {id:6,  film:'films/film06.html', level:'game/levels/level06.js', ready:false},
    {id:7,  film:'films/film07.html', level:'game/levels/level07.js', ready:false},
    {id:8,  film:'films/film08.html', level:'game/levels/level08.js', ready:false},
    {id:9,  film:'films/film09.html', level:'game/levels/level09.js', ready:false},
    {id:10, film:'films/film10.html', level:'game/levels/level10.js', ready:false},
    {id:11, film:null, level:null, ready:false}     /* "Weite Welt" – wird nach Level 10 auf der Karte freigeschaltet */
  ]
};
