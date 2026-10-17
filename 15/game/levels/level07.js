/* Level 7 – Sturmgrat. Mission help only: existing siege objective and city preserved. */
(window.DTLV=window.DTLV||[])[6]={
 n:'Sturmgrat',sub:'Belagerung der Scharlachstadt',siege:true,
 h:15,fixedHeight:true,rn:4,tod:{cycle:240,start:.12,dark:.94},
 th:.88,r0:125,rg:90,rm:65,rc:4,sp0:430,industry:true,aliens:true,
 pre:[{k:'fak',c:2,r:0}],wv:[],rd:null,
 p:{sp:.16,rk:.09,ne:.07,ts:.09,gb:.04,rl:.05},
 u:['cv','raf','kas','wel','tur','ene','fab','fak','bore','smelt'],
 t:'Zerstöre die Scharlachstadt. Grabe bis Reihe 10 vor, um die gegnerische Stadt in den Reihen 10–15 zu entdecken. Zerstöre ihre neun Hauptgebäude, während dein Quartier überlebt. Der Angriffsknopf (Zielkreuz) und ein anschließender Tipp auf das Zielgebiet schicken vorhandene Krieger und Crawler los; Sammler arbeiten weiter. Nach Sicherung des Gebiets warten die Truppen kurz und kehren zur Basis zurück. Angriffe auf gegnerische Strom-, Wasser- und Munitionsversorgung oder ihre Förderbänder können Anlagen abschalten. Es gibt keine separate Endschlacht und keine Pflicht, alle roten Bänder zu zerstören.',
 nw:['Stadt entdecken','Angriffsbefehl','Gegnerische Versorgung trennen','Neun Hauptgebäude','Keine separate Endschlacht'],
 missionInfo:{
  "title": "Zerstöre die Scharlachstadt",
  "goal": "Finde die Gegnerstadt in den Reihen 10–15 und zerstöre alle neun Hauptgebäude. Dein Quartier muss überleben. Es gibt keine zusätzliche Endschlacht.",
  "steps": [
    "Bereite deinen Feldzug vor: Erweitere Wirtschaft, Strom, Wasser und Munition. Baue Krieger und Crawler, bevor du bis Reihe 10 vorstößt. Deine Basis muss auch während des Angriffs geschützt bleiben.",
    "Die Gegnerstadt entdecken: Beim Freigraben bis Reihe 10 wird die Stadt sichtbar. Sie besitzt ein eigenes Quartier, Versorgung, Fabrik, Kaserne, Raffinerie, rote Förderbänder und Geschütztürme.",
    "Angriffsziel wählen: Tippe den Angriffsknopf mit dem Zielkreuz an und danach auf das gewünschte Gebiet. Alle vorhandenen Krieger und Crawler erhalten den Auftrag; Sammler bleiben bei ihrer Arbeit.",
    "Gebietsweise vorrücken: Deine Truppen bekämpfen Gegner und Stadtanlagen im gewählten Bereich. Ist dort nichts mehr zu tun, warten sie kurz und kehren zur Basis zurück. Ein neuer Auftrag überschreibt das alte Ziel.",
    "Verstärkung gezielt losschicken: Neu ausgebildete Kampfeinheiten erhalten einen früher erteilten Gruppenauftrag nicht automatisch. Wähle das Ziel erneut, wenn sie mit ausrücken sollen.",
    "Die gegnerische Versorgung schwächen: Zerstöre wichtige Bänder, das Energiefeld, den Taufänger oder die Fabrik. Getrennte beziehungsweise unterversorgte Stadtanlagen können ausfallen; die Gegner können dann schlechter verteidigen oder nachproduzieren.",
    "Gemischte Truppen einsetzen: Krieger helfen gegen Plünderer, Crawler gegen Panzer. Türme, Crawler und das Quartier können Fluggegner bekämpfen. Nutze Licht bei Nacht und halte deine Transportwege intakt.",
    "Das echte Siegziel beachten: Alle neun Hauptgebäude müssen fallen. Du musst nicht jedes rote Förderband zerstören oder eine zusätzliche Karawane besiegen. Der Balken oben zählt die verbleibenden Hauptgebäude."
  ]
}
};
(function(){
 if(window.__dtMission7Loaded)return;window.__dtMission7Loaded=true;
 const current=document.currentScript&&document.currentScript.src;
 const script=document.createElement('script');
 const url=current?new URL('../ui-mission-level7.js',current):new URL('ui-mission-level7.js',location.href);
 const version=current?new URL(current).searchParams.get('v'):null;
 url.searchParams.set('build','mission7-r1');if(version)url.searchParams.set('v',version);
 script.src=url.href;document.head.appendChild(script);
})();
