/* Dünenturm – Speicher, Einstellungen, Schwierigkeit, Fortschritt (Karte + Spiel teilen sich das).
   localStorage:  dt3 = Spielstand/Einstellungen · dtLvl = nächstes freies Level (1…LEVELS+1) · dtConq = Eroberungs-Animation für die Karte */
(function(){
const DUE=window.DUE=window.DUE||{};
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};

/* ---------- Einstellungen + Spielstand ---------- */
const SV=DUE.SV={best:0,mv:.7,sv:.9,mus:1,hi:1,df:1,cl:0,vib:1,rt:{}};
try{Object.assign(SV,JSON.parse(ls.get('dt3')||'{}'))}catch(e){}
try{const o=JSON.parse(ls.get('dtSet')||'null');       // alte Karten-Einstellungen einmalig übernehmen
 if(o&&!SV.mig){SV.mig=1;if('mus'in o)SV.mus=o.mus?1:0;if('hq'in o)SV.hi=o.hq?1:0;if('vib'in o)SV.vib=o.vib?1:0;if('sfx'in o&&!o.sfx)SV.sv=0}}catch(e){}
DUE.persist=()=>ls.set('dt3',JSON.stringify(SV));

/* ---------- Schwierigkeit: 0 leicht · 1 mittel · 2 schwer ---------- */
const DFN=['Leicht','Mittel','Schwer'],DFI=['🟢','🟡','🔴'],DFD=['Mega leicht: wenige und schwache Feinde, kaum Würmer, kürzere Level, viel Startgeld.','Etwas leichter als Schwer: weniger Feinde und Würmer, kürzere Level, mehr Startgeld.','Volle Herausforderung: viele Feinde, Raids und Würmer erwarten Dich in der Wüste.'];
const DFS=[
 {sp0:1.9,r0:2.2,rg:1.9,rm:1.9,rc:.4,ne:.2,ts:.35,gb:.35,ps:1.35,prk:.5,th:.35,wd:.35,dig:1.5,bld:1.4,eh:.55,ed:.6,es:.8,wf:.5,boss:0,raid:0,dh:-3,dr:-1,pt:1.8,hub:1.6,uh:1.3,hzd:.4,hzr:.8,wk:3},
 {sp0:1.35,r0:1.5,rg:1.4,rm:1.4,rc:.7,ne:.65,ts:.7,gb:.7,ps:1.15,prk:.75,th:.7,wd:.7,dig:1.2,bld:1.15,eh:.8,ed:.85,es:.92,wf:.75,boss:1,raid:.7,dh:-1,dr:0,pt:1.3,hub:1.25,uh:1.12,hzd:.75,hzr:1.15,wk:2},
 {sp0:1,r0:1,rg:1,rm:1,rc:1,ne:1,ts:1,gb:1,ps:1,prk:1,th:1,wd:1,dig:1,bld:1,eh:1,ed:1,es:1,wf:1,boss:1,raid:1,dh:0,dr:0,pt:1,hub:1,uh:1,hzd:1,hzr:1.5,wk:2}];
DUE.DFN=DFN;DUE.DFI=DFI;DUE.DFD=DFD;DUE.DFS=DFS;

/* ---------- Fortschritt ---------- */
const top=()=>DUE.LEVELS+1;
DUE.getLvl=()=>{const r=ls.get('dtLvl');let v=r==null?(SV.best||0)+1:+r;return Math.min(top(),Math.max(1,Math.floor(v)||1))};
DUE.setLvl=n=>ls.set('dtLvl',String(Math.min(top(),Math.max(1,n))));
/* Level n (1-basiert) geschafft → nächstes Level freischalten, Karte soll die Eroberung zeigen */
DUE.winLevel=n=>{const cur=DUE.getLvl();if(n>=cur&&n<=DUE.LEVELS){DUE.setLvl(n+1);ls.set('dtConq',String(n))}if(n>SV.best)SV.best=n;DUE.persist()};
DUE.takeConquest=()=>{const n=+ls.get('dtConq')||0;ls.del('dtConq');return n};
DUE.resetProgress=()=>{SV.best=0;SV.rt={};DUE.persist();ls.set('dtLvl','1');ls.del('dtConq')};
})();
