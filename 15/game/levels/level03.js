/* Level 3 · Glasdünen. Goal height fixed at 15; existing mission-info button stays in use.
   missionInfo contains only tutorial presentation, not extra win conditions.
   Existing enemy waves, costs and income parameters remain unchanged. */
(window.DTLV=window.DTLV||[])[2]={
 n:'Glasdünen',sub:'Treibsand unter geschmolzenem Glas',fixedHeight:true,h:15,rn:4,th:.78,r0:42,rg:30,rm:20,rc:6,sp0:210,
 wv:[[['pl',8],['pz',2]],[['pz',5]],[['pz',4],['br',2]]],
 rd:{h:8,w:[[['pl',5],['pz',1]]]},
 p:{sp:.12,rk:.12,ne:.10,ts:.08,gb:.05,rl:.04},
 u:['cv','raf','kas','wel','tur','ene','fab'],
 t:'Sichere die Glasdünen. Grabe dich bis Reihe 15 vor und gewinne die anschließende Verteidigungsschlacht. Dein Quartier muss überleben. Mehr Treibsand erschwert deine Bauplanung; mehr Wurmnester machen vorsichtiges Graben und die Wurmflagge wertvoll. Erschließe neue Gewürzadern, verbinde Raffinerien und Verteidigung mit dem Quartier und versorge Geschütztürme mit Munition aus der Fabrik. Crawler helfen gegen Panzer. Bereite dich auf den Zwischenüberfall vor und baue deine Verteidigung aus, bevor du die Zielhöhe erreichst.',
 nw:['Treibsand umgehen','Wurmnester einschätzen','Versorgung ausbauen','Panzer und Brecher','Drei Schlusswellen'],
 missionInfo:{
  title:'Sichere die Glasdünen',
  goal:'Grabe dich bis Reihe 15 vor und gewinne die anschließende Verteidigungsschlacht. Dein Quartier muss überleben.',
  steps:[
   'Erst planen, dann bauen: In diesem Gebiet gibt es mehr Treibsand. Darauf kannst du noch keine Gebäude errichten. Führe Fließbänder darum herum und halte Wege zwischen den Bauplätzen frei.',
   'Vorsichtig graben: Gefahrenzahlen beziehen sich auf Wurmnester in den acht Nachbarfeldern. Markiere ein vermutetes Nest vor dem Graben mit der Wurmflagge, wenn du den Wurm zähmen möchtest.',
   'Frisches Gewürz erschließen: Baue Raffinerien nahe neuen Adern und bilde Sammler aus. Erschöpfte Adern regenerieren mit geringeren Vorräten. Sammler arbeiten, Crawler kämpfen.',
   'Versorgung mitbauen: Verbinde alle Gebäude mit dem Quartier. Zusätzliche Taufänger und Energiefelder halten Wasser und Strom im Plus. Ein unterversorgtes Gebäude kann ausfallen.',
   'Munition sicherstellen: Fabriken liefern 4 Munition ins Netz; jeder Geschützturm verbraucht 2. Mehr Türme brauchen entsprechend mehr Fabrikversorgung.',
   'Gemischte Verteidigung vorbereiten: Krieger helfen gegen Plünderer, Crawler gegen Panzer. Die letzte Welle enthält auch Brecher; verbessere deine Anlagen und halte Kampfeinheiten bereit.',
   'Nicht zu früh bis zur Zielhöhe durchgraben: Richte zuerst Versorgung und Verteidigung ein. Nach Reihe 15 folgen die Vorbereitung und drei Schlusswellen. Der Zwischenüberfall hängt von der gewählten Schwierigkeit ab.'
  ]
 }
};
/* Load the presentation extension using a normal script tag. No engine fetch/patch, no gameplay hooks.
   All level files may be loaded together; extension changes a popup ONLY when its heading says Level 3. */
(function(){
 if(window.__dtMission3Loaded)return;window.__dtMission3Loaded=true;
 const current=document.currentScript&&document.currentScript.src;
 const script=document.createElement('script');
 const url=current?new URL('../ui-mission-level3.js',current):new URL('ui-mission-level3.js',location.href);
 const version=current?new URL(current).searchParams.get('v'):null;
 url.searchParams.set('build','mission3-r1');if(version)url.searchParams.set('v',version);
 script.src=url.href;document.head.appendChild(script);
})();
